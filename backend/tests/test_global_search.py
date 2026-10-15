import pytest
from django.contrib.auth.models import User
from django.test import Client

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.products.models import Product

pytestmark = pytest.mark.django_db
URL = "/api/v1/management/search/"


@pytest.fixture
def owner_client():
    owner = User.objects.create_superuser(username="search-owner", password="test-only")
    client = Client()
    client.force_login(owner)
    return client


@pytest.fixture
def catalog():
    brand = Brand.objects.create(name="MiXeD Brand", slug="mixed-brand")
    category = Category.objects.create(name="Search Smartphones", slug="search-smartphones")
    live = Product.objects.create(
        name="Galaxy SMARTPHONE", slug="galaxy-phone", sku="UNIQUE-SKU", price="100.00",
        brand=brand, category=category, is_active=True, description="Excellent battery",
    )
    draft = Product.objects.create(
        name="Draft smartphone", slug="draft-phone", sku="DRAFT", price="100.00",
        brand=brand, category=category,
    )
    return brand, category, live, draft


def test_search_is_case_insensitive_and_uses_synonyms_related_fields(catalog, owner_client):
    _, _, live, draft = catalog
    for query in ["show me phones", "find MOBILE please", "smartphones", "mixed brand"]:
        response = owner_client.get(URL, {"q": query})
        assert response.status_code == 200
        assert "no-store" in response["Cache-Control"]
        products = [row for row in response.json()["results"] if row["kind"] == "product"]
        assert {row["id"] for row in products} == {live.pk, draft.pk}
        assert all(row["brand_id"] == live.brand_id for row in products)
    assert owner_client.get(URL, {"q": "unique-sku"}).json()["results"][0]["id"] == live.pk
    results = owner_client.get(URL, {"q": "battery"}).json()["results"]
    assert [row["id"] for row in results] == [live.pk]


def test_search_caps_each_entity(catalog, owner_client):
    brand, category, _, _ = catalog
    for index in range(10):
        Brand.objects.create(name=f"Capmatch brand {index}", slug=f"cap-brand-{index}")
        Category.objects.create(name=f"Capmatch category {index}", slug=f"cap-category-{index}")
        Product.objects.create(
            name=f"Capmatch product {index}", slug=f"cap-product-{index}", sku=f"CAP-{index}",
            price="100.00", brand=brand, category=category,
        )
    results = owner_client.get(URL, {"q": "capmatch"}).json()["results"]
    assert len(results) == 24
    for kind in ("brand", "category", "product"):
        assert sum(row["kind"] == kind for row in results) == 8
    assert all(row["brand_id"] is None for row in results if row["kind"] != "product")


@pytest.mark.parametrize("query", ["", "x", "show me please", "!", "   "])
def test_short_search_is_empty(query, owner_client):
    assert owner_client.get(URL, {"q": query}).json() == {"results": []}


def test_invalid_query_and_permissions(owner_client):
    assert owner_client.get(URL, {"q": "a" * 121}).status_code == 400
    assert Client().get(URL, {"q": "phone"}).status_code == 403
    staff = User.objects.create_user(username="search-staff", is_staff=True)
    client = Client()
    client.force_login(staff)
    assert client.get(URL, {"q": "phone"}).status_code == 403
    assert owner_client.post(URL, {}).status_code == 405


def test_public_search_uses_same_matching_but_hides_drafts(catalog):
    brand, category, live, _ = catalog
    client = Client()
    for query in ["find phones", "MIXED", "unique-sku", "BATTERY"]:
        response = client.get("/api/v1/products/", {"search": query})
        assert response.status_code == 200
        assert [row["id"] for row in response.json()["results"]] == [live.pk]
    brand.is_active = False
    brand.save()
    assert client.get("/api/v1/products/", {"search": "phone"}).json()["count"] == 0
    brand.is_active = True
    brand.save()
    category.is_active = False
    category.save()
    assert client.get("/api/v1/products/", {"search": "phone"}).json()["count"] == 0


@pytest.mark.parametrize(
    "name,query", [("Wireless Earbuds", "earphones"), ("Gaming Laptop", "notebooks")]
)
def test_additional_synonym_groups(catalog, owner_client, name, query):
    _, _, live, _ = catalog
    live.name = name
    live.save()
    products = [row for row in owner_client.get(URL, {"q": query}).json()["results"]
                if row["kind"] == "product"]
    assert [row["id"] for row in products] == [live.pk]


def test_scoped_management_search_is_case_insensitive(catalog, owner_client):
    brand, _, live, draft = catalog
    for query in ["GALAXY", "gAlAxY", "galaxy"]:
        response = owner_client.get("/api/v1/management/products/", {
            "search": query, "brand": brand.pk,
        })
        assert response.status_code == 200
        assert [row["id"] for row in response.json()["results"]] == [live.pk]
    response = owner_client.get("/api/v1/management/products/", {"search": "x" * 121})
    assert response.status_code == 400
