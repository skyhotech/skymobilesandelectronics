from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import DataError, IntegrityError, connection, transaction
from django.urls import reverse

from apps.branches.models import Branch
from apps.brands.models import Brand
from apps.categories.models import Category
from apps.inventory.models import Stock
from apps.products.models import Product


@pytest.fixture
def product(db):
    return Product.objects.create(
        name="Test phone",
        sku="TEST-01",
        slug="test-phone",
        price=Decimal("10000.25"),
        brand=Brand.objects.create(name="Test brand", slug="test-brand"),
        category=Category.objects.create(name="Phones", slug="phones"),
    )


@pytest.fixture
def branch(db):
    return Branch.objects.create(
        name="Test branch", code="test", address="Test road", city="Vellore"
    )


@pytest.mark.django_db
def test_price_validation_and_database_constraints(product):
    product.compare_at_price = Decimal("9999")
    with pytest.raises(ValidationError):
        product.full_clean()
    with pytest.raises(IntegrityError), transaction.atomic():
        Product.objects.filter(pk=product.pk).update(price=0)
    with pytest.raises(IntegrityError), transaction.atomic():
        Product.objects.filter(pk=product.pk).update(currency="USD")
    with pytest.raises(IntegrityError), transaction.atomic():
        Product.objects.create(
            sku=product.sku,
            name="Duplicate",
            slug="duplicate",
            price=100,
            brand=product.brand,
            category=product.category,
        )


@pytest.mark.django_db
def test_stock_cannot_oversubscribe_or_duplicate(product, branch):
    stock = Stock.objects.create(product=product, branch=branch, quantity=10, reserved=3)
    assert stock.available == 7
    with pytest.raises(IntegrityError), transaction.atomic():
        Stock.objects.filter(pk=stock.pk).update(quantity=2)
    # MySQL unsigned integers reject negatives as DataError before CHECK evaluation.
    negative_error = DataError if connection.vendor == "mysql" else IntegrityError
    with pytest.raises(negative_error), transaction.atomic():
        Stock.objects.filter(pk=stock.pk).update(quantity=-1)
    stock.refresh_from_db()
    assert stock.quantity == 10
    with pytest.raises(IntegrityError), transaction.atomic():
        Stock.objects.create(product=product, branch=branch)


@pytest.mark.django_db
def test_admin_permissions_and_product_crud(client, product):
    url = reverse("admin:products_product_changelist")
    assert client.get(url).status_code == 302
    staff = User.objects.create_user(username="staff-test", is_staff=True)
    client.force_login(staff)
    assert client.get(url).status_code == 403
    owner = User.objects.create_superuser(username="owner-test", password="test-only")
    client.force_login(owner)
    assert client.get(url).status_code == 200
    change_url = reverse("admin:products_product_change", args=[product.pk])
    response = client.post(
        change_url,
        {
            "name": "Updated phone",
            "sku": product.sku,
            "slug": product.slug,
            "brand": product.brand_id,
            "category": product.category_id,
            "price": "12345.67",
            "compare_at_price": "15000.00",
            "currency": "INR",
            "is_active": "on",
            "_save": "Save",
        },
    )
    assert response.status_code == 302
    product.refresh_from_db()
    assert product.name == "Updated phone"
    assert product.price == Decimal("12345.67")


@pytest.mark.django_db
def test_admin_rejects_quantity_below_reserved(client, product, branch):
    owner = User.objects.create_superuser(username="stock-owner", password="test-only")
    stock = Stock.objects.create(product=product, branch=branch, quantity=10, reserved=4)
    client.force_login(owner)
    response = client.post(
        reverse("admin:inventory_stock_change", args=[stock.pk]),
        {
            "product": product.pk,
            "branch": branch.pk,
            "quantity": "3",
            "_save": "Save",
        },
    )
    assert response.status_code == 200
    stock.refresh_from_db()
    assert stock.quantity == 10
