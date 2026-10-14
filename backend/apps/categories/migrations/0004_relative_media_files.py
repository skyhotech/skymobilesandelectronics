from django.db import migrations, models


def relative_names(apps, schema_editor):
    Category = apps.get_model("categories", "Category")
    for category in Category.objects.exclude(image="").iterator():
        value = category.image.name
        if value.startswith("/media/"):
            name = value.removeprefix("/media/")
        elif value.startswith("/images/homepage/categories-v2/"):
            name = "categories/artwork/" + value.removeprefix("/images/homepage/categories-v2/")
        else:
            name = value
        if name.startswith("/") or "\\" in name or ".." in name.split("/") or ":" in name:
            raise ValueError("Unsafe legacy category reference; inspect before migration.")
        Category.objects.filter(pk=category.pk).update(image=name)


class Migration(migrations.Migration):
    dependencies = [("categories", "0003_seed_homepage_categories")]
    operations = [
        migrations.RemoveConstraint(model_name="category", name="category_homepage_image_required"),
        migrations.RenameField(model_name="category", old_name="image_url", new_name="image"),
        migrations.AlterField(
            model_name="category",
            name="image",
            field=models.FileField(blank=True, max_length=500, upload_to=""),
        ),
        migrations.RunPython(relative_names, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.CheckConstraint(
                condition=models.Q(show_on_homepage=False) | ~models.Q(image=""),
                name="category_homepage_image_required",
            ),
        ),
    ]
