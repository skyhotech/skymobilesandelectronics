import hashlib
import io
import uuid
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from PIL import Image

from apps.media_library.models import MediaAsset, MediaStorageState
from apps.media_library.storage import private_storage


def names(storage, folder):
    if not storage.exists(folder):
        return
    if Path(storage.path(folder)).is_symlink():
        raise CommandError("Refusing to index a symlink directory.")
    directories, files = storage.listdir(folder)
    for name in files:
        yield f"{folder}/{name}"
    for directory in directories:
        yield from names(storage, f"{folder}/{directory}")


class Command(BaseCommand):
    help = "Index existing public images and preserve private originals; no destructive operations."

    def handle(self, *args, **options):
        count = 0
        MediaStorageState.objects.get_or_create(pk=1)
        with transaction.atomic():
            state = MediaStorageState.objects.select_for_update().get(pk=1)
            known = set(MediaAsset.objects.values_list("file", flat=True))
            for kind in MediaAsset.Kind.values:
                for name in names(default_storage, kind):
                    if (
                        "/thumbnails/" in name
                        or name.endswith("-thumb.webp")
                        or name in known
                        or not name.lower().endswith((".webp", ".png", ".jpg", ".jpeg", ".avif"))
                    ):
                        continue
                    with default_storage.open(name, "rb") as file:
                        content = file.read()
                    with Image.open(io.BytesIO(content)) as image:
                        width, height = image.size
                    identifier = uuid.uuid5(uuid.NAMESPACE_URL, f"sky-media:{kind}:{name}")
                    basename = name.rsplit("/", 1)[-1]
                    original = f"legacy/{kind}/{basename.rsplit('.', 1)[0]}.source"
                    private = private_storage()
                    if private.exists(original):
                        with private.open(original, "rb") as file:
                            original_content = file.read()
                    else:
                        original_content = content
                        original = f"{kind}/originals/{identifier.hex}.webp"
                        if private.exists(original):
                            with private.open(original, "rb") as saved:
                                if saved.read() != content:
                                    raise CommandError(
                                        "Conflicting original; no file was replaced."
                                    )
                        else:
                            private.save(original, ContentFile(content))
                    thumbnail = name.removesuffix(".webp") + "-thumb.webp"
                    if not default_storage.exists(thumbnail):
                        thumbnail = ""
                    total = (
                        len(content)
                        + len(original_content)
                        + (default_storage.size(thumbnail) if thumbnail else 0)
                    )
                    MediaAsset.objects.create(
                        id=identifier,
                        kind=kind,
                        file=name,
                        original=original,
                        thumbnail=thumbnail,
                        original_name=basename,
                        sha256=hashlib.sha256(original_content).hexdigest(),
                        width=width,
                        height=height,
                        original_bytes=len(original_content),
                        total_bytes=total,
                        status="ready",
                    )
                    count += 1
                    known.add(name)
            state.used_bytes = MediaAsset.objects.aggregate(total=Sum("total_bytes"))["total"] or 0
            state.save(update_fields=["used_bytes"])
        self.stdout.write(
            self.style.SUCCESS(f"Indexed {count} images; existing records and files preserved.")
        )
