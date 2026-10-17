import asyncio
import hashlib
import json
import logging
from datetime import timedelta
from zoneinfo import ZoneInfo

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import ValidationError

from .models import (
    Carousel,
    ExperienceAsset,
    ExperienceRevision,
    ExperienceSettings,
    FestivalEvent,
    Theme,
    ThemeSchedule,
)
from .schemas import DEFAULT_OPTIONS, ThemeConfig

logger = logging.getLogger(__name__)


def validate_assets(config):
    ids = config.get("asset_ids", [])
    assets = ExperienceAsset.objects.select_related("media").filter(pk__in=ids)
    if len(set(ids)) != assets.count() or any(
        a.media.status != "ready"
        or a.media.is_archived
        or not a.media.file
        or not a.media.file.storage.exists(a.media.file.name)
        for a in assets
    ):
        raise ValidationError("A selected theme asset is missing or unavailable.")


def valid_theme(theme):
    if theme.archived:
        return False
    validator = ThemeConfig(data=theme.config)
    if not validator.is_valid():
        return False
    try:
        validate_assets(theme.config)
    except (ValidationError, OSError):
        return False
    return True


def resolve_theme(state, now=None):
    now = now or timezone.now()
    fallback = Theme.objects.get(slug="default")
    if state.mode == "manual":
        return state.active_theme if valid_theme(state.active_theme) else fallback
    local = now.astimezone(ZoneInfo(state.options.get("timezone", "Asia/Kolkata")))
    candidates = []
    for schedule in ThemeSchedule.objects.select_related("theme").filter(
        enabled=True, start_at__lte=now, end_at__gt=now
    ):
        if schedule.weekdays and local.weekday() not in schedule.weekdays:
            continue
        if schedule.start_time and not (schedule.start_time <= local.time() < schedule.end_time):
            continue
        candidates.append((2, schedule.priority, -schedule.pk, schedule.theme))
    for event in FestivalEvent.objects.select_related("theme").filter(
        enabled=True,
        theme__isnull=False,
        date__gte=local.date() - timedelta(days=31),
        date__lte=local.date() + timedelta(days=31),
    ):
        if (
            event.date + timedelta(days=event.start_offset)
            <= local.date()
            <= event.date + timedelta(days=event.end_offset)
        ):
            candidates.append((1, event.priority, -event.pk, event.theme))
    for *_, theme in sorted(candidates, key=lambda item: item[:3], reverse=True):
        if valid_theme(theme):
            return theme
    return fallback


def media_data(asset):
    media = asset.media
    return {
        "id": asset.pk,
        "name": media.original_name,
        "category": asset.category,
        "url": media.file.url if media.file else "",
        "thumbnail": media.thumbnail.url if media.thumbnail else "",
        "width": media.width,
        "height": media.height,
        "bytes": media.total_bytes,
        "type": "video" if media.mime_type.startswith("video/") else "image",
        "duration": asset.duration,
        "poster": asset.poster.file.url if asset.poster else "",
    }


def theme_data(theme):
    return {
        "id": theme.pk,
        "name": theme.name,
        "slug": theme.slug,
        "description": theme.description,
        "category": theme.category,
        "is_default": theme.is_default,
        "config": theme.config,
        "updated_at": theme.updated_at.isoformat(),
        "archived": theme.archived,
    }


def experience(preview=None):
    state = ExperienceSettings.objects.select_related("active_theme").get(pk=1)
    theme = preview or resolve_theme(state)
    now = timezone.now()
    carousels = []
    for carousel in Carousel.objects.filter(published=True, archived=False).prefetch_related(
        "slides__asset__media", "slides__asset__poster"
    ):
        if carousel.theme_id and carousel.theme_id != theme.pk:
            continue
        slides = []
        for slide in carousel.slides.all():
            media = slide.asset.media
            if (
                not slide.published
                or slide.archived
                or (slide.start_at and slide.start_at > now)
                or (slide.end_at and slide.end_at <= now)
            ):
                continue
            if (
                media.status != "ready"
                or media.is_archived
                or not media.file
                or not media.file.storage.exists(media.file.name)
            ):
                continue
            slides.append(
                {
                    "id": slide.pk,
                    "season_name": slide.season_name,
                    "offer_name": slide.offer_name,
                    "finance_offer": slide.finance_offer,
                    "cta_label": slide.cta_label,
                    "cta_url": slide.cta_url,
                    "cta_enabled": slide.cta_enabled,
                    "duration": slide.duration,
                    "end_at": slide.end_at.isoformat() if slide.end_at else None,
                    "media": media_data(slide.asset),
                }
            )
        if slides:
            carousels.append(
                {
                    "id": carousel.pk,
                    "name": carousel.name,
                    "placement": carousel.placement,
                    "transition": carousel.transition,
                    "slides": slides,
                }
            )
    options = {**DEFAULT_OPTIONS, **state.options}
    for field, compare in [
        ("announcement_start", lambda t: now < t),
        ("announcement_end", lambda t: now >= t),
    ]:
        if options.get(field) and compare(parse_datetime(options[field])):
            options["announcement"] = ""
    data = {
        "revision": state.revision,
        "mode": state.mode,
        "theme": theme_data(theme),
        "options": options,
        "carousels": carousels,
        "assets": [
            media_data(a)
            for a in ExperienceAsset.objects.select_related("media", "poster").filter(
                pk__in=theme.config.get("asset_ids", [])
            )
        ],
    }
    data["version"] = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()[:24]
    return data


def snapshot(state):
    return {
        "active_theme": state.active_theme_id,
        "mode": state.mode,
        "options": state.options,
        "theme": theme_data(state.active_theme),
    }


def record(state, user, action):
    state.revision += 1
    state.save()
    ExperienceRevision.objects.create(
        revision=state.revision, action=action, snapshot=snapshot(state), actor=user
    )
    transaction.on_commit(broadcast)


def broadcast():
    async def send():
        await asyncio.wait_for(
            get_channel_layer().group_send("site-experience", {"type": "experience.changed"}), 2
        )

    try:
        async_to_sync(send)()
    except Exception:
        logger.warning("Experience notification unavailable; clients will reconcile by HTTP.")


def locked_state():
    return ExperienceSettings.objects.select_for_update().select_related("active_theme").get(pk=1)
