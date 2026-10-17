import json

from rest_framework import serializers

from .models import Carousel, CarouselSlide, FestivalEvent, Theme, ThemeSchedule
from .schemas import ThemeConfig, safe_url
from .services import validate_assets


class ThemeSerializer(serializers.ModelSerializer):
    config = ThemeConfig()

    class Meta:
        model = Theme
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "category",
            "config",
            "is_default",
            "archived",
            "updated_at",
        ]
        read_only_fields = ["id", "is_default", "archived", "updated_at"]

    def validate(self, data):
        if self.instance and self.instance.is_default:
            raise serializers.ValidationError(
                "The system default is immutable. Duplicate it to customize."
            )
        if "config" in data:
            validate_assets(data["config"])
        return data


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThemeSchedule
        fields = "__all__"

    def validate(self, data):
        def value(key):
            return data.get(key, getattr(self.instance, key, None))

        if value("start_at") >= value("end_at"):
            raise serializers.ValidationError("End must be after start.")
        if bool(value("start_time")) != bool(value("end_time")) or (
            value("start_time") and value("start_time") >= value("end_time")
        ):
            raise serializers.ValidationError("Choose both daily times; end must be after start.")
        days = value("weekdays") or []
        if not isinstance(days, list) or any(type(d) is not int or d not in range(7) for d in days):
            raise serializers.ValidationError("Weekdays must be integers 0 (Monday) to 6.")
        if value("theme").archived:
            raise serializers.ValidationError("Choose an available theme.")
        return data


class FestivalSerializer(serializers.ModelSerializer):
    start_offset = serializers.IntegerField(min_value=-31, max_value=31, default=0)
    end_offset = serializers.IntegerField(min_value=-31, max_value=31, default=0)

    class Meta:
        model = FestivalEvent
        fields = "__all__"

    def validate(self, data):
        if data.get("start_offset", getattr(self.instance, "start_offset", 0)) > data.get(
            "end_offset", getattr(self.instance, "end_offset", 0)
        ):
            raise serializers.ValidationError("End offset must not precede start offset.")
        return data


class CarouselSerializer(serializers.ModelSerializer):
    placement = serializers.ChoiceField(choices=["hero", "offers", "footer"])
    transition = serializers.ChoiceField(choices=["fade", "slide", "zoom"], default="fade")

    class Meta:
        model = Carousel
        fields = "__all__"
        read_only_fields = ["archived"]


class SlideSerializer(serializers.ModelSerializer):
    duration = serializers.IntegerField(min_value=3, max_value=60, default=7)

    class Meta:
        model = CarouselSlide
        fields = "__all__"
        read_only_fields = ["archived"]

    def validate(self, data):
        def value(key, default=None):
            return data.get(key, getattr(self.instance, key, default))

        if value("cta_enabled", True):
            safe_url(value("cta_url", ""))
            if not value("cta_label"):
                raise serializers.ValidationError("CTA label is required when enabled.")
        start, end = value("start_at"), value("end_at")
        if start and end and start >= end:
            raise serializers.ValidationError("End must follow start.")
        asset = value("asset")
        media = asset.media
        if (
            media.status != "ready"
            or media.is_archived
            or not media.file
            or not media.file.storage.exists(media.file.name)
        ):
            raise serializers.ValidationError("Media is missing or unavailable.")
        if not media.width or media.width * 9 != media.height * 16:
            raise serializers.ValidationError(
                "Carousel media must be exactly 16:9. Crop the image before uploading."
            )
        if media.mime_type.startswith("video/") and not asset.poster:
            raise serializers.ValidationError("A video poster is required.")
        if value("carousel").archived:
            raise serializers.ValidationError("Carousel is archived.")
        return data


def json_safe(data):
    return json.loads(json.dumps(data, default=lambda value: value.isoformat()))
