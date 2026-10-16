from unittest.mock import patch

import pytest
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.test import Client

from apps.products.management_api import ManagementLoginThrottle

pytestmark = pytest.mark.django_db
URL = "/api/v1/hr/session/"


@pytest.fixture
def hr_user():
    cache.clear()
    user = User.objects.create_user("hr-test", password="test-only-hr-password")
    user.groups.add(Group.objects.create(name="HR"))
    return user


def test_hr_login_csrf_logout_and_admin_separation(hr_user):
    client = Client(enforce_csrf_checks=True)
    bootstrap = client.get(URL)
    assert bootstrap.json()["user"] is None
    assert "no-store" in bootstrap["Cache-Control"]
    credentials = {"username": hr_user.username, "password": "test-only-hr-password"}
    assert client.post(URL, credentials).status_code == 403
    client.defaults["HTTP_X_CSRFTOKEN"] = bootstrap.json()["csrfToken"]
    login = client.post(URL, credentials)
    assert login.status_code == 200
    assert login.json()["user"] == {"username": hr_user.username}
    assert client.get("/api/v1/management/overview/").status_code == 403
    client.defaults["HTTP_X_CSRFTOKEN"] = login.json()["csrfToken"]
    assert client.delete(URL).json()["user"] is None
    assert client.get(URL).json()["user"] is None


def test_hr_rejects_inactive_non_hr_and_owner_without_membership(hr_user, client):
    assert client.post(URL, {"username": hr_user.username, "password": "wrong"}).status_code == 400
    for name, flags in [("normal", {}), ("owner", {"is_staff": True, "is_superuser": True})]:
        user = User.objects.create_user(name, password="test-only-hr-password", **flags)
        assert client.post(URL, {
            "username": user.username, "password": "test-only-hr-password",
        }).status_code == 400
    hr_user.is_active = False
    hr_user.save()
    assert client.post(URL, {
        "username": hr_user.username, "password": "test-only-hr-password",
    }).status_code == 400


def test_revoked_group_is_not_an_hr_session(hr_user, client):
    client.force_login(hr_user)
    assert client.get(URL).json()["user"] is not None
    hr_user.groups.clear()
    assert client.get(URL).json()["user"] is None


def test_hr_login_is_throttled(hr_user, client, settings):
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"management_login": "1/min"},
    }
    # The shared login throttle already has its explicit configured scope/rate.
    with patch.object(ManagementLoginThrottle, "rate", "1/min"):
        assert client.post(URL, {"username": "missing", "password": "wrong"}).status_code == 400
        assert client.post(URL, {"username": "missing", "password": "wrong"}).status_code == 429
