from pathlib import Path

from django.conf import settings
from django.core.checks import Error, register


@register()
def separate_private_storage(app_configs, **kwargs):
    public = Path(settings.MEDIA_ROOT).resolve()
    private = Path(settings.PRIVATE_MEDIA_ROOT).resolve()
    if private == public or private.is_relative_to(public) or public.is_relative_to(private):
        return [
            Error(
                "Public and private media roots must be separate, non-nested directories.",
                id="sky_media.E001",
            )
        ]
    return []
