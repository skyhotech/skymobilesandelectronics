from django.db import migrations


def classify(apps, schema_editor):
    Branch = apps.get_model("branches", "Branch")
    Branch.objects.filter(code__in=["head-office", "mainline-retailer"]).update(is_showroom=False)


class Migration(migrations.Migration):
    dependencies = [("branches", "0006_branch_location_revision")]
    operations = [migrations.RunPython(classify, migrations.RunPython.noop)]
