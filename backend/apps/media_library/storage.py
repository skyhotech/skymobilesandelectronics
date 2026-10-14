from pathlib import Path

from django.conf import settings
from django.core.exceptions import SuspiciousFileOperation
from django.core.files.storage import FileSystemStorage


class PrivateMediaStorage(FileSystemStorage):
    """Same filesystem mechanism, separate root with no public delivery URL."""

    def __init__(self, **kwargs):
        super().__init__(file_permissions_mode=0o600, directory_permissions_mode=0o700, **kwargs)

    @property
    def base_location(self):
        return settings.PRIVATE_MEDIA_ROOT

    @property
    def location(self):
        return str(Path(self.base_location).resolve())

    def url(self, name):
        raise ValueError("Private originals do not have a public URL.")


def private_storage():
    from django.core.files.storage import storages

    return storages["private_media"]


def relative_media_name(value):
    """Normalize public API media URLs into portable database filenames."""
    if value == "":
        return ""
    if isinstance(value, str) and any(ord(character) < 32 for character in value):
        raise SuspiciousFileOperation("Control characters are forbidden in filenames")
    if not isinstance(value, str) or any(
        character in value for character in ("\\", "%", "?", "#", ":", "\x00")
    ):
        raise SuspiciousFileOperation("Invalid media filename")
    if value.startswith(settings.MEDIA_URL):
        value = value[len(settings.MEDIA_URL) :]
    parts = value.split("/")
    if value.startswith("/") or any(part in ("", ".", "..") for part in parts):
        raise SuspiciousFileOperation("Media filename must be relative")
    if parts[0] not in ("products", "brands", "categories", "banners", "other", "thumbnails"):
        raise SuspiciousFileOperation("Unsupported public media directory")
    if Path(value).suffix.lower() not in (".webp", ".png", ".jpg", ".jpeg", ".avif"):
        raise SuspiciousFileOperation("Unsupported public media format")
    return value
