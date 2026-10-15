import pytest
from django.contrib.auth.models import User
from django.test import Client

from apps.brands.models import Brand

pytestmark = pytest.mark.django_db
MOVE = "/api/v1/management/brands/move/"


@pytest.fixture
def brands():
    return [Brand.objects.create(
        name=name, slug=name.lower(), logo=f"brands/{name}.webp", show_on_homepage=True,
        display_order=10,
    ) for name in ("Alpha", "Beta", "Gamma")]


@pytest.fixture
def owner_client():
    owner = User.objects.create_superuser(username="brand-order-owner", password="test-only")
    client = Client(enforce_csrf_checks=True)
    client.force_login(owner)
    token = client.get("/api/v1/management/session/").json()["csrfToken"]
    client.defaults["HTTP_X_CSRFTOKEN"] = token
    return client


def test_move_before_and_end_updates_feed_etag_and_management_order(brands, owner_client):
    first = Client().get("/api/v1/brands/")
    response = owner_client.post(MOVE, {"id": brands[2].pk, "before": brands[0].pk},
                                 content_type="application/json")
    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == [brands[2].pk, brands[0].pk, brands[1].pk]
    positions = Brand.objects.order_by("display_order").values_list("display_order", flat=True)
    assert list(positions) == [0, 1, 2]
    feed = Client().get("/api/v1/brands/", HTTP_IF_NONE_MATCH=first["ETag"])
    assert feed.status_code == 200
    assert feed["ETag"] != first["ETag"]
    assert [row["id"] for row in feed.json()] == [brands[2].pk, brands[0].pk, brands[1].pk]
    response = owner_client.post(MOVE, {"id": brands[2].pk, "before": None},
                                 content_type="application/json")
    assert response.status_code == 200
    listing = owner_client.get("/api/v1/management/brands/").json()["results"]
    assert [row["id"] for row in listing] == [brand.pk for brand in brands]


@pytest.mark.parametrize(
    "invalid", ["missing_id", "missing_before", "self", "negative", "omitted_before"]
)
def test_invalid_move_preserves_all_positions(brands, owner_client, invalid):
    payload = {"id": brands[0].pk, "before": brands[1].pk}
    if invalid == "missing_id":
        payload["id"] = 999999
    elif invalid == "missing_before":
        payload["before"] = 999999
    elif invalid == "self":
        payload["before"] = brands[0].pk
    elif invalid == "negative":
        payload["id"] = -1
    else:
        del payload["before"]
    before = list(Brand.objects.values_list("id", "display_order"))
    assert owner_client.post(MOVE, payload, content_type="application/json").status_code == 400
    assert list(Brand.objects.values_list("id", "display_order")) == before


def test_move_requires_owner_and_csrf(brands, owner_client):
    payload = {"id": brands[0].pk, "before": None}
    assert Client().post(MOVE, payload, content_type="application/json").status_code == 403
    staff = User.objects.create_user(username="brand-staff", password="test-only", is_staff=True)
    client = Client()
    client.force_login(staff)
    assert client.post(MOVE, payload, content_type="application/json").status_code == 403
    del owner_client.defaults["HTTP_X_CSRFTOKEN"]
    assert owner_client.post(MOVE, payload, content_type="application/json").status_code == 403
    assert list(Brand.objects.values_list("display_order", flat=True)) == [10, 10, 10]
