from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Branch(models.Model):
    name = models.CharField(max_length=160)
    code = models.SlugField(max_length=40, unique=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    street_view_embed_url = models.URLField(max_length=8000, blank=True)
    google_maps_url = models.URLField(max_length=2000, blank=True)
    phone = models.CharField(max_length=24, blank=True)
    is_active = models.BooleanField(default=True)

    location_revision = models.PositiveIntegerField(default=0)
    is_showroom = models.BooleanField(default=True)
    google_place_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=7,
        null=True,
        blank=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )
    location_verified = models.BooleanField(default=False)
    location_source = models.CharField(max_length=16, default="manual")
    manual_override = models.BooleanField(default=False)
    street_view_enabled = models.BooleanField(default=True)
    street_view_status = models.CharField(
        max_length=32,
        default="pending",
        choices=[
            (s, s.replace("_", " "))
            for s in [
                "pending",
                "needs_review",
                "available_nearby",
                "storefront_verified",
                "unavailable",
                "error",
            ]
        ],
    )
    street_view_verified = models.BooleanField(default=False)
    panorama_id = models.CharField(max_length=255, blank=True)
    panorama_latitude = models.FloatField(null=True, blank=True)
    panorama_longitude = models.FloatField(null=True, blank=True)
    panorama_distance_m = models.FloatField(null=True, blank=True)
    imagery_date = models.CharField(max_length=32, blank=True)
    heading = models.FloatField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(360)]
    )
    pitch = models.FloatField(default=0, validators=[MinValueValidator(-90), MaxValueValidator(90)])
    last_checked_at = models.DateTimeField(null=True, blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    google_data_expires_at = models.DateTimeField(null=True, blank=True)
    location_candidates = models.JSONField(default=list, blank=True)
    sync_error = models.CharField(max_length=300, blank=True)
    sync_started_at = models.DateTimeField(null=True, blank=True)

    @property
    def branch_id(self):
        return f"SKY-{self.pk:03d}"

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "branches"

    def __str__(self):
        return f"{self.name} ({self.code})"


class BranchLocationAudit(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="location_history")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    action = models.CharField(max_length=40)
    status = models.CharField(max_length=32)
    note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
