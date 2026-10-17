import re
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from rest_framework import serializers

COLORS = {"primary", "secondary", "background", "surface", "text", "accent", "border"}
EFFECTS = [
    "none",
    "lights",
    "kolam",
    "flowers",
    "snow",
    "hearts",
    "tricolor",
    "rain",
    "sun",
    "mist",
]
DEFAULT_CONFIG = {
    "tokens": {
        "primary": "#0b1c48",
        "secondary": "#bb0014",
        "background": "#faf8ff",
        "surface": "#ffffff",
        "text": "#131b2e",
        "accent": "#dce1ff",
        "border": "#c6c6d0",
    },
    "radius": 16,
    "font": "Inter",
    "effect": "none",
    "intensity": 12,
    "speed": 12,
    "transition_ms": 450,
    "asset_ids": [],
    "weather": True,
}
DEFAULT_OPTIONS = {
    "animations": True,
    "weather": False,
    "festival_effects": True,
    "banner_effects": True,
    "day_night": True,
    "profile": "balanced",
    "timezone": "Asia/Kolkata",
    "city": "Vellore",
    "hot_threshold": 35,
    "apparent_temperature": True,
    "announcement": "",
    "announcement_start": None,
    "announcement_end": None,
}


def contrast(a, b):
    def luminance(color):
        rgb = [int(color[i : i + 2], 16) / 255 for i in (1, 3, 5)]
        linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
        return sum(v * w for v, w in zip(linear, [0.2126, 0.7152, 0.0722]))

    values = sorted([luminance(a), luminance(b)])
    return (values[1] + 0.05) / (values[0] + 0.05)


class Tokens(serializers.Serializer):
    primary = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    secondary = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    background = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    surface = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    text = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    accent = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")
    border = serializers.RegexField(r"^#[0-9a-fA-F]{6}$")

    def validate(self, data):
        if (
            contrast(data["text"], data["surface"]) < 4.5
            or contrast(data["text"], data["background"]) < 4.5
        ):
            raise serializers.ValidationError(
                "Text needs at least 4.5:1 contrast against surface and background."
            )
        if (
            contrast("#ffffff", data["primary"]) < 4.5
            or contrast("#ffffff", data["secondary"]) < 4.5
        ):
            raise serializers.ValidationError(
                "Primary and secondary must support white text at 4.5:1."
            )
        return data


class ThemeConfig(serializers.Serializer):
    tokens = Tokens()
    radius = serializers.IntegerField(min_value=0, max_value=32, default=16)
    font = serializers.ChoiceField(choices=["Inter", "Arial", "Georgia"], default="Inter")
    effect = serializers.ChoiceField(choices=EFFECTS, default="none")
    intensity = serializers.IntegerField(min_value=0, max_value=32, default=12)
    speed = serializers.IntegerField(min_value=4, max_value=40, default=12)
    transition_ms = serializers.IntegerField(min_value=0, max_value=1000, default=450)
    asset_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), max_length=8, default=list
    )
    weather = serializers.BooleanField(default=True)

    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - set(self.fields):
            raise serializers.ValidationError(
                "Unknown configuration fields; scripts and CSS are not accepted."
            )
        return super().to_internal_value(data)


class Options(serializers.Serializer):
    animations = serializers.BooleanField(default=True)
    weather = serializers.BooleanField(default=False)
    festival_effects = serializers.BooleanField(default=True)
    banner_effects = serializers.BooleanField(default=True)
    day_night = serializers.BooleanField(default=True)
    profile = serializers.ChoiceField(
        choices=["high", "balanced", "battery", "off"], default="balanced"
    )
    timezone = serializers.CharField(default="Asia/Kolkata", max_length=64)
    city = serializers.ChoiceField(
        choices=["Vellore", "Chennai", "Bengaluru", "Mumbai", "Delhi"], default="Vellore"
    )
    hot_threshold = serializers.IntegerField(min_value=25, max_value=50, default=35)
    apparent_temperature = serializers.BooleanField(default=True)
    announcement = serializers.CharField(max_length=300, allow_blank=True, default="")
    announcement_start = serializers.DateTimeField(allow_null=True, default=None)
    announcement_end = serializers.DateTimeField(allow_null=True, default=None)

    def validate_timezone(self, value):
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError:
            raise serializers.ValidationError("Unknown IANA timezone.") from None
        return value

    def validate(self, data):
        if (
            data["announcement_start"]
            and data["announcement_end"]
            and data["announcement_start"] >= data["announcement_end"]
        ):
            raise serializers.ValidationError("Announcement must end after it starts.")
        return data


def safe_url(value):
    if not value or re.search(r"[\x00-\x20\\]", value):
        raise serializers.ValidationError(
            "Use a safe internal link or an approved HTTPS destination."
        )
    parsed = urlsplit(value)
    if (
        not parsed.scheme
        and not parsed.netloc
        and value.startswith(("/", "#"))
        and not value.startswith("//")
    ):
        return value
    if (
        parsed.scheme == "https"
        and parsed.hostname in getattr(settings, "EXPERIENCE_CTA_HOSTS", [])
        and not parsed.username
    ):
        return value
    raise serializers.ValidationError("This destination is not approved.")
