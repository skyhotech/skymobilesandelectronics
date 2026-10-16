import json
from io import BytesIO
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlsplit

import pytest
from django.contrib.auth.models import User
from django.test import Client

URL = "/api/v1/management/customers/lookup/"
pytestmark = pytest.mark.django_db


def test_customer_proxy_and_validation(client, settings):
    client.force_login(User.objects.create_superuser("customer-owner", password="test-only"))
    settings.APX_COMPANY_CODE = "test-company"
    settings.APX_USER_ID = "test-user"
    settings.APX_SECURITY_CODE = "test-secret"
    settings.APX_API_BASE_URL = "http://10.10.2.50:8080"
    opener = MagicMock()
    opener.open.return_value.__enter__.return_value = BytesIO(json.dumps({
        "StatusCode": 0, "StatusMessage": "Success", "Data": [
            {"Name": "Test customer", "Mobile": "+919876543210", "Password": "hidden"},
        ],
    }).encode())
    with patch("apps.accounts.apx_customers.build_opener", return_value=opener):
        response = client.post(URL, {"mobile": "+919876543210", "CompanyCode": "other"})
    assert response.status_code == 200
    assert "no-store" in response["Cache-Control"]
    assert response.json() == {
        "columns": ["Name", "Mobile"], "rows": [["Test customer", "+919876543210"]],
    }
    request = opener.open.call_args.args[0]
    assert request.get_method() == "GET"
    assert urlsplit(request.full_url).path == "/api/apxapi/GetCustomerList"
    assert parse_qs(urlsplit(request.full_url).query) == {
        "CompanyCode": ["test-company"], "MobileNo": ["+919876543210"],
    }
    assert request.get_header("Securitycode") == "test-secret"
    with patch("apps.accounts.apx_customers.build_opener") as outbound:
        assert client.post(URL, {"mobile": "invalid"}).status_code == 400
        outbound.assert_not_called()
        settings.APX_COMPANY_CODE = ""
        assert client.post(URL, {"mobile": "9876543210"}).status_code == 503
        outbound.assert_not_called()


def test_customer_permissions_and_csrf(client):
    assert client.post(URL, {"mobile": "9876543210"}).status_code == 403
    client.force_login(User.objects.create_user("customer-staff", is_staff=True))
    assert client.post(URL, {"mobile": "9876543210"}).status_code == 403
    owner = User.objects.create_superuser("csrf-owner", password="test-only")
    protected = Client(enforce_csrf_checks=True)
    protected.force_login(owner)
    assert protected.post(URL, {"mobile": "9876543210"}).status_code == 403


@pytest.mark.parametrize("code,message,data,expected", [
    (0, "NoRecordFoundSuccess", None, 200),
    (201, "Failed", None, 502),
    (0, "Success", "not a list", 502),
])
def test_customer_empty_and_business_failure(client, settings, code, message, data, expected):
    client.force_login(User.objects.create_superuser("result-owner", password="test-only"))
    settings.APX_COMPANY_CODE = "test-company"
    settings.APX_USER_ID = "test-user"
    settings.APX_SECURITY_CODE = "test-secret"
    opener = MagicMock()
    opener.open.return_value.__enter__.return_value = BytesIO(json.dumps({
        "StatusCode": code, "StatusMessage": message, "Data": data,
    }).encode())
    with patch("apps.accounts.apx_customers.build_opener", return_value=opener):
        assert client.post(URL, {"mobile": "9876543210"}).status_code == expected
