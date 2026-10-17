import copy
from datetime import timedelta
from io import BytesIO
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import Client
from django.utils import timezone
from PIL import Image

from apps.experience.festivals import sync_year
from apps.experience.models import Carousel, ExperienceSettings, FestivalEvent, Theme, ThemeSchedule
from apps.experience.schemas import DEFAULT_CONFIG
from apps.experience.services import experience, resolve_theme
from apps.experience.weather import condition, get_weather

pytestmark = pytest.mark.django_db
BASE = "/api/v1/management/experience/"


@pytest.fixture
def owner():
    client = Client(enforce_csrf_checks=True)
    client.force_login(User.objects.create_superuser("experience-owner", password="test-only"))
    token = client.get("/api/v1/management/session/").json()["csrfToken"]
    client.defaults["HTTP_X_CSRFTOKEN"] = token
    return client


def test_default_is_immutable_and_public_is_read_only(owner):
    default = Theme.objects.get(slug="default")
    assert owner.delete(f"{BASE}themes/{default.pk}/").status_code == 400
    assert (
        owner.patch(
            f"{BASE}themes/{default.pk}/", {"name": "Changed"}, content_type="application/json"
        ).status_code
        == 400
    )
    assert Client().get("/api/v1/site/experience/").status_code == 200
    for resource in ["themes", "slides", "carousels", "schedules", "festivals"]:
        assert Client().post(f"{BASE}{resource}/", {}).status_code == 403


def test_staff_without_owner_and_missing_csrf_cannot_mutate(owner):
    client = Client()
    client.force_login(User.objects.create_user("experience-staff", is_staff=True))
    assert client.post(f"{BASE}themes/1/apply/").status_code == 403
    owner.defaults.pop("HTTP_X_CSRFTOKEN")
    assert owner.post(f"{BASE}themes/1/apply/").status_code == 403


def test_apply_preview_history_and_rollback(owner):
    theme = Theme.objects.get(slug="deepavali")
    initial = experience()
    response = owner.get(f"{BASE}themes/{theme.pk}/preview/")
    assert response.json()["theme"]["id"] == theme.pk
    assert experience()["version"] == initial["version"]
    assert owner.post(f"{BASE}themes/{theme.pk}/apply/").status_code == 200
    assert experience()["theme"]["id"] == theme.pk
    assert owner.delete(f"{BASE}themes/{theme.pk}/").status_code == 400
    assert (
        owner.post(f"{BASE}history/", {"revision": 1}, content_type="application/json").status_code
        == 200
    )
    assert experience()["theme"]["is_default"]


def test_theme_config_rejects_code_bad_contrast_and_missing_assets(owner):
    for change in [
        {"javascript": "alert(1)"},
        {"asset_ids": [999999]},
        {"tokens": {**DEFAULT_CONFIG["tokens"], "text": "#ffffff"}},
    ]:
        payload = {
            "name": "Invalid",
            "slug": "invalid",
            "config": {**copy.deepcopy(DEFAULT_CONFIG), **change},
        }
        assert (
            owner.post(f"{BASE}themes/", payload, content_type="application/json").status_code
            == 400
        )


def test_manual_override_schedule_boundaries_and_festival_priority():
    now = timezone.now()
    state = ExperienceSettings.objects.get(pk=1)
    theme = Theme.objects.get(slug="deepavali")
    schedule = ThemeSchedule.objects.create(
        name="Launch", theme=theme, start_at=now, end_at=now + timedelta(hours=1)
    )
    assert resolve_theme(state, now).is_default
    state.mode = "automatic"
    assert resolve_theme(state, now).pk == theme.pk
    assert resolve_theme(state, schedule.end_at).is_default
    event = FestivalEvent.objects.create(
        name="Test festival",
        date=timezone.localdate(),
        theme=Theme.objects.get(slug="pongal"),
        enabled=True,
    )
    assert resolve_theme(state, now).pk == theme.pk
    schedule.enabled = False
    schedule.save()
    assert resolve_theme(state, now).pk == event.theme_id


def test_calendar_sync_is_idempotent_and_preserves_corrections():
    sync_year(2026)
    festival = FestivalEvent.objects.filter(date__year=2026).first()
    festival.source = "Owner verified"
    festival.save()
    count = FestivalEvent.objects.count()
    sync_year(2026)
    festival.refresh_from_db()
    assert festival.source == "Owner verified"
    assert FestivalEvent.objects.count() == count


def image_upload(size):
    output = BytesIO()
    Image.new("RGB", size, "navy").save(output, "PNG")
    return ContentFile(output.getvalue(), name="campaign.png")


def test_carousel_media_schedule_reorder_and_safe_links(owner, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "public"
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "private"
    assert (
        owner.post(
            f"{BASE}assets/", {"file": image_upload((200, 200)), "purpose": "carousel"}
        ).status_code
        == 400
    )
    upload = owner.post(
        f"{BASE}assets/", {"file": image_upload((1600, 900)), "purpose": "carousel"}
    )
    assert upload.status_code == 201, upload.content
    carousel = Carousel.objects.create(name="Test", published=True)
    data = {
        "carousel": carousel.pk,
        "asset": upload.json()["id"],
        "season_name": "Approved",
        "offer_name": "New arrivals",
        "cta_enabled": True,
        "cta_label": "Browse",
        "cta_url": "javascript:alert(1)",
        "published": True,
    }
    assert owner.post(f"{BASE}slides/", data, content_type="application/json").status_code == 400
    data["cta_url"] = "/products"
    result = owner.post(f"{BASE}slides/", data, content_type="application/json")
    assert result.status_code == 201, result.content
    slide = result.json()
    assert experience()["carousels"][0]["slides"][0]["offer_name"] == "New arrivals"
    assert (
        owner.post(
            f"{BASE}carousels/{carousel.pk}/reorder/",
            {"ids": [slide["id"], slide["id"]]},
            content_type="application/json",
        ).status_code
        == 400
    )
    assert (
        owner.patch(
            f"{BASE}slides/{slide['id']}/",
            {"end_at": (timezone.now() - timedelta(seconds=1)).isoformat()},
            content_type="application/json",
        ).status_code
        == 200
    )
    assert experience()["carousels"] == []


@pytest.mark.parametrize(
    "symbol,temp,expected",
    [
        ("rain", 20, "rain"),
        ("clearsky_day", 38, "sun"),
        ("cloudy", 25, "cloud"),
        ("heavyrainandthunder", 25, "storm"),
        ("snow", 0, "snow"),
        ("clearsky_night", 15, "mist"),
    ],
)
def test_weather_effects(symbol, temp, expected):
    assert condition(symbol, temp, 35) == expected


def test_weather_outage_is_bounded_cached_and_does_not_change_theme():
    before = experience()["version"]
    with patch("apps.experience.weather.urlopen", side_effect=OSError("offline")) as fetch:
        assert get_weather("Vellore", {})["status"] == "unavailable"
        assert get_weather("Vellore", {})["status"] == "unavailable"
    assert fetch.call_count == 1
    assert experience()["version"] == before


def test_settings_reject_stale_revision(owner):
    state = owner.get(f"{BASE}settings/").json()
    response = owner.patch(
        f"{BASE}settings/",
        {"revision": state["revision"], "options": {"weather": True}},
        content_type="application/json",
    )
    assert response.status_code == 200
    assert (
        owner.patch(
            f"{BASE}settings/", {"revision": state["revision"]}, content_type="application/json"
        ).status_code
        == 409
    )
