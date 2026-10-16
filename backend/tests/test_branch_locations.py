from io import StringIO

import pytest
from django.contrib.auth.models import Group, User
from django.core.management import call_command

from apps.branches.models import Branch

pytestmark = pytest.mark.django_db


def test_locations_import_is_idempotent_and_preserves_edits():
    branch = Branch.objects.create(name="ARNI-1", code="arni-1", city="ARNI")
    call_command("import_website_locations", stdout=StringIO())
    branch.refresh_from_db()
    assert "Big Bazaar" in branch.address
    assert branch.google_maps_url.startswith("https://www.google.com/maps/search/")
    branch.phone = "custom-phone"
    branch.save()
    call_command("import_website_locations", stdout=StringIO())
    branch.refresh_from_db()
    assert branch.phone == "custom-phone"
    assert Branch.objects.count() == 1


def test_public_locations_and_maps_validation(client):
    branch = Branch.objects.create(
        name="Visible",
        code="visible",
        address="Address",
        google_maps_url="https://www.google.com/maps/search/?api=1&query=Test",
    )
    Branch.objects.create(name="Hidden", code="hidden", address="Hidden", is_active=False)
    Branch.objects.create(name="Unset", code="unset")
    response = client.get("/api/v1/branches/")
    assert [row["id"] for row in response.json()] == [branch.id]
    assert "code" not in response.json()[0]
    user = User.objects.create_user("maps-hr")
    user.groups.add(Group.objects.create(name="HR"))
    client.force_login(user)
    url = f"/api/v1/hr/branches/{branch.id}/"
    for value in [
        "javascript:alert(1)",
        "https://evil.example/maps",
        "https://www.google.com.evil.example/maps",
        "https://www.google.com/search",
        "https://goo.gl/unrelated",
    ]:
        assert (
            client.patch(
                url, {"google_maps_url": value}, content_type="application/json"
            ).status_code
            == 400
        )
    assert (
        client.patch(
            url,
            {"google_maps_url": "https://maps.app.goo.gl/example"},
            content_type="application/json",
        ).status_code
        == 200
    )
