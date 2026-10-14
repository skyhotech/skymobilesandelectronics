from unittest.mock import patch

import pytest


def test_liveness_does_not_require_dependencies(client):
    response = client.get("/api/v1/health/live/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.django_db
def test_readiness_reports_dependency_failure(client):
    with patch("api.v1.health.Redis.from_url", side_effect=ConnectionError("private detail")):
        response = client.get("/api/v1/health/ready/")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
