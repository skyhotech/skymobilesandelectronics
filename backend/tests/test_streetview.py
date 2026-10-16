import json
from datetime import timedelta
from unittest.mock import patch
from urllib.error import URLError

import pytest
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.core.management import call_command
from django.utils import timezone

from apps.branches.models import Branch
from apps.branches.streetview import (
    GoogleError,
    embed_url,
    purge_expired,
    request_google,
    sync_branch,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def branch(settings):
    cache.clear()
    settings.GOOGLE_MAPS_STREETVIEW_ENABLED = True
    settings.GOOGLE_MAPS_SERVER_API_KEY = "server-key-test-only"
    settings.GOOGLE_MAPS_EMBED_API_KEY = "browser-key-test-only"
    return Branch.objects.create(
        name="ARNI-1",
        code="arni-1",
        city="ARNI",
        address="21 Big Bazaar Street Arni 632301",
        phone="+918754750009",
    )


def place(identifier="place-test-1"):
    return {
        "id": identifier,
        "displayName": {"text": "SKY Mobile & Electronics ARNI-1"},
        "formattedAddress": "21 Big Bazaar Street Arni 632301",
        "internationalPhoneNumber": "+91 87547 50009",
        "location": {"latitude": 12.6723, "longitude": 79.2873},
    }


def metadata(status="OK"):
    return {
        "status": status,
        "pano_id": "test-only-panorama",
        "location": {"lat": 12.6722, "lng": 79.2873},
        "date": "2025-01",
    }


def run_success(branch):
    with patch(
        "apps.branches.streetview.request_google", side_effect=[{"places": [place()]}, metadata()]
    ):
        return sync_branch(branch, force=True)


def test_discovery_and_metadata_are_not_storefront_verification(branch, client):
    assert run_success(branch) == "available_nearby"
    branch.refresh_from_db()
    assert branch.location_verified
    assert not branch.street_view_verified
    assert branch.street_view_status == "available_nearby"
    assert 0 < branch.panorama_distance_m < 75
    assert branch.google_data_expires_at > timezone.now()
    assert embed_url(branch) == ""
    assert "browser-key-test-only" in embed_url(branch, preview=True)
    assert "server-key-test-only" not in json.dumps(client.get("/api/v1/branches/").json())
    assert "formattedAddress" not in json.dumps(branch.location_candidates)
    assert branch.address == "21 Big Bazaar Street Arni 632301"


@pytest.mark.parametrize(
    "status,expected",
    [
        ("ZERO_RESULTS", "unavailable"),
        ("NOT_FOUND", "unavailable"),
        ("REQUEST_DENIED", "error"),
        ("OVER_QUERY_LIMIT", "error"),
        ("UNKNOWN_ERROR", "error"),
    ],
)
def test_metadata_statuses_are_distinct(branch, status, expected):
    with patch(
        "apps.branches.streetview.request_google",
        side_effect=[{"places": [place()]}, metadata(status)],
    ):
        assert sync_branch(branch) == expected
    branch.refresh_from_db()
    assert not branch.street_view_verified
    if expected == "error":
        assert status in branch.sync_error


def test_ambiguous_numbered_branches_need_review(branch):
    with patch(
        "apps.branches.streetview.request_google",
        return_value={"places": [place("one"), place("two")]},
    ):
        assert sync_branch(branch) == "needs_review"
    branch.refresh_from_db()
    assert branch.latitude is None
    other = place()
    other["displayName"]["text"] = "SKY Mobile & Electronics ARNI-2"
    with patch("apps.branches.streetview.request_google", return_value={"places": [other]}):
        assert sync_branch(branch, force=True) == "needs_review"


def test_unrelated_business_and_far_panorama_are_rejected(branch):
    unrelated = place()
    unrelated["displayName"]["text"] = "Unrelated Electronics"
    with patch("apps.branches.streetview.request_google", return_value={"places": [unrelated]}):
        assert sync_branch(branch) == "needs_review"
    far = metadata()
    far["location"] = {"lat": 13.0, "lng": 80.0}
    with patch("apps.branches.streetview.request_google", side_effect=[{"places": [place()]}, far]):
        assert sync_branch(branch, force=True) == "needs_review"


def test_duplicate_places_and_manual_overrides(branch):
    Branch.objects.create(
        name="Other", code="other", google_place_id="place-test-1", location_verified=True
    )
    with patch("apps.branches.streetview.request_google", return_value={"places": [place()]}):
        assert sync_branch(branch) == "error"
    branch.refresh_from_db()
    assert branch.sync_error == "DUPLICATE_OR_INVALID_PLACE"
    branch.manual_override = True
    branch.save()
    with patch("apps.branches.streetview.request_google") as request:
        assert sync_branch(branch, force=True) == "manual_override"
        request.assert_not_called()


def test_no_configuration_never_fakes_success(branch, settings):
    settings.GOOGLE_MAPS_SERVER_API_KEY = ""
    assert sync_branch(branch) == "error"
    branch.refresh_from_db()
    assert branch.sync_error == "GOOGLE_NOT_CONFIGURED"
    assert branch.latitude is None


def test_network_retries_are_bounded(branch):
    with (
        patch("apps.branches.streetview.build_opener") as opener,
        patch("apps.branches.streetview.time.sleep") as sleep,
    ):
        opener.return_value.open.side_effect = URLError("test-only-error")
        with pytest.raises(GoogleError, match="GOOGLE_NETWORK_ERROR"):
            request_google("https://places.googleapis.com/v1/places:searchText", {}, "places.id")
        assert opener.return_value.open.call_count == 3
        assert sleep.call_count == 2


def test_concurrent_hr_edit_is_not_overwritten(branch):
    def reply(url, *args, **kwargs):
        if "searchText" in url:
            Branch.objects.filter(pk=branch.pk).update(
                address="Human edited address", manual_override=True, location_revision=1
            )
            return {"places": [place()]}
        return metadata()

    with patch("apps.branches.streetview.request_google", side_effect=reply):
        sync_branch(branch)
    branch.refresh_from_db()
    assert branch.address == "Human edited address"
    assert branch.latitude is None
    assert branch.manual_override


def test_human_confirmation_security_and_expiration(branch, client):
    run_success(branch)
    url = f"/api/v1/hr/branches/{branch.pk}/streetview/"
    assert client.post(url, {"action": "confirm_storefront"}).status_code == 403
    user = User.objects.create_user("street-reviewer")
    client.force_login(user)
    assert client.get(url).status_code == 403
    user.groups.add(Group.objects.create(name="HR"))
    assert client.post(url, {"action": "confirm_storefront"}).status_code == 400
    assert (
        client.post(
            url,
            {
                "action": "confirm_storefront",
                "confirmed": True,
                "note": "Visual test fixture storefront confirmed",
            },
        ).status_code
        == 200
    )
    branch.refresh_from_db()
    assert branch.street_view_status == "storefront_verified"
    assert branch.street_view_verified and branch.manual_override
    response = client.get("/api/v1/branches/").json()[0]
    assert "browser-key-test-only" in response["street_view_embed_url"]
    assert "server-key-test-only" not in str(response)
    branch.google_data_expires_at = timezone.now() - timedelta(days=1)
    branch.save()
    assert client.get("/api/v1/branches/").json()[0]["street_view_embed_url"] == ""
    purge_expired()
    branch.refresh_from_db()
    assert branch.latitude is None and not branch.street_view_verified


def test_report_contains_all_showrooms_no_server_or_browser_key(branch, tmp_path):
    Branch.objects.create(name="HEAD OFFICE", code="head-office", is_showroom=False)
    run_success(branch)
    target = tmp_path / "report"
    call_command("branch_streetview", "report", output=target)
    rows = json.loads(target.with_suffix(".json").read_text())
    assert len(rows) == 1 and rows[0]["Branch Name"] == "ARNI-1"
    assert "server-key-test-only" not in target.with_suffix(".json").read_text()
    assert target.with_suffix(".csv").exists()


def test_browser_embed_cannot_expose_a_reused_server_key(branch, settings):
    run_success(branch)
    branch.refresh_from_db()
    settings.GOOGLE_MAPS_EMBED_API_KEY = settings.GOOGLE_MAPS_SERVER_API_KEY
    assert embed_url(branch, preview=True) == ""


def test_public_map_uses_verified_place_and_browser_key(branch, client):
    run_success(branch)
    payload = client.get("/api/v1/branches/").json()[0]
    assert "/maps/embed/v1/place?" in payload["location_embed_url"]
    assert "browser-key-test-only" in payload["location_embed_url"]
    assert "server-key-test-only" not in str(payload)


def test_review_requires_csrf_and_explicit_human_location_confirmation(branch):
    from django.test import Client

    client = Client(enforce_csrf_checks=True)
    user = User.objects.create_user("review-csrf")
    user.groups.add(Group.objects.create(name="HR"))
    client.force_login(user)
    url = f"/api/v1/hr/branches/{branch.pk}/streetview/"
    assert client.post(url, {"action": "revoke"}).status_code == 403
    client.defaults["HTTP_X_CSRFTOKEN"] = client.get("/api/v1/hr/session/").json()["csrfToken"]
    branch.location_candidates = [{"place_id": "place-test-1", "evidence": {"qualified": False}}]
    branch.manual_override = True
    branch.save()
    assert (
        client.post(url, {"action": "review_location", "place_id": "place-test-1"}).status_code
        == 400
    )
    with patch("apps.branches.streetview.request_google", side_effect=[place(), metadata()]):
        response = client.post(
            url,
            {
                "action": "review_location",
                "place_id": "place-test-1",
                "confirmed": True,
                "note": "Human test location candidate reviewed",
            },
        )
    assert response.status_code == 200
    branch.refresh_from_db()
    assert branch.location_verified and branch.manual_override
    assert not branch.street_view_verified


def test_review_rate_limit_and_branch_cooldown(branch, client):
    user = User.objects.create_user("review-limit")
    user.groups.add(Group.objects.create(name="HR"))
    client.force_login(user)
    url = f"/api/v1/hr/branches/{branch.pk}/streetview/"
    branch.last_checked_at = timezone.now()
    branch.save()
    assert client.post(url, {"action": "metadata"}).status_code == 429
    for _ in range(11):
        assert client.post(url, {"action": "revoke"}).status_code == 200
    assert client.post(url, {"action": "revoke"}).status_code == 429


def test_geocoding_is_a_review_candidate_not_business_proof(branch):
    geocode = {"status": "OK", "results": [{"place_id": "address-test-only"}]}
    with patch("apps.branches.streetview.request_google", side_effect=[{"places": []}, geocode]):
        assert sync_branch(branch) == "needs_review"
    branch.refresh_from_db()
    assert branch.latitude is None
    assert branch.location_candidates[0]["evidence"]["address_only"]


def test_retention_preserves_human_confirmed_manual_share_embed(branch):
    branch.street_view_embed_url = "https://www.google.com/maps/embed?pb=test-only-manual"
    branch.manual_override = True
    branch.street_view_verified = True
    branch.street_view_status = "storefront_verified"
    branch.location_source = "google"
    branch.latitude = "12.6723"
    branch.longitude = "79.2873"
    branch.google_data_expires_at = timezone.now() - timedelta(days=1)
    branch.save()
    purge_expired()
    branch.refresh_from_db()
    assert branch.latitude is None
    assert branch.street_view_verified
    assert embed_url(branch).endswith("pb=test-only-manual")


def test_review_fails_closed_when_rate_limit_storage_is_down(branch, client):
    from redis.exceptions import ConnectionError

    user = User.objects.create_user("review-limiter-down")
    user.groups.add(Group.objects.create(name="HR"))
    client.force_login(user)
    with patch(
        "apps.branches.streetview_api.ReviewThrottle.cache.get",
        side_effect=ConnectionError("test-only"),
    ):
        response = client.post(f"/api/v1/hr/branches/{branch.pk}/streetview/", {"action": "sync"})
    assert response.status_code == 503
    branch.refresh_from_db()
    assert branch.last_checked_at is None


def test_concurrent_sync_cannot_assign_one_place_to_two_branches(branch):
    def google_response(url, *args, **kwargs):
        if "places.googleapis.com" in url:
            return {"places": [place()]}
        Branch.objects.create(
            name="ARNI-2", code="arni-2", city="ARNI", google_place_id=place()["id"]
        )
        return metadata()

    with patch("apps.branches.streetview.request_google", side_effect=google_response):
        assert sync_branch(branch, force=True) == "error"
    branch.refresh_from_db()
    assert branch.sync_error == "DUPLICATE_PLACE_CONCURRENT_SYNC"
    assert branch.google_place_id is None
    assert branch.latitude is None
    assert branch.sync_started_at is None
