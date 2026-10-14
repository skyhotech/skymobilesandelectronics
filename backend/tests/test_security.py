import pytest
from django.test import Client


@pytest.mark.django_db
def test_session_login_requires_csrf_and_rejects_foreign_origin(django_user_model):
    django_user_model.objects.create_superuser(username="security-owner", password="test-only-pass")
    client = Client(enforce_csrf_checks=True)
    url = "/api/v1/management/session/"
    client.get(url)
    token = client.cookies["csrftoken"].value
    payload = {"username": "security-owner", "password": "test-only-pass"}
    denied = client.post(url, payload)
    assert denied.status_code == 403
    assert "detail" in denied.json()
    assert client.post(url, payload, HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN="https://attacker.invalid").status_code == 403
    response = client.post(url, payload, HTTP_X_CSRFTOKEN=token)
    assert response.status_code == 200
    cookie = response.cookies["sessionid"]
    assert cookie["httponly"]
    assert cookie["samesite"] == "Lax"
    assert not cookie["domain"]
    assert client.cookies["csrftoken"].value != token
    # Login rotates the CSRF token, preventing reuse of the pre-login token.
    assert client.delete(url, HTTP_X_CSRFTOKEN=token).status_code == 403
    assert client.delete(url, HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value).status_code == 200
    assert client.get("/api/v1/management/products/").status_code == 403


def test_security_headers_apply_even_to_denied_routes(client):
    response = client.get("/api/v1/management/products/")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]


@pytest.mark.django_db
def test_expired_session_cannot_access_management(client, django_user_model):
    from django.contrib.sessions.models import Session
    from django.utils import timezone
    from datetime import timedelta

    user = django_user_model.objects.create_superuser(username="expired-owner", password="test-only")
    client.force_login(user)
    Session.objects.filter(session_key=client.cookies["sessionid"].value).update(expire_date=timezone.now() - timedelta(seconds=1))
    assert client.get("/api/v1/management/products/").status_code == 403
