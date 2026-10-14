import pytest


@pytest.mark.django_db
@pytest.mark.parametrize("path", ["products/", "brands/", "categories/", "media/", "media/upload/", "category-images/", "future-route/"])
def test_management_namespace_requires_authentication(client, path):
    response = client.get("/api/v1/management/" + path)
    assert response.status_code == 403
    assert response.json()["detail"] == "Authentication required."
    assert "no-store" in response.headers["Cache-Control"]


@pytest.mark.django_db
def test_non_owner_denied_and_public_bootstrap_available(client, django_user_model):
    user = django_user_model.objects.create_user(username="ordinary-user", password="test-only")
    client.force_login(user)
    assert client.get("/api/v1/management/products/").status_code == 403
    assert client.get("/api/v1/management/session/").status_code == 200
    assert client.get("/api/v1/categories/").status_code == 200
