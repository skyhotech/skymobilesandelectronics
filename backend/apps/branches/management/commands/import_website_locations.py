import json
from pathlib import Path
from urllib.parse import urlencode

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.branches.models import Branch


class Command(BaseCommand):
    help = "Fill missing branch addresses/phones/map search links from reviewed SKY website data."

    @transaction.atomic
    def handle(self, *args, **options):
        path = Path(__file__).resolve().parents[2] / "data" / "website_locations.json"
        records = json.loads(path.read_text())["branches"]
        changed = 0
        for record in records:
            branch = Branch.objects.select_for_update().filter(code=record["code"]).first()
            if not branch:
                continue
            updates = []
            for field in ["address", "phone"]:
                if not getattr(branch, field):
                    setattr(branch, field, record[field])
                    updates.append(field)
            if not branch.google_maps_url and branch.address == record["address"]:
                branch.google_maps_url = "https://www.google.com/maps/search/?" + urlencode(
                    {"api": 1, "query": "SKY Mobile & Electronics " + branch.address}
                )
                updates.append("google_maps_url")
            if updates:
                branch.save(update_fields=updates)
                changed += 1
        self.stdout.write(
            f"Updated {changed} existing branches; existing nonempty details preserved."
        )
