import pytest
from django.test import Client

from apps.categories.models import Category


@pytest.fixture
def owner(db, django_user_model):
    client = Client()
    client.force_login(django_user_model.objects.create_superuser(username="subcat-owner", password="test-only"))
    return client


def test_subcategory_crud_and_cycle_protection(owner):
    base = "/api/v1/management/categories/"
    root = Category.objects.create(name="Custom devices", slug="custom-devices")
    response = owner.post(base, {"name": "Custom earbuds", "slug": "custom-earbuds", "parent": root.pk}, content_type="application/json")
    assert response.status_code == 201
    child = response.json()
    assert child["parent"] == root.pk
    assert child["parent_name"] == root.name
    assert owner.patch(f"{base}{root.pk}/", {"parent": child["id"]}, content_type="application/json").status_code == 400
    assert owner.patch(f"{base}{child['id']}/", {"parent": child["id"]}, content_type="application/json").status_code == 400
    nested = owner.post(base, {"name": "Nested audio", "slug": "nested-audio", "parent": child["id"]}, content_type="application/json")
    assert nested.status_code == 201
    assert owner.delete(f"{base}{root.pk}/").status_code == 409
    assert owner.delete(f"{base}{nested.json()['id']}/").status_code == 204
    assert owner.delete(f"{base}{child['id']}/").status_code == 204
    assert owner.delete(f"{base}{root.pk}/").status_code == 204


def test_hidden_parent_hides_children(owner):
    root = Category.objects.create(name="Visible parent", slug="visible-parent", image="categories/test.webp", show_on_homepage=True)
    child = Category.objects.create(name="Visible child", slug="visible-child", parent=root, image="categories/test.webp", show_on_homepage=True)
    def visible_ids():
        return [item["id"] for item in Client().get("/api/v1/categories/").json()["results"]]
    assert child.pk in visible_ids()
    root.is_active = False
    root.save()
    assert child.pk not in visible_ids()
