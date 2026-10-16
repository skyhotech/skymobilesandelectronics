import pytest
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.test import Client

from apps.notifications.models import Broadcast

pytestmark = pytest.mark.django_db
URL = "/api/v1/hr/notifications/"


def test_broadcast_authorization_validation_and_persistence():
    cache.clear()
    client = Client(enforce_csrf_checks=True)
    assert client.get(URL).status_code == 403
    user = User.objects.create_user("broadcast-hr", password="test-only-password")
    client.force_login(user)
    assert client.get(URL).status_code == 403
    user.groups.add(Group.objects.create(name="HR"))
    csrf = client.get("/api/v1/hr/session/").json()["csrfToken"]
    assert client.post(URL, {"title": "Meeting", "message": "At 10"}).status_code == 403
    client.defaults["HTTP_X_CSRFTOKEN"] = csrf
    assert client.post(URL, {"title": " ", "message": "hello"}).status_code == 400
    assert client.post(URL, {"title": "x" * 121, "message": "hello"}).status_code == 400
    sent = client.post(URL, {"title": "Meeting", "message": "At 10", "sender_name": "fake"})
    assert sent.status_code == 201
    assert sent.json()["sender_name"] == user.username
    record = Broadcast.objects.get()
    assert record.sender == user
    other = User.objects.create_user("other-hr")
    other.groups.add(Group.objects.get(name="HR"))
    client.force_login(other)
    feed = client.get(URL)
    assert feed.json()[0]["id"] == record.id
    assert "no-store" in feed["Cache-Control"]
    other.groups.clear()
    assert client.get(URL).status_code == 403


def test_broadcast_limit_and_history_bound(client):
    cache.clear()
    user = User.objects.create_user("broadcast-limit")
    user.groups.add(Group.objects.create(name="HR"))
    client.force_login(user)
    for index in range(10):
        assert client.post(URL, {"title": "Notice", "message": str(index)}).status_code == 201
    assert client.post(URL, {"title": "Notice", "message": "Limited"}).status_code == 429
    Broadcast.objects.bulk_create(
        [Broadcast(title="Older", message="Test", sender=user) for _ in range(55)]
    )
    response = client.get(URL)
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert len(ids) == 50
    assert ids == sorted(ids, reverse=True)
