"""One-time, repeatable migration. Copy and verify; never delete the source."""

import hashlib
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError

from apps.media_library.storage import private_storage


def copy_verified(source, storage, name):
    expected = hashlib.sha256(source.read_bytes()).hexdigest()
    if storage.exists(name):
        with storage.open(name, "rb") as existing:
            if hashlib.sha256(existing.read()).hexdigest() != expected:
                raise CommandError(f"Destination conflicts with source: {name}")
    else:
        with source.open("rb") as stream:
            saved = storage.save(name, File(stream))
        if saved != name:
            raise CommandError(f"Destination name changed unexpectedly: {name}")
    with storage.open(name, "rb") as copied:
        if hashlib.sha256(copied.read()).hexdigest() != expected:
            raise CommandError(f"Checksum verification failed: {name}")


class Command(BaseCommand):
    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument("--source", type=Path, default=settings.BASE_DIR / "media")
        parser.add_argument(
            "--artwork",
            type=Path,
            default=settings.BASE_DIR.parent / "frontend/public/images/homepage/categories-v2",
        )

    def handle(self, *args, **options):
        count = 0
        source = options["source"].resolve()
        if source.exists():
            for path in source.rglob("*"):
                if path.is_symlink():
                    raise CommandError("Symlinks are not accepted during media migration.")
                if not path.is_file():
                    continue
                name = path.relative_to(source).as_posix()
                if name.startswith("originals/"):
                    copy_verified(
                        path, private_storage(), "legacy/" + name.removeprefix("originals/")
                    )
                else:
                    copy_verified(path, default_storage, name)
                count += 1
        artwork = options["artwork"].resolve()
        if artwork.exists():
            for path in artwork.glob("*.webp"):
                if path.is_symlink():
                    raise CommandError("Symlinks are not accepted.")
                copy_verified(path, default_storage, "categories/artwork/" + path.name)
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Verified {count} files; source files preserved."))
