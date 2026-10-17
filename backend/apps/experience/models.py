from django.conf import settings
from django.db import models


class Theme(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.CharField(max_length=500, blank=True)
    category = models.CharField(max_length=40, default="custom")
    config = models.JSONField(default=dict)
    is_default = models.BooleanField(default=False, editable=False)
    archived = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(is_default=False) | models.Q(slug="default", archived=False),
                name="experience_default_protected",
            )
        ]


class ExperienceSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    revision = models.PositiveBigIntegerField(default=1)
    active_theme = models.ForeignKey(Theme, on_delete=models.PROTECT)
    mode = models.CharField(max_length=12, default="manual")
    options = models.JSONField(default=dict)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(id=1), name="experience_singleton")
        ]


class ExperienceRevision(models.Model):
    revision = models.PositiveBigIntegerField(unique=True)
    action = models.CharField(max_length=100)
    snapshot = models.JSONField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-revision"]


class ExperienceAsset(models.Model):
    media = models.OneToOneField("media_library.MediaAsset", on_delete=models.PROTECT)
    category = models.CharField(max_length=40, default="unassigned")
    duration = models.FloatField(default=0)
    poster = models.ForeignKey(
        "media_library.MediaAsset",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="experience_posters",
    )


class FestivalEvent(models.Model):
    name = models.CharField(max_length=150)
    date = models.DateField(db_index=True)
    region = models.CharField(max_length=20, default="IN-TN")
    source = models.CharField(max_length=200, default="Admin")
    theme = models.ForeignKey(Theme, null=True, blank=True, on_delete=models.PROTECT)
    start_offset = models.SmallIntegerField(default=0)
    end_offset = models.SmallIntegerField(default=0)
    enabled = models.BooleanField(default=False)
    priority = models.PositiveSmallIntegerField(default=50)

    class Meta:
        ordering = ["date", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "date", "region"], name="experience_festival_unique"
            )
        ]


class ThemeSchedule(models.Model):
    name = models.CharField(max_length=100)
    theme = models.ForeignKey(Theme, on_delete=models.PROTECT)
    start_at = models.DateTimeField(db_index=True)
    end_at = models.DateTimeField(db_index=True)
    priority = models.PositiveSmallIntegerField(default=80)
    enabled = models.BooleanField(default=True)
    weekdays = models.JSONField(default=list)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_at__gt=models.F("start_at")),
                name="experience_schedule_window",
            )
        ]


class Carousel(models.Model):
    name = models.CharField(max_length=100)
    placement = models.CharField(max_length=20, default="hero")
    description = models.CharField(max_length=500, blank=True)
    published = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)
    theme = models.ForeignKey(Theme, null=True, blank=True, on_delete=models.PROTECT)
    display_order = models.PositiveIntegerField(default=0)
    transition = models.CharField(max_length=12, default="fade")

    class Meta:
        ordering = ["display_order", "id"]


class CarouselSlide(models.Model):
    carousel = models.ForeignKey(Carousel, on_delete=models.PROTECT, related_name="slides")
    season_name = models.CharField(max_length=100)
    offer_name = models.CharField(max_length=200)
    finance_offer = models.CharField(max_length=800, blank=True)
    cta_label = models.CharField(max_length=80, blank=True)
    cta_url = models.CharField(max_length=500, blank=True)
    cta_enabled = models.BooleanField(default=True)
    asset = models.ForeignKey(ExperienceAsset, on_delete=models.PROTECT)
    published = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    duration = models.PositiveSmallIntegerField(default=7)
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(start_at__isnull=True)
                | models.Q(end_at__isnull=True)
                | models.Q(end_at__gt=models.F("start_at")),
                name="experience_slide_window",
            )
        ]


class WeatherCache(models.Model):
    city = models.CharField(max_length=80, unique=True)
    payload = models.JSONField(default=dict)
    checked_at = models.DateTimeField(null=True)
    fetched_at = models.DateTimeField(null=True)
    expires_at = models.DateTimeField(null=True)
    modified = models.CharField(max_length=100, blank=True)
    error = models.CharField(max_length=100, blank=True)


class CampaignMetric(models.Model):
    slide = models.ForeignKey(CarouselSlide, on_delete=models.PROTECT)
    date = models.DateField()
    impressions = models.PositiveBigIntegerField(default=0)
    clicks = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["slide", "date"], name="experience_metric_day")
        ]
