import pytest
from django.contrib.auth.models import User
from django.test import Client

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.products.models import Product

pytestmark = pytest.mark.django_db
BASE = "/api/v1/management/products/"


@pytest.fixture
def catalog():
    brands = [Brand.objects.create(name=name, slug=name) for name in ("first", "second")]
    category = Category.objects.create(name="Brand products", slug="brand-products")
    products = [Product.objects.create(
        name=f"Phone {index:02}", slug=f"phone-{index}", sku=f"BP-{index}",
        price="100.00", brand=brands[0] if index < 25 else brands[1], category=category,
    ) for index in range(26)]
    return brands, products


@pytest.fixture
def owner_client():
    owner = User.objects.create_superuser(username="brand-products-owner", password="test-only")
    client = Client(enforce_csrf_checks=True)
    client.force_login(owner)
    token = client.get("/api/v1/management/session/").json()["csrfToken"]
    client.defaults["HTTP_X_CSRFTOKEN"] = token
    return client


def test_owner_brand_filter_paginates_and_preserves_unfiltered_api(catalog, owner_client):
    brands, products = catalog
    response = owner_client.get(BASE, {"brand": brands[0].pk})
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 25
    assert len(data["results"]) == 24
    assert data["next"] is not None
    assert all(item["brand"] == brands[0].pk for item in data["results"])
    second = owner_client.get(BASE, {"brand": brands[0].pk, "page": 2}).json()
    assert [item["id"] for item in second["results"]] == [products[24].pk]
    assert owner_client.get(BASE).json()["count"] == 26
    assert owner_client.get(BASE, {"brand": 999999}).json()["count"] == 0


def test_scoped_detail_cannot_read_or_modify_foreign_brand(catalog, owner_client):
    brands, products = catalog
    own = BASE + str(products[0].pk) + "/"
    foreign = BASE + str(products[-1].pk) + "/"
    query = f"?brand={brands[0].pk}"
    assert owner_client.get(own + query).status_code == 200
    assert owner_client.get(foreign).status_code == 200
    assert owner_client.get(foreign + query).status_code == 404
    assert owner_client.patch(
        foreign + query, {"name": "Changed"}, content_type="application/json"
    ).status_code == 404
    assert owner_client.delete(foreign + query).status_code == 404
    products[-1].refresh_from_db()
    assert products[-1].name == "Phone 25"


def test_scoped_writes_cannot_assign_another_brand(catalog, owner_client):
    brands, products = catalog
    query = f"?brand={brands[0].pk}"
    detail = BASE + str(products[0].pk) + "/"
    payload = {
        "name": "Scoped creation", "sku": "SCOPED", "slug": "scoped",
        "price": "200.00", "category": products[0].category_id, "brand": brands[1].pk,
    }
    response = owner_client.post(BASE + query, payload, content_type="application/json")
    assert response.status_code == 400
    assert not Product.objects.filter(sku="SCOPED").exists()
    assert owner_client.patch(
        detail + query, {"brand": brands[1].pk}, content_type="application/json"
    ).status_code == 400
    products[0].refresh_from_db()
    assert products[0].brand_id == brands[0].pk
    payload["brand"] = brands[0].pk
    response = owner_client.post(BASE + query, payload, content_type="application/json")
    assert response.status_code == 201
    assert owner_client.patch(
        detail + query, {"price": "150.00"}, content_type="application/json"
    ).status_code == 200
    assert owner_client.patch(
        detail, {"brand": brands[1].pk}, content_type="application/json"
    ).status_code == 200


@pytest.mark.parametrize("brand", ["", "abc", "-1", "0", "1.5", "1 OR 1=1"])
def test_invalid_brand_filter_returns_400(brand, owner_client):
    response = owner_client.get(BASE, {"brand": brand})
    assert response.status_code == 400
    assert "brand" in response.json()


def test_brand_filter_does_not_bypass_owner_permission(catalog):
    brands, _ = catalog
    assert Client().get(BASE, {"brand": brands[0].pk}).status_code == 403
    staff = User.objects.create_user(username="brand-products-staff", is_staff=True)
    client = Client()
    client.force_login(staff)
    assert client.get(BASE, {"brand": brands[0].pk}).status_code == 403
