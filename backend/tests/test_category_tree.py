import pytest
from django.test import Client

from apps.categories.models import Category, CategoryTreeState


@pytest.fixture
def owner(db, django_user_model):
    client = Client()
    client.force_login(django_user_model.objects.create_superuser(username="tree-owner", password="test-only"))
    return client


def node(name, parent=None):
    return Category.objects.create(name=name, slug=name, parent=parent, image="categories/test.webp", show_on_homepage=True)


def test_moves_preserve_branches_and_reject_cycles_and_stale_writes(owner):
    root, other = node("root"), node("other")
    child = node("child", root)
    leaf = node("leaf", child)
    revision = CategoryTreeState.objects.get(pk=1).revision
    url = "/api/v1/management/categories/move/"
    response = owner.post(url, {"id": child.pk, "parent": other.pk, "revision": revision}, content_type="application/json")
    assert response.status_code == 200
    child.refresh_from_db()
    leaf.refresh_from_db()
    assert child.parent_id == other.pk
    assert leaf.parent_id == child.pk
    assert owner.post(url, {"id": root.pk, "parent": other.pk, "revision": revision}, content_type="application/json").status_code == 409
    revision = response.json()["revision"]
    assert owner.post(url, {"id": other.pk, "parent": leaf.pk, "revision": revision}, content_type="application/json").status_code == 400
    assert Category.objects.get(pk=other.pk).parent_id is None
    assert Client().post(url, {}).status_code == 403


def test_reorder_and_invalid_target_are_atomic(owner):
    root = node("main")
    first, second = node("first", root), node("second", root)
    revision = CategoryTreeState.objects.get(pk=1).revision
    url = "/api/v1/management/categories/move/"
    invalid = owner.post(url, {"id": second.pk, "parent": None, "before": first.pk, "revision": revision}, content_type="application/json")
    assert invalid.status_code == 400
    assert Category.objects.get(pk=second.pk).parent_id == root.pk
    valid = owner.post(url, {"id": second.pk, "parent": root.pk, "before": first.pk, "revision": revision}, content_type="application/json")
    assert valid.status_code == 200
    assert list(Category.objects.filter(parent=root).values_list("id", flat=True)) == [second.pk, first.pk]


def test_all_ancestors_control_visibility_and_etag_changes_after_admin_write(owner):
    root = node("live-root")
    child = node("live-child", root)
    leaf = node("live-leaf", child)
    url = "/api/v1/categories/tree/"
    response = Client().get(url)
    assert leaf.pk in [item["id"] for item in response.json()["nodes"]]
    etag = response.headers["ETag"]
    assert Client().get(url, HTTP_IF_NONE_MATCH=etag).status_code == 304
    assert owner.patch(f"/api/v1/management/categories/{root.pk}/", {"is_active": False}, content_type="application/json").status_code == 200
    response = Client().get(url, HTTP_IF_NONE_MATCH=etag)
    assert response.status_code == 200
    assert leaf.pk not in [item["id"] for item in response.json()["nodes"]]
    assert response.headers["ETag"] != etag


def test_depth_limit_includes_descendants_of_moved_branch(owner):
    parent = None
    for i in range(12):
        parent = node(f"depth-{i}", parent)
    response = owner.post("/api/v1/management/categories/", {"name": "Too deep", "slug": "too-deep", "parent": parent.pk}, content_type="application/json")
    assert response.status_code == 400
