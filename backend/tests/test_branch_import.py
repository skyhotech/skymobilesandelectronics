from io import StringIO
from xml.sax.saxutils import escape
from zipfile import ZipFile

import pytest
from django.contrib.auth.models import Group, User
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.branches.models import Branch

pytestmark = pytest.mark.django_db


def workbook(tmp_path, names):
    path = tmp_path / "branches.xlsx"
    rows = []
    for value in ["Branch", *names]:
        rows.append(f'<row><c t="inlineStr"><is><t>{escape(value)}</t></is></c></row>')
    with ZipFile(path, "w") as archive:
        archive.writestr(
            "xl/worksheets/sheet1.xml",
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
            + "".join(rows)
            + "</sheetData></worksheet>",
        )
    return path


def test_dry_run_idempotency_and_multiple_branches_per_city(tmp_path):
    path = workbook(tmp_path, ["ARNI-1", " arni-1 ", "ARNI-2", "HEAD OFFICE", "Total"])
    call_command("import_branches", path, stdout=StringIO())
    assert not Branch.objects.exists()
    call_command("import_branches", path, apply=True, stdout=StringIO())
    call_command("import_branches", path, apply=True, stdout=StringIO())
    assert Branch.objects.count() == 3
    assert Branch.objects.filter(city="ARNI").count() == 2
    assert Branch.objects.get(code="head-office").city == ""
    branch = Branch.objects.get(code="arni-1")
    branch.phone = "12345"
    branch.save()
    call_command("import_branches", path, apply=True, stdout=StringIO())
    branch.refresh_from_db()
    assert branch.phone == "12345"


def test_conflict_rolls_back_entire_import(tmp_path):
    Branch.objects.create(name="Other branch", code="z-1", city="City")
    path = workbook(tmp_path, ["A-1", "Z-1"])
    with pytest.raises(CommandError):
        call_command("import_branches", path, apply=True)
    assert Branch.objects.count() == 1


def test_hr_branch_directory_is_restricted_and_searchable(client):
    url = "/api/v1/hr/branches/"
    assert client.get(url).status_code == 403
    user = User.objects.create_user("branch-reader")
    client.force_login(user)
    assert client.get(url).status_code == 403
    user.groups.add(Group.objects.create(name="HR"))
    Branch.objects.create(name="ARNI-1", code="arni-1", city="ARNI")
    Branch.objects.create(name="ARNI-2", code="arni-2", city="ARNI")
    Branch.objects.create(name="VELLORE-1", code="vellore-1", city="VELLORE")
    response = client.get(url, {"search": "arni"})
    assert response.json()["count"] == 2
    assert "no-store" in response["Cache-Control"]
