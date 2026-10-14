import json

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.media_library.models import MediaAsset, MediaStorageState
from apps.media_library.services import storage_health
from apps.products.models import Product


class Command(BaseCommand):
    help = "Report missing references, quota and disk health without removing files."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true")

    def handle(self, *args, **options):
        missing = []
        for model, field in [(Category, "image"), (Product, "image"), (Brand, "logo")]:
            for obj in model.objects.exclude(**{field: ""}).iterator():
                file = getattr(obj, field)
                if not file.storage.exists(file.name):
                    missing.append({"model": model._meta.label, "id": obj.pk, "file": file.name})
        for asset in MediaAsset.objects.filter(status="ready"):
            for field in ("file", "thumbnail", "original"):
                file = getattr(asset, field)
                if file and not file.storage.exists(file.name):
                    missing.append({"model": "MediaAsset", "id": str(asset.pk), "file": file.name})
        try:
            free = storage_health()
        except Exception as error:
            raise CommandError("Media disk health check failed.") from error
        result = {
            "missing": missing,
            "free_bytes": free,
            "warning": free < settings.MEDIA_WARN_FREE_BYTES,
            "tracked_bytes": MediaStorageState.objects.filter(pk=1)
            .values_list("used_bytes", flat=True)
            .first()
            or 0,
        }
        self.stdout.write(json.dumps(result, indent=2))
        if missing:
            raise CommandError("Missing media references detected. No files were deleted.")
