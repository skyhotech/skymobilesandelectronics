import hashlib
from io import BytesIO, StringIO
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from PIL import Image

from apps.categories.models import Category
from apps.media_library.models import MediaAsset
from apps.media_library.services import create_image_asset


def picture(name="test.png"):
    stream = BytesIO()
    Image.new("RGB", (900, 600), "navy").save(stream, "PNG")
    return SimpleUploadedFile(name, stream.getvalue(), content_type="image/png")


@pytest.fixture
def media_owner(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "public"
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "private"
    user = User.objects.create_superuser(username="media-owner", password="test-only")
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    token = client.get("/api/v1/management/session/").json()["csrfToken"]
    client.defaults["HTTP_X_CSRFTOKEN"] = token
    return user, client


@pytest.mark.django_db
@pytest.mark.parametrize("kind", ["products", "brands", "categories", "banners"])
def test_universal_upload_tracks_files_and_private_original(media_owner, settings, kind):
    user, client = media_owner
    upload = picture()
    expected = hashlib.sha256(upload.read()).hexdigest()
    upload.seek(0)
    response = client.post("/api/v1/management/media/upload/", {"file": upload, "kind": kind})
    assert response.status_code == 201
    asset = MediaAsset.objects.get(pk=response.json()["id"])
    assert asset.status == "ready"
    assert asset.sha256 == expected
    assert asset.file.name.startswith(f"{kind}/optimized/")
    assert not asset.file.name.startswith("/")
    assert asset.file.storage.exists(asset.file.name)
    assert asset.original.storage.exists(asset.original.name)
    assert not (settings.MEDIA_ROOT / asset.original.name).exists()
    assert response.json()["image_url"] == default_storage.url(asset.file.name)
    assert "original" not in response.json()
    with pytest.raises(ValueError):
        _ = asset.original.url
    assert Client().get(f"/api/v1/management/media/{asset.pk}/original/").status_code == 403
    assert client.get(f"/api/v1/management/media/{asset.pk}/original/").status_code == 200


@pytest.mark.django_db
def test_replacement_and_archive_do_not_delete_shared_files(media_owner):
    user, client = media_owner
    original = create_image_asset(picture(), "categories", user)
    category = Category.objects.create(
        name="Shared media", slug="shared-media", image=original.file.name
    )
    another = Category.objects.create(
        name="Other reference", slug="other-reference", image=original.file.name
    )
    replacement = create_image_asset(picture(), "categories", user)
    response = client.patch(
        f"/api/v1/management/categories/{category.pk}/",
        {"image_url": replacement.file.url},
        content_type="application/json",
    )
    assert response.status_code == 200
    category.refresh_from_db()
    assert category.image.name == replacement.file.name
    assert client.delete(f"/api/v1/management/media/{original.pk}/").status_code == 204
    original.refresh_from_db()
    assert original.is_archived
    assert default_storage.exists(another.image.name)
    assert client.delete(f"/api/v1/management/categories/{category.pk}/").status_code == 204
    assert default_storage.exists(replacement.file.name)


@pytest.mark.django_db
def test_storage_failures_are_reported_without_losing_original(media_owner):
    user, client = media_owner
    with patch.object(default_storage, "save", side_effect=PermissionError("test-only denied")):
        response = client.post(
            "/api/v1/management/media/upload/", {"file": picture(), "kind": "products"}
        )
    assert response.status_code == 503
    asset = MediaAsset.objects.get(status="failed")
    assert asset.original.storage.exists(asset.original.name)
    assert not asset.file.name
    assert "test-only denied" not in response.content.decode()


@pytest.mark.django_db
def test_quota_disk_and_size_limits(media_owner, settings):
    user, client = media_owner
    url = "/api/v1/management/media/upload/"
    settings.MEDIA_MAX_STORAGE_BYTES = 1
    assert client.post(url, {"file": picture(), "kind": "products"}).status_code == 503
    assert MediaAsset.objects.count() == 0
    settings.MEDIA_MAX_STORAGE_BYTES = 1024**3
    with patch("apps.media_library.services.shutil.disk_usage") as usage:
        usage.return_value.free = 0
        assert client.post(url, {"file": picture(), "kind": "products"}).status_code == 503
    settings.MEDIA_UPLOAD_MAX_BYTES = 1
    assert client.post(url, {"file": picture(), "kind": "products"}).status_code == 400


@pytest.mark.django_db
def test_extension_mismatch_and_traversal_rejected(media_owner):
    user, client = media_owner
    assert (
        client.post(
            "/api/v1/management/media/upload/", {"file": picture("fake.jpg"), "kind": "brands"}
        ).status_code
        == 400
    )
    for value in (
        "/media/products/../secret.webp",
        "E:\\image.webp",
        "https://example.invalid/a.webp",
        "/media/products/%2e%2e/image.webp",
    ):
        response = client.post(
            "/api/v1/management/categories/",
            {"name": "Invalid media", "slug": "invalid-media", "image_url": value},
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
def test_missing_files_and_root_relocation(media_owner, settings, tmp_path):
    from django.core.management import call_command
    from django.core.management.base import CommandError

    user, client = media_owner
    asset = create_image_asset(picture(), "products", user)
    old_name, old_url = asset.file.name, asset.file.url
    # Simulate another mounted host folder containing the same relative files.
    new_root = tmp_path / "replacement-public"
    with asset.file.open("rb") as file:
        data = file.read()
    settings.MEDIA_ROOT = new_root
    default_storage.save(old_name, ContentFile(data))
    asset.refresh_from_db()
    assert asset.file.url == old_url
    assert asset.file.name == old_name
    assert asset.file.storage.exists(old_name)
    original_name = asset.original.name
    with asset.original.open("rb") as original:
        original_data = original.read()
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "replacement-private"
    asset.original.storage.save(original_name, ContentFile(original_data))
    assert asset.original.name == original_name
    assert asset.original.storage.exists(original_name)
    asset.file.storage.delete(old_name)
    with pytest.raises(CommandError):
        call_command("audit_media", stdout=StringIO())
