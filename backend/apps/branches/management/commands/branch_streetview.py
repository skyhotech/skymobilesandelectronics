import csv
import json
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.branches.models import Branch
from apps.branches.streetview import coordinates_current, embed_url, purge_expired, sync_branch

from .import_branches import normalize


class Command(BaseCommand):
    help = "Street View discovery/metadata checks, privacy purge and JSON/CSV reports."

    def add_arguments(self, parser):
        parser.add_argument("action", choices=["sync", "verify", "report", "purge"])
        parser.add_argument("--all", action="store_true")
        parser.add_argument("--branch")
        parser.add_argument("--force", action="store_true")
        parser.add_argument("--retry-errors", action="store_true")
        parser.add_argument("--limit", type=int, default=31)
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--output", type=Path, default=Path("../.run/branch-streetview"))

    def handle(self, *args, **options):
        if options["action"] == "purge":
            purge_expired()
            self.stdout.write("Expired Google location content purged.")
            return
        branches = Branch.objects.filter(is_showroom=True).order_by("id")
        if options["branch"]:
            identifier = options["branch"]
            branches = (
                branches.filter(name__iexact=normalize(identifier))
                if not identifier.startswith("SKY-")
                else branches.filter(pk=identifier.removeprefix("SKY-"))
            )
        elif not options["all"] and options["action"] != "report":
            raise CommandError("Choose --all or --branch NAME.")
        if options["retry_errors"]:
            branches = branches.filter(street_view_status="error")
        if not 1 <= options["limit"] <= 200:
            raise CommandError("Limit must be between 1 and 200.")
        if options["action"] in {"sync", "verify"}:
            for branch in branches[: options["limit"]]:
                if options["dry_run"]:
                    self.stdout.write(f"Dry run: {branch.branch_id} {branch.name} (no API calls)")
                    continue
                status = sync_branch(
                    branch,
                    force=options["force"] or options["retry_errors"],
                    metadata_only=options["action"] == "verify",
                )
                self.stdout.write(f"{branch.branch_id}: {status}")
                if settings.GOOGLE_MAPS_STREETVIEW_ENABLED and settings.GOOGLE_MAPS_SERVER_API_KEY:
                    time.sleep(max(1, settings.GOOGLE_MAPS_SYNC_DELAY_SECONDS))
        rows = []
        for branch in branches:
            current = coordinates_current(branch)
            rows.append(
                {
                    "Branch ID": branch.branch_id,
                    "Branch Name": branch.name,
                    "Address": branch.address or None,
                    "Latitude": str(branch.latitude)
                    if current and branch.latitude is not None
                    else None,
                    "Longitude": str(branch.longitude)
                    if current and branch.longitude is not None
                    else None,
                    "Google Place ID": branch.google_place_id or None,
                    "Google Maps URL": branch.google_maps_url or None,
                    "Street View Embed URL": embed_url(branch, include_key=False) or None,
                    "Street View Status": branch.street_view_status,
                    "Storefront Verified": branch.street_view_verified and bool(embed_url(branch)),
                    "Last Checked": branch.last_checked_at.isoformat()
                    if branch.last_checked_at
                    else None,
                    "Error Details": branch.sync_error or None,
                }
            )
        target = options["output"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.with_suffix(".json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
        with target.with_suffix(".csv").open("w", newline="", encoding="utf-8") as stream:
            fields = list(rows[0]) if rows else ["Branch Name"]
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            for row in rows:
                writer.writerow(
                    {
                        key: "'" + value
                        if isinstance(value, str) and value.startswith(("=", "+", "-", "@"))
                        else value
                        for key, value in row.items()
                    }
                )
        self.stdout.write(
            f"Report: {len(rows)} showrooms; "
            f"{Branch.objects.filter(is_showroom=False).count()} non-showroom entries."
        )
