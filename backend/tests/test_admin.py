import pytest
from django.urls import reverse


def test_admin_uses_requested_path(client):
    assert reverse("admin:index") == "/backend/django/admin/"
    response = client.get("/admin/")
    assert response.status_code == 302
    assert response.url == reverse("admin:index")


def test_legacy_admin_redirect_preserves_path_and_query(client):
    response = client.get("/management/admin/login/?next=/backend/django/admin/")
    assert response.status_code == 302
    assert response.url == "/backend/django/admin/login/?next=/backend/django/admin/"


@pytest.mark.django_db
def test_admin_requires_login(client):
    response = client.get(reverse("admin:index"))
    assert response.status_code == 302
    assert response.url.startswith(reverse("admin:login"))


@pytest.mark.django_db
def test_superuser_can_access_admin(client, django_user_model):
    user = django_user_model.objects.create_superuser(
        username="test-owner", password="test-only-324"
    )
    client.force_login(user)
    assert client.get(reverse("admin:index")).status_code == 200
