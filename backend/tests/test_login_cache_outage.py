from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.test import Client
from redis.exceptions import ConnectionError, ResponseError, TimeoutError


@pytest.mark.parametrize("operation", ["get", "set"])
@pytest.mark.parametrize("error", [ConnectionError, TimeoutError, ResponseError])
def test_login_cache_outage_fails_closed_with_retry_after(operation, error):
    client = Client(enforce_csrf_checks=True)
    url = "/api/v1/management/session/"
    client.get(url)
    token = client.cookies["csrftoken"].value
    cache.clear()
    with (
        patch.object(cache, operation, side_effect=error("private connection details")),
        patch("apps.products.management_api.authenticate") as authenticate,
    ):
        response = client.post(
            url,
            {"username": "test-owner", "password": "test-only"},
            HTTP_X_CSRFTOKEN=token,
        )
    assert response.status_code == 503
    assert response.headers["Retry-After"] == "10"
    assert "temporarily unavailable" in response.json()["detail"]
    assert "private connection details" not in response.content.decode()
    assert "no-store" in response.headers["Cache-Control"]
    assert "sessionid" not in response.cookies
    authenticate.assert_not_called()


def test_session_bootstrap_does_not_require_redis():
    with patch.object(cache, "get", side_effect=TimeoutError):
        response = Client().get("/api/v1/management/session/")
    assert response.status_code == 200
    assert response.json()["user"] is None


def test_healthy_cache_still_limits_login_attempts():
    cache.clear()
    client = Client()
    with patch("apps.products.management_api.authenticate", return_value=None):
        for _ in range(10):
            assert (
                client.post(
                    "/api/v1/management/session/", {"username": "test", "password": "test"}
                ).status_code
                == 400
            )
        response = client.post(
            "/api/v1/management/session/", {"username": "test", "password": "test"}
        )
    assert response.status_code == 429
    assert int(response.headers["Retry-After"]) > 0
    cache.clear()
