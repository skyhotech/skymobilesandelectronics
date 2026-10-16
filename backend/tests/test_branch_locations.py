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
    unset = Branch.objects.create(name="Unset", code="unset")
    Branch.objects.create(name="HEAD OFFICE", code="head-office", is_showroom=False)
    response = client.get("/api/v1/branches/")
    assert {row["id"] for row in response.json()} == {branch.id, unset.id}
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


def test_street_view_accepts_share_embed_only(client):
    user = User.objects.create_user("streetview-hr")
    user.groups.add(Group.objects.create(name="HR"))
    client.force_login(user)
    branch = Branch.objects.create(name="Panorama test", code="panorama-test")
    url = f"/api/v1/hr/branches/{branch.id}/"
    embed = "https://www.google.com/maps/embed?pb=test-only-panorama"
    response = client.patch(
        url,
        {"street_view_embed_url": f'<iframe src="{embed}" onload="alert(1)"></iframe>'},
        content_type="application/json",
    )
    assert response.status_code == 200
    assert response.json()["street_view_embed_url"] == embed
    public = client.get("/api/v1/branches/").json()
    assert public[0]["street_view_embed_url"] == ""
    assert not public[0]["street_view_verified"]
    for invalid in [
        "javascript:alert(1)",
        "https://evil.example/maps/embed?pb=x",
        "https://www.google.com/maps/embed/v1/streetview?key=test",
        "https://www.google.com/maps/embed?pb=x&key=test",
        "https://www.google.com:bad/maps/embed?pb=x",
        "<iframe src='javascript:alert(1)'></iframe>",
    ]:
        assert (
            client.patch(
                url, {"street_view_embed_url": invalid}, content_type="application/json"
            ).status_code
            == 400
        )
    assert (
        client.patch(
            url, {"street_view_embed_url": ""}, content_type="application/json"
        ).status_code
        == 200
    )
