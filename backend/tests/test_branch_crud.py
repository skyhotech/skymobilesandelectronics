import pytest
from django.contrib.auth.models import Group, User
from django.test import Client

from apps.branches.models import Branch
from apps.brands.models import Brand
from apps.categories.models import Category
from apps.inventory.models import Stock
from apps.products.models import Product

pytestmark = pytest.mark.django_db
URL = "/api/v1/hr/branches/"


def test_branch_crud_csrf_duplicates_and_permissions():
    client = Client(enforce_csrf_checks=True)
    payload = {"name": "Arni-4", "code": "ARNI-4", "city": "ARNI"}
    assert client.post(URL, payload).status_code == 403
    user = User.objects.create_user("branch-editor")
    client.force_login(user)
    assert client.post(URL, payload).status_code == 403
    user.groups.add(Group.objects.create(name="HR"))
    assert client.post(URL, payload).status_code == 403
    client.defaults["HTTP_X_CSRFTOKEN"] = client.get("/api/v1/hr/session/").json()["csrfToken"]
    created = client.post(URL, payload)
    assert created.status_code == 201
    branch = Branch.objects.get()
    assert branch.code == "arni-4"
    detail = f"{URL}{branch.id}/"
    assert client.get(detail).json()["name"] == "Arni-4"
    assert client.post(URL, {**payload, "name": "Different"}).status_code == 400
    assert (
        client.post(
            URL, {**payload, "code": "other", "name": " arni-4 ", "city": "arni"}
        ).status_code
        == 400
    )
    assert client.post(URL, {**payload, "name": "Arni-5", "code": "arni-5"}).status_code == 201
    assert (
        client.patch(
            detail, {"phone": "1234567890", "is_active": False}, content_type="application/json"
        ).status_code
        == 200
    )
    branch.refresh_from_db()
    assert not branch.is_active
    assert branch.phone == "1234567890"
    assert client.delete(detail).status_code == 204
    assert client.get(detail).status_code == 404


def test_inventory_branch_cannot_be_deleted(client):
    user = User.objects.create_user("branch-protect")
    user.groups.add(Group.objects.create(name="HR"))
    client.force_login(user)
    branch = Branch.objects.create(name="Protected", code="protected")
    brand = Brand.objects.create(name="Brand", slug="brand")
    category = Category.objects.create(name="Category", slug="category")
    product = Product.objects.create(
        name="Product", sku="product", slug="product", brand=brand, category=category, price="100"
    )
    Stock.objects.create(branch=branch, product=product, quantity=1)
    response = client.delete(f"{URL}{branch.id}/")
    assert response.status_code == 409
    assert Branch.objects.filter(pk=branch.pk).exists()
    assert Stock.objects.count() == 1
