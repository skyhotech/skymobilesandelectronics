"""Import branch identities only, never product or stock data."""

import re
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.branches.models import Branch

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def normalize(value):
    return " ".join(value.split()).upper()


def cell_value(cell, strings):
    value = cell.find(f"{NS}v")
    if cell.get("t") == "s":
        return strings[int(value.text)]
    if cell.get("t") == "inlineStr":
        return "".join(cell.find(f"{NS}is").itertext())
    return value.text or "" if value is not None else ""


def branch_names(path):
    names = set()
    found = False
    try:
        with ZipFile(path) as archive:
            if sum(info.file_size for info in archive.infolist()) > 64 * 1024 * 1024:
                raise CommandError("Workbook exceeds the 64 MiB expanded size limit.")
            strings = []
            if "xl/sharedStrings.xml" in archive.namelist():
                strings = [
                    "".join(node.itertext())
                    for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall(
                        f"{NS}si"
                    )
                ]
            for sheet in archive.namelist():
                if not re.fullmatch(r"xl/worksheets/sheet[0-9]+\.xml", sheet):
                    continue
                column = None
                with archive.open(sheet) as stream:
                    for _, row in ET.iterparse(stream, events=("end",)):
                        if row.tag != f"{NS}row":
                            continue
                        cells = {}
                        for index, cell in enumerate(row.findall(f"{NS}c")):
                            ref = re.sub(r"[0-9]", "", cell.get("r", "")) or str(index)
                            cells[ref] = normalize(cell_value(cell, strings))
                        if column is None:
                            column = next(
                                (key for key, value in cells.items() if value == "BRANCH"), None
                            )
                            found = found or column is not None
                        else:
                            value = cells.get(column, "")
                            if value and value not in {"TOTAL", "GRAND TOTAL", "BRANCH"}:
                                names.add(value)
                        row.clear()
    except (OSError, BadZipFile, ET.ParseError, KeyError, ValueError, IndexError) as error:
        raise CommandError("Unable to read the XLSX workbook or its Branch column.") from error
    if not found or not names:
        raise CommandError("No branch data found under a Branch header.")
    return sorted(names)


class Command(BaseCommand):
    help = "Seed distinct branches from an XLSX Branch column. Dry-run unless --apply."

    def add_arguments(self, parser):
        parser.add_argument("workbook", type=Path)
        parser.add_argument("--apply", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        names = branch_names(options["workbook"])
        existing = list(Branch.objects.select_for_update())
        created = skipped = 0
        codes = set()
        for name in names:
            code = slugify(name)
            if not code or len(code) > 40 or len(name) > 160 or code in codes:
                raise CommandError("Invalid or conflicting branch identity; no changes saved.")
            codes.add(code)
            matches = [
                branch
                for branch in existing
                if normalize(branch.name) == name or branch.code.casefold() == code
            ]
            if len(matches) > 1 or (matches and normalize(matches[0].name) != name):
                raise CommandError(f"Conflicting existing branch identity: {name}.")
            if matches:
                skipped += 1
                continue
            # City comes only from the branch label; these two labels supply no city.
            city = (
                ""
                if name in {"HEAD OFFICE", "MAINLINE RETAILER"}
                else re.sub(r"[- ]+\d+$", "", name)
            )
            if len(city) > 100:
                raise CommandError("City label exceeds the schema limit.")
            if options["apply"]:
                Branch.objects.create(name=name, code=code, city=city)
            created += 1
        prefix = "Imported" if options["apply"] else "Dry run; would import"
        self.stdout.write(
            f"{prefix} {created}; existing {skipped}; distinct branches {len(names)}."
        )
