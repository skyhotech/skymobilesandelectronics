import pytest
from django.contrib.auth.models import User
from django.test import Client

from apps.brands.models import Brand
from apps.categories.hierarchy import published_categories
from apps.categories.models import Category
from apps.products.models import Product

pytestmark = pytest.mark.django_db
URL = "/api/v1/management/overview/"


@pytest.fixture
def owner_client():
    owner = User.objects.create_superuser(username="overview-owner", password="test-only")
    client = Client(enforce_csrf_checks=True)
    client.force_login(owner)
    token = client.get("/api/v1/management/session/").json()["csrfToken"]
    client.defaults["HTTP_X_CSRFTOKEN"] = token
    return client


def test_overview_counts_real_records_and_publication_rules(owner_client):
    Brand.objects.all().delete()
    live = Brand.objects.create(
        name="Visible", slug="visible", logo="brands/live.webp", show_on_homepage=True,
    )
    Brand.objects.create(name="Hidden", slug="hidden", logo="brands/hidden.webp")
    Brand.objects.create(name="No logo", slug="no-logo", show_on_homepage=True)
    Brand.objects.create(
        name="Inactive", slug="inactive", logo="brands/inactive.webp",
        show_on_homepage=True, is_active=False,
    )
    # Seed categories may exist: record their actual baseline rather than removing trees.
    total = Category.objects.count()
    active = Category.objects.filter(is_active=True).count()
    homepage = len(published_categories())
    parent = Category.objects.create(
        name="Overview parent", slug="overview-parent", image="categories/parent.webp",
        show_on_homepage=True,
    )
    Category.objects.create(
        name="Overview child", slug="overview-child", parent=parent,
        image="categories/child.webp", show_on_homepage=True,
    )
    hidden = Category.objects.create(name="Overview hidden", slug="overview-hidden")
    Category.objects.create(
        name="Overview suppressed child", slug="overview-suppressed-child", parent=hidden,
        image="categories/child.webp", show_on_homepage=True,
    )
    Category.objects.create(name="Overview inactive", slug="overview-inactive", is_active=False)
    Product.objects.create(
        sku="OV-A", name="Active", slug="overview-active", price="100.00",
        brand=live, category=parent, is_active=True,
    )
    Product.objects.create(
        sku="OV-D", name="Draft", slug="overview-draft", price="100.00",
        brand=live, category=parent,
    )
    response = owner_client.get(URL)
    assert response.status_code == 200
    assert "no-store" in response["Cache-Control"]
    payload = response.json()
    recent = payload.pop("recent_products")
    assert [row["name"] for row in recent] == ["Draft", "Active"]
    assert all(row["brand_name"] == "Visible" for row in recent)
    assert payload == {
        "brands": {"total": 4, "active": 3, "homepage": 1},
        "categories": {"total": total + 5, "active": active + 4, "homepage": homepage + 2},
        "products": {"total": 2, "active": 1, "published": 1, "missing_images": 2},
    }


def test_overview_rejects_anonymous_and_non_owner():
    client = Client()
    assert client.get(URL).status_code == 403
    staff = User.objects.create_user(username="overview-staff", is_staff=True)
    client.force_login(staff)
    assert client.get(URL).status_code == 403


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
def test_overview_is_read_only(owner_client, method):
    response = getattr(owner_client, method)(URL, {}, content_type="application/json")
    assert response.status_code == 405


def test_overview_recent_products_are_bounded_and_publication_matches_catalog(owner_client):
    brand = Brand.objects.create(name="Recent", slug="recent", is_active=False)
    category = Category.objects.create(name="Recent", slug="recent")
    rows = [Product.objects.create(
        sku=f"REC-{index}", name=f"Recent {index}", slug=f"recent-{index}", price="100",
        brand=brand, category=category, is_active=True, image="products/test.webp",
    ) for index in range(7)]
    response = owner_client.get(URL).json()
    assert response["products"] == {
        "total": 7, "active": 7, "published": 0, "missing_images": 0,
    }
    assert [row["id"] for row in response["recent_products"]] == [row.pk for row in rows[-5:][::-1]]
    rows[0].name = "Updated first"
    rows[0].save()
    assert owner_client.get(URL).json()["recent_products"][0]["id"] == rows[0].pk
