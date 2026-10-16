from django.db import migrations, models
from django.db.models import Count


def normalize(apps, schema_editor):
    Branch = apps.get_model("branches", "Branch")
    Branch.objects.filter(google_place_id="").update(google_place_id=None)
    if (
        Branch.objects.exclude(google_place_id=None)
        .values("google_place_id")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
        .exists()
    ):
        raise RuntimeError("Resolve duplicate Google Place IDs before applying this migration.")


class Migration(migrations.Migration):
    dependencies = [("branches", "0007_classify_showrooms")]
    operations = [
        migrations.AlterField(
            model_name="branch",
            name="google_place_id",
            field=models.CharField(max_length=255, blank=True, null=True),
        ),
        migrations.RunPython(normalize, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="branch",
            name="google_place_id",
            field=models.CharField(max_length=255, blank=True, null=True, unique=True),
        ),
    ]
