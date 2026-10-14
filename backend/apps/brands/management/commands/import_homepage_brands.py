"""Import the storefront's former hard-coded brand wall into the database.

Repeatable: logos are copied with checksum verification, existing brands are matched by
slug and only missing values are filled in (admin edits are never overwritten unless
--force is given). SVG is not accepted by the media pipeline, so logos are bundled as
raster WebP in ``apps/brands/fixtures/homepage-logos`` (override with --source).
"""

from pathlib import Path

from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.brands.models import Brand
from apps.media_library.management.commands.import_local_media import copy_verified

# Order and names exactly as previously hard-coded in frontend brand-collection.tsx.
HOMEPAGE_BRANDS = [
    ("Apple", "apple"),
    ("Samsung", "samsung"),
    ("OnePlus", "oneplus"),
    ("vivo", "vivo"),
    ("OPPO", "oppo"),
    ("motorola", "motorola"),
    ("Xiaomi", "xiaomi"),
    ("realme", "realme"),
    ("Nothing", "nothing"),
    ("POCO", "poco"),
    ("HP", "hp"),
    ("Haier", "haier"),
    ("3DOT", "3dot"),
    ("Bose", "bose"),
    ("Marshall", "marshall"),
    ("boAt", "boat"),
]


class Command(BaseCommand):
    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=Path,
            default=Path(__file__).resolve().parents[2] / "fixtures" / "homepage-logos",
        )
        parser.add_argument(
            "--force", action="store_true", help="Overwrite name, order, logo and visibility."
        )

    @transaction.atomic
    def handle(self, *args, **options):
        source = options["source"].resolve()
        force = options["force"]
        if not source.is_dir():
            raise CommandError(f"Source directory not found: {source}")
        created = updated = 0
        for order, (name, slug) in enumerate(HOMEPAGE_BRANDS):
            logo = next(
                (
                    source / f"{slug}{ext}"
                    for ext in (".webp", ".png")
                    if (source / f"{slug}{ext}").is_file()
                ),
                None,
            )
            if logo is None:
                raise CommandError(f"Missing raster logo for {name}: {slug}.webp")
            stored = f"brands/logos/{logo.name}"
            copy_verified(logo, default_storage, stored)
            brand = (
                Brand.objects.filter(slug=slug).first()
                or Brand.objects.filter(name__iexact=name).first()
            )
            if brand is None:
                Brand.objects.create(
                    name=name,
                    slug=slug,
                    logo=stored,
                    is_active=True,
                    show_on_homepage=True,
                    display_order=order,
                )
                created += 1
                continue
            changed = []
            if force or not brand.logo:
                brand.logo = stored
                changed.append("logo")
            if force:
                brand.name = name
                brand.display_order = order
                brand.show_on_homepage = True
                changed += ["name", "display_order", "show_on_homepage"]
            elif not brand.show_on_homepage and brand.display_order == 0:
                # First import for a pre-existing brand: publish it in the original order.
                brand.show_on_homepage = True
                brand.display_order = order
                changed += ["show_on_homepage", "display_order"]
            if changed:
                brand.save(update_fields=changed)
                updated += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Homepage brands: {created} created, {updated} updated, "
                f"{len(HOMEPAGE_BRANDS) - created - updated} unchanged."
            )
        )
