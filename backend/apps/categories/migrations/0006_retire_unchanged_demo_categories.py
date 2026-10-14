"""Retire only unchanged seeded merchandising, without deleting user data."""

from importlib import import_module
from decimal import Decimal

from django.db import migrations


def retire_demo(apps, schema_editor):
    Category = apps.get_model("categories", "Category")
    seeds = import_module("apps.categories.migrations.0003_seed_homepage_categories").CATEGORIES
    for seed in seeds:
        values = {key: value for key, value in seed.items() if key != "image_url"}
        values["starting_price"] = Decimal(values["starting_price"])
        filename = seed["image_url"].rsplit("/", 1)[-1]
        Category.objects.using(schema_editor.connection.alias).filter(
            **values, parent__isnull=True, image=f"categories/artwork/{filename}"
        ).update(is_active=False, show_on_homepage=False)


class Migration(migrations.Migration):
    dependencies = [("categories", "0005_category_parent")]
    operations = [migrations.RunPython(retire_demo, migrations.RunPython.noop)]
