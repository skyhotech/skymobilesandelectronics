import logging
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.test import Client

from config.settings import development


@pytest.mark.parametrize("origin", development.LOCAL_FRONTEND_ORIGINS)
def test_local_alias_reaches_login_but_still_requires_csrf(origin, settings):
    settings.CSRF_TRUSTED_ORIGINS = development.CSRF_TRUSTED_ORIGINS
    client = Client(enforce_csrf_checks=True)
    url = "/api/v1/management/session/"
    client.get(url)
    payload = {"username": "origin-test", "password": "test-only"}
    cache.clear()
    with patch("apps.products.management_api.authenticate", return_value=None) as auth:
        assert client.post(url, payload, HTTP_ORIGIN=origin).status_code == 403
        auth.assert_not_called()
        response = client.post(
            url,
            payload,
            HTTP_ORIGIN=origin,
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid owner credentials."
    auth.assert_called_once()
    cache.clear()


@pytest.mark.parametrize("origin", ["https://attacker.invalid", "http://localhost:3001"])
def test_local_alias_allowlist_does_not_trust_other_origins(origin, settings):
    settings.CSRF_TRUSTED_ORIGINS = development.CSRF_TRUSTED_ORIGINS
    client = Client(enforce_csrf_checks=True)
    client.get("/api/v1/management/session/")
    with patch("apps.products.management_api.authenticate") as auth:
        response = client.post(
            "/api/v1/management/session/",
            {"username": "test", "password": "test"},
            HTTP_ORIGIN=origin,
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )
    assert response.status_code == 403
    auth.assert_not_called()


def test_django_log_records_reach_console_once():
    logger = logging.getLogger("django")
    handler = next(handler for handler in logger.handlers if handler.name == "console")
    with patch.object(handler, "emit") as emit:
        logging.getLogger("django.utils.autoreload").warning("Regression check")
    assert emit.call_count == 1
