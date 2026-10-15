import pytest
from django.test import Client

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.products.models import Product

BASE = "/api/v1/products/"
pytestmark = pytest.mark.django_db


@pytest.fixture
def product():
    brand = Brand.objects.create(name="Catalog brand", slug="catalog-brand")
    category = Category.objects.create(name="Catalog category", slug="catalog-category")
    return Product.objects.create(
        name="Published phone", slug="published-phone", sku="PUBLIC-1", price="12000.00",
        description="Long battery life", brand=brand, category=category, is_active=True,
        image="products/phone.webp",
    )


def test_anonymous_catalog_contract_and_related_query_count(product, django_assert_num_queries):
    client = Client()
    with django_assert_num_queries(2):
        response = client.get(BASE)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
    item = data["results"][0]
    assert set(item) == {
        "id", "name", "slug", "description", "price", "compare_at_price", "currency",
        "image_url", "brand", "category",
    }
    assert item["price"] == "12000.00"
    assert item["image_url"] == "/media/products/phone.webp"
    assert item["brand"] == {
        "id": product.brand_id, "name": product.brand.name, "slug": product.brand.slug,
    }
    assert client.get(BASE + product.slug + "/").json() == item


@pytest.mark.parametrize("hidden", ["product", "brand", "category"])
def test_unpublished_records_are_hidden(product, hidden):
    record = product if hidden == "product" else getattr(product, hidden)
    record.is_active = False
    record.save(update_fields=["is_active"])
    client = Client()
    assert client.get(BASE).json()["count"] == 0
    assert client.get(BASE + product.slug + "/").status_code == 404


def test_filters_search_ordering_and_pagination(product):
    Product.objects.create(
        name="Affordable phone", slug="affordable-phone", sku="PUBLIC-2", price="10000.00",
        brand=product.brand, category=product.category, is_active=True,
    )
    client = Client()
    for query in ["search=battery", "search=Published", "category=catalog-category&search=battery"]:
        assert client.get(BASE + "?" + query).json()["count"] == 1
    assert client.get(BASE + "?brand=missing").json()["count"] == 0
    assert client.get(BASE + "?category=missing").json()["count"] == 0
    for ordering, expected in [
        ("price", "affordable-phone"), ("-price", product.slug),
        ("name", "affordable-phone"), ("-name", product.slug),
    ]:
        results = client.get(BASE, {"ordering": ordering}).json()["results"]
        assert results[0]["slug"] == expected
    for index in range(24):
        Product.objects.create(
            name="Same name", slug=f"extra-{index}", sku=f"EXTRA-{index}", price="12000.00",
            brand=product.brand, category=product.category, is_active=True,
        )
    first = client.get(BASE).json()
    second = client.get(BASE, {"page": 2}).json()
    assert first["count"] == 26
    assert len(first["results"]) == 24
    assert first["next"] is not None
    assert len(second["results"]) == 2
    assert not {row["id"] for row in first["results"]} & {
        row["id"] for row in second["results"]
    }


@pytest.mark.parametrize("query", [
    {"search": "x" * 121}, {"ordering": "sku"}, {"brand": "bad/slug"},
    {"category": "x" * 141},
])
def test_invalid_filters_return_validation_errors(query):
    assert Client().get(BASE, query).status_code == 400


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
def test_public_catalog_cannot_write(product, method):
    client = Client()
    for path in [BASE, BASE + product.slug + "/"]:
        assert getattr(client, method)(path, {}, content_type="application/json").status_code == 405
    product.refresh_from_db()
    assert product.name == "Published phone"
