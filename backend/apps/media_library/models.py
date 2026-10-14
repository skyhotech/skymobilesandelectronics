import uuid

from django.conf import settings
from django.db import models

from .storage import private_storage


class MediaStorageState(models.Model):
    """Serialize quota admission across processes, not only inside one worker."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    used_bytes = models.PositiveBigIntegerField(default=0)


class MediaAsset(models.Model):
    class Kind(models.TextChoices):
        PRODUCT = "products", "Product"
        BRAND = "brands", "Brand"
        CATEGORY = "categories", "Category"
        BANNER = "banners", "Banner"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=16, choices=Kind.choices)
    file = models.FileField(max_length=500, blank=True)
    thumbnail = models.FileField(max_length=500, blank=True)
    original = models.FileField(storage=private_storage, max_length=500, blank=True)
    original_name = models.CharField(max_length=255, blank=True)
    sha256 = models.CharField(max_length=64, blank=True)
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    total_bytes = models.PositiveBigIntegerField(default=0)
    original_bytes = models.PositiveBigIntegerField(default=0)
    mime_type = models.CharField(max_length=50, default="image/webp")
    status = models.CharField(
        max_length=16,
        choices=[("processing", "Processing"), ("ready", "Ready"), ("failed", "Failed")],
        default="processing",
    )
    error_code = models.CharField(max_length=50, blank=True)
    is_archived = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
