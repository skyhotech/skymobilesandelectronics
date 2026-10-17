import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

from apps.media_library.models import MediaAsset
from apps.media_library.services import create_image_asset

from .models import ExperienceAsset


def upload_asset(upload, user, carousel=False):
    extension = Path(upload.name).suffix.lower()
    if extension not in [".mp4", ".webm"]:
        if extension not in [".png", ".jpg", ".jpeg", ".webp", ".avif"]:
            raise ValidationError(
                "Use PNG, JPEG, WebP, AVIF, MP4 or WebM. SVG and executable assets are not accepted."
            )
        try:
            with Image.open(upload) as image:
                width, height = image.size
                if carousel and width * 9 != height * 16:
                    raise ValidationError(
                        "Carousel media must be exactly 16:9; crop before uploading."
                    )
            upload.seek(0)
        except (OSError, UnidentifiedImageError):
            raise ValidationError("Invalid image content.") from None
        return ExperienceAsset.objects.create(media=create_image_asset(upload, "banners", user))
    if upload.size > 40 * 1024 * 1024:
        raise ValidationError("Videos must be smaller than 40 MB.")
    if not shutil.which("ffprobe") or not shutil.which("ffmpeg"):
        raise ValidationError(
            "Video processing is unavailable; install FFmpeg on the server before uploading videos."
        )
    with tempfile.TemporaryDirectory(prefix="sky-video-") as folder:
        source = Path(folder) / ("source" + extension)
        source.write_bytes(upload.read())
        signature = source.read_bytes()[:16]
        if not (
            (extension == ".mp4" and signature[4:8] == b"ftyp")
            or (extension == ".webm" and signature[:4] == b"\x1aE\xdf\xa3")
        ):
            raise ValidationError("Video signature does not match its extension.")
        try:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-protocol_whitelist",
                    "file",
                    "-show_streams",
                    "-show_format",
                    "-of",
                    "json",
                    str(source),
                ],
                capture_output=True,
                timeout=15,
                check=True,
            )
            metadata = json.loads(result.stdout)
            streams = [s for s in metadata["streams"] if s["codec_type"] == "video"]
            if len(streams) != 1:
                raise ValueError()
            stream = streams[0]
            width, height = stream["width"], stream["height"]
            duration = float(metadata["format"]["duration"])
            if width * 9 != height * 16 or width > 3840 or not 0 < duration <= 60:
                raise ValueError()
            output, poster = Path(folder) / "safe.mp4", Path(folder) / "poster.png"
            subprocess.run(
                [
                    "ffmpeg",
                    "-v",
                    "error",
                    "-threads",
                    "1",
                    "-protocol_whitelist",
                    "file",
                    "-i",
                    str(source),
                    "-map_metadata",
                    "-1",
                    "-an",
                    "-c:v",
                    "libx264",
                    "-threads",
                    "1",
                    "-pix_fmt",
                    "yuv420p",
                    "-movflags",
                    "+faststart",
                    str(output),
                ],
                capture_output=True,
                timeout=120,
                check=True,
            )
            subprocess.run(
                ["ffmpeg", "-v", "error", "-i", str(output), "-frames:v", "1", str(poster)],
                capture_output=True,
                timeout=15,
                check=True,
            )
        except (subprocess.SubprocessError, ValueError, KeyError):
            raise ValidationError("Video must be valid 16:9, at most 4K and 60 seconds.") from None
        thumbnail = create_image_asset(
            ContentFile(poster.read_bytes(), name="poster.png"), "banners", user
        )
        with transaction.atomic():
            from apps.media_library.models import MediaStorageState

            quota = MediaStorageState.objects.select_for_update().get(pk=1)
            size = output.stat().st_size
            if quota.used_bytes + size > settings.MEDIA_MAX_STORAGE_BYTES:
                raise ValidationError("Media quota exceeded.")
            media = MediaAsset(
                kind="banners",
                original_name=upload.name[:255],
                mime_type="video/mp4",
                width=width,
                height=height,
                status="ready",
                total_bytes=size,
                created_by=user,
            )
            import uuid

            media.file.save(
                f"banners/videos/{uuid.uuid4().hex}.mp4", ContentFile(output.read_bytes())
            )
            quota.used_bytes += size
            quota.save()
            return ExperienceAsset.objects.create(media=media, duration=duration, poster=thumbnail)
