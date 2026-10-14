import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import Client, override_settings
from django.urls import include, path

from apps.branches.models import Branch
from apps.inventory.models import Stock
from apps.products.management_api import management_urlpatterns

urlpatterns = [path("api/v1/management/", include(management_urlpatterns))]
BASE = "/api/v1/management/"


@pytest.fixture(autouse=True)
def urls():
    cache.clear()
    with override_settings(ROOT_URLCONF=__name__):
        yield


@pytest.fixture
def owner(db):
    return User.objects.create_superuser(username="api-owner", password="test-only-password")


@pytest.fixture
def owner_client(owner):
    client = Client(enforce_csrf_checks=True)
    client.force_login(owner)
    token = client.get(BASE + "session/").json()["csrfToken"]
    client.defaults["HTTP_X_CSRFTOKEN"] = token
    return client


@pytest.mark.django_db
def test_login_requires_csrf_and_rotates_token(owner):
    client = Client(enforce_csrf_checks=True)
    payload = {"username": owner.username, "password": "test-only-password"}
    assert (
        client.post(BASE + "session/", payload, content_type="application/json").status_code == 403
    )
    session_response = client.get(BASE + "session/")
    assert "no-store" in session_response.headers["Cache-Control"]
    session = session_response.json()
    assert session["user"] is None
    response = client.post(
        BASE + "session/",
        payload,
        content_type="application/json",
        HTTP_X_CSRFTOKEN=session["csrfToken"],
    )
    assert response.status_code == 200
    assert response.json()["user"] == {"username": owner.username}
    token = response.json()["csrfToken"]
    assert token != session["csrfToken"]
    assert client.delete(BASE + "session/").status_code == 403
    assert client.delete(BASE + "session/", HTTP_X_CSRFTOKEN=token).json()["user"] is None
    assert client.get(BASE + "products/").status_code == 403


@pytest.mark.django_db
def test_staff_cannot_use_management_api():
    user = User.objects.create_user(username="staff", password="test-only", is_staff=True)
    client = Client(enforce_csrf_checks=True)
    token = client.get(BASE + "session/").json()["csrfToken"]
    response = client.post(
        BASE + "session/",
        {"username": user.username, "password": "test-only"},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 400
    client.force_login(user)
    for resource in ("products", "brands", "categories"):
        assert client.get(BASE + resource + "/").status_code == 403


@pytest.mark.django_db
def test_owner_crud_validation_and_protected_delete(owner_client):
    client = owner_client
    brand = client.post(BASE + "brands/", {"name": "Test", "slug": "test"}).json()
    category = client.post(BASE + "categories/", {"name": "Phones", "slug": "phones"}).json()
    payload = {
        "name": "Test phone",
        "sku": "API-01",
        "slug": "test-phone",
        "brand": brand["id"],
        "category": category["id"],
        "price": "100.25",
    }
    response = client.post(BASE + "products/", payload)
    assert response.status_code == 201
    product = response.json()
    assert product["price"] == "100.25"
    listing = client.get(BASE + "products/?search=API-01")
    assert "no-store" in listing.headers["Cache-Control"]
    assert listing.json()["count"] == 1
    detail = BASE + f"products/{product['id']}/"
    assert client.patch(detail, {"price": "0"}, content_type="application/json").status_code == 400
    assert (
        client.patch(
            detail, {"compare_at_price": "99"}, content_type="application/json"
        ).status_code
        == 400
    )
    assert (
        client.patch(
            detail, {"price": "200.50", "is_active": True}, content_type="application/json"
        ).json()["price"]
        == "200.50"
    )
    branch = Branch.objects.create(name="Test", code="test", address="Test", city="Test")
    Stock.objects.create(product_id=product["id"], branch=branch, quantity=2)
    assert client.delete(detail).status_code == 409
    assert client.delete(BASE + f"brands/{brand['id']}/").status_code == 409
    Stock.objects.all().delete()
    assert client.delete(detail).status_code == 204
    assert client.delete(BASE + f"brands/{brand['id']}/").status_code == 204


@pytest.mark.django_db
@pytest.mark.parametrize("authenticated", [False, True])
def test_login_attempts_are_throttled(authenticated):
    client = Client(enforce_csrf_checks=True)
    if authenticated:
        user = User.objects.create_user(username="rate-limited-staff", is_staff=True)
        client.force_login(user)
    token = client.get(BASE + "session/").json()["csrfToken"]
    for _ in range(10):
        assert (
            client.post(
                BASE + "session/",
                {"username": "missing", "password": "invalid"},
                HTTP_X_CSRFTOKEN=token,
            ).status_code
            == 400
        )
    assert (
        client.post(
            BASE + "session/",
            {"username": "missing", "password": "invalid"},
            HTTP_X_CSRFTOKEN=token,
        ).status_code
        == 429
    )
