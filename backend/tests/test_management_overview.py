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
    assert response.json() == {
        "brands": {"total": 4, "active": 3, "homepage": 1},
        "categories": {"total": total + 5, "active": active + 4, "homepage": homepage + 2},
        "products": {"total": 2, "active": 1},
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
