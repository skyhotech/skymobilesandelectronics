import hashlib
import json
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image

from apps.experience.models import ExperienceAsset
from apps.media_library.models import MediaAsset
from apps.media_library.services import create_image_asset

LABELS = {
    "diwali": "Deepavali",
    "pongal": "Pongal",
    "navarathri": "Navaratri",
    "christmas": "Christmas",
    "new year": "New Year",
    "valentine": "Valentine's Day",
    "inddependence": "Independence Day",
    "republic": "Republic Day",
    "raksha": "Raksha Bandhan",
    "summeer": "Summer",
    "monsoon": "Monsoon",
    "winter": "Winter",
    "saraswathi": "Ayudha Pooja",
}


class Command(BaseCommand):
    help = "Inventory and optionally import reference images; never changes originals or publishes them."

    def add_arguments(self, parser):
        parser.add_argument("directory")
        parser.add_argument("--import-files", action="store_true")
        parser.add_argument("--report")

    def handle(self, *args, **options):
        root = Path(options["directory"]).resolve()
        rows = []
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            row = {
                "source": str(path.relative_to(root)),
                "bytes": path.stat().st_size,
                "category": next(
                    (label for key, label in LABELS.items() if key in path.stem.lower()),
                    "unassigned",
                ),
            }
            try:
                with Image.open(path) as image:
                    row.update(width=image.width, height=image.height, format=image.format)
                raw = path.read_bytes()
                digest = hashlib.sha256(raw).hexdigest()
                row["sha256"] = digest
                if options["import_files"] and path.suffix.lower() in [
                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".webp",
                    ".avif",
                ]:
                    media = MediaAsset.objects.filter(
                        sha256=digest, status="ready", is_archived=False
                    ).first()
                    if not media:
                        media = create_image_asset(
                            ContentFile(raw, name=path.name), "banners", None
                        )
                    asset, _ = ExperienceAsset.objects.get_or_create(
                        media=media, defaults={"category": row["category"]}
                    )
                    row["asset_id"] = asset.pk
            except (OSError, ValueError):
                row["status"] = "unassigned; inspect manually"
            rows.append(row)
        if options["report"]:
            Path(options["report"]).write_text(json.dumps(rows, indent=2), encoding="utf-8")
        self.stdout.write(f"Inspected {len(rows)} assets; originals preserved.")
