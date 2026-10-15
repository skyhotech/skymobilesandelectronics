import pytest
from django.contrib.auth.models import User

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.products.models import Product

pytestmark = pytest.mark.django_db


@pytest.fixture
def inventory(client):
    brand = Brand.objects.create(name="Filter brand", slug="filter-brand")
    category = Category.objects.create(name="Filter category", slug="filter-category")
    other = Category.objects.create(name="Other category", slug="other-category")
    rows = []
    for name, price, active, cat in [
        ("Alpha", "100.01", True, category), ("Beta", "200.00", True, category),
        ("Gamma", "150.00", False, category), ("Delta", "150.00", True, other),
    ]:
        rows.append(Product.objects.create(
            name=name, slug=name.lower(), sku=name, price=price,
            brand=brand, category=cat, is_active=active,
        ))
    client.force_login(User.objects.create_superuser(
        username="filters-owner", password="test-only",
    ))
    return brand, category, rows


def test_public_filters_combine_and_include_price_boundaries(inventory, client):
    brand, category, rows = inventory
    response = client.get("/api/v1/products/", {
        "brand": brand.slug, "category": category.slug, "min_price": "100.01",
        "max_price": "200.00", "ordering": "-price", "search": "FILTER BRAND",
    })
    assert response.status_code == 200
    assert [row["id"] for row in response.json()["results"]] == [rows[1].pk, rows[0].pk]
    assert client.get("/api/v1/products/", {"max_price": "0"}).json()["count"] == 0


def test_admin_filters_combine_without_losing_brand_scope(inventory, client):
    brand, category, rows = inventory
    response = client.get("/api/v1/management/products/", {
        "brand": brand.pk, "category": category.pk, "status": "inactive",
        "min_price": "150.00", "max_price": "150.00", "ordering": "-id",
    })
    assert response.status_code == 200
    assert [row["id"] for row in response.json()["results"]] == [rows[2].pk]
    # Listing filters do not stop staff opening an existing record to edit its status.
    assert client.get(
        f"/api/v1/management/products/{rows[0].pk}/", {"status": "inactive"}
    ).status_code == 200
    assert client.get("/api/v1/management/products/", {
        "brand": brand.pk + 9999, "status": "active",
    }).json()["count"] == 0


@pytest.mark.parametrize("params", [
    {"min_price": "-1"}, {"max_price": "NaN"}, {"min_price": "1.001"},
    {"min_price": "9999999999999"}, {"min_price": "201", "max_price": "200"},
    {"ordering": "password"},
])
def test_price_and_sort_validation_on_both_apis(inventory, client, params):
    for endpoint in ("/api/v1/products/", "/api/v1/management/products/"):
        assert client.get(endpoint, params).status_code == 400


@pytest.mark.parametrize("params", [{"category": "bad"}, {"status": "published"}])
def test_admin_rejects_unknown_filter_values(inventory, client, params):
    assert client.get("/api/v1/management/products/", params).status_code == 400


def test_public_options_only_include_published_product_references(inventory, client):
    brand, category, rows = inventory
    hidden = Brand.objects.create(name="Private brand", slug="private-brand", is_active=False)
    Product.objects.create(
        name="Hidden", slug="hidden", sku="hidden", price="100", is_active=True,
        brand=hidden, category=category,
    )
    # Public options do not require an owner session.
    client.logout()
    response = client.get("/api/v1/products/filters/options/")
    assert response.status_code == 200
    assert [row["id"] for row in response.json()["brands"]] == [brand.pk]
    rows[0].is_active = False
    rows[0].save()
    rows[1].is_active = False
    rows[1].save()
    assert category.pk not in {
        row["id"] for row in client.get("/api/v1/products/filters/options/").json()["categories"]
    }
