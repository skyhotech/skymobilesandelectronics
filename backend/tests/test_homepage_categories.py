from io import BytesIO

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from PIL import Image

from apps.categories.models import Category

MANAGEMENT = "/api/v1/management/categories/"


@pytest.fixture
def owner_client(db):
    user = User.objects.create_superuser(username="category-owner", password="test-only")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    token = client.get("/api/v1/management/session/").json()["csrfToken"]
    client.defaults["HTTP_X_CSRFTOKEN"] = token
    return client


@pytest.mark.django_db
def test_category_changes_are_persisted_and_publication_is_filtered(owner_client):
    Category.objects.all().delete()
    payload = {
        "name": "Public category",
        "slug": "public-category",
        "badge": "New",
        "description": "An editable card",
        "starting_price": "8999.50",
        "image_url": "/images/homepage/categories-v2/smartphones.webp",
        "destination": "#gadgets",
        "display_order": 20,
        "show_on_homepage": True,
    }
    response = owner_client.post(MANAGEMENT, payload, content_type="application/json")
    assert response.status_code == 201
    identifier = response.json()["id"]
    detail = f"{MANAGEMENT}{identifier}/"
    assert str(Category.objects.get(pk=identifier).starting_price) == "8999.50"
    Category.objects.create(
        name="Hidden", slug="hidden", image="categories/artwork/smartphones.webp"
    )
    listing = Client().get("/api/v1/categories/")
    assert listing.json()["count"] == 1
    assert "no-store" in listing.headers["Cache-Control"]
    assert listing.json()["results"][0]["destination"] == "#gadgets"
    assert (
        owner_client.patch(
            detail, {"display_order": 5, "badge": "Updated"}, content_type="application/json"
        ).status_code
        == 200
    )
    assert Client().get("/api/v1/categories/").json()["results"][0]["badge"] == "Updated"
    assert (
        owner_client.patch(
            detail, {"is_active": False}, content_type="application/json"
        ).status_code
        == 200
    )
    assert Client().get("/api/v1/categories/").json()["count"] == 0
    assert owner_client.delete(detail).status_code == 204
    assert not Category.objects.filter(pk=identifier).exists()


@pytest.mark.django_db
def test_category_order_and_permissions(owner_client):
    Category.objects.all().delete()
    Category.objects.create(
        name="Later",
        slug="later",
        display_order=9,
        image="categories/artwork/tablets.webp",
        show_on_homepage=True,
    )
    Category.objects.create(
        name="First",
        slug="first",
        display_order=1,
        image="categories/artwork/tablets.webp",
        show_on_homepage=True,
    )
    assert [row["name"] for row in Client().get("/api/v1/categories/").json()["results"]] == [
        "First",
        "Later",
    ]
    anonymous = Client(enforce_csrf_checks=True)
    assert anonymous.post(MANAGEMENT, {"name": "Denied", "slug": "denied"}).status_code == 403
    user = User.objects.create_user(username="category-staff", is_staff=True)
    anonymous.force_login(user)
    assert anonymous.get(MANAGEMENT).status_code == 403
    missing_csrf = Client(enforce_csrf_checks=True)
    missing_csrf.force_login(User.objects.get(username="category-owner"))
    assert missing_csrf.post(MANAGEMENT, {"name": "Denied", "slug": "denied"}).status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize(
    "invalid",
    [
        {"starting_price": "-1"},
        {"display_order": -1},
        {"destination": "javascript:alert(1)"},
        {"image_url": "//evil.example/image.webp"},
        {"image_url": "/images/homepage/../secret.webp"},
        {"show_on_homepage": True, "image_url": ""},
    ],
)
def test_invalid_homepage_values_rejected(owner_client, invalid):
    response = owner_client.post(
        MANAGEMENT,
        {"name": "Invalid", "slug": "invalid", **invalid},
        content_type="application/json",
    )
    assert response.status_code == 400
    assert not Category.objects.filter(slug="invalid").exists()


@pytest.mark.django_db
def test_image_upload_content_validation_and_optimized_output(owner_client, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "public"
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "private"
    url = "/api/v1/management/category-images/"
    assert Client().post(url, {}).status_code == 403
    image = BytesIO()
    Image.new("RGB", (1600, 800), "navy").save(image, "PNG")
    response = owner_client.post(
        url, {"file": SimpleUploadedFile("upload.png", image.getvalue(), content_type="image/png")}
    )
    assert response.status_code == 201
    body = response.json()
    assert (body["width"], body["height"]) == (1600, 800)
    with Image.open(settings.MEDIA_ROOT / body["image_url"].removeprefix("/media/")) as optimized:
        assert optimized.format == "WEBP"
    assert (settings.MEDIA_ROOT / body["thumbnail_url"].removeprefix("/media/")).exists()
    for name, data in [("fake.png", b"not an image"), ("script.svg", b'<svg onload="alert(1)"/>')]:
        assert (
            owner_client.post(
                url, {"file": SimpleUploadedFile(name, data, content_type="image/png")}
            ).status_code
            == 400
        )
