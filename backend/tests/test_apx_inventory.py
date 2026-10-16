import json
from io import BytesIO
from unittest.mock import MagicMock, patch
from urllib.error import URLError

import pytest
from django.contrib.auth.models import User

from apps.inventory.apx import InvalidInventoryResponse, normalize_report

URL = "/api/v1/management/inventory/"


def envelope(data, status="Success", code=0):
    return {"StatusCode": code, "StatusMessage": status, "Data": data}


def test_report_header_and_hidden_metadata_are_normalized():
    result = normalize_report(envelope([
        {"ITEM": "Item", "QTY": "Quantity", "CODE": "hidden", "ISALIGN": "Align"},
        {"ITEM": "Phone", "QTY": 12, "CODE": "internal", "ISALIGN": "TOTAL_ROW"},
        {"ITEM": "<script>unsafe</script>", "QTY": None},
    ]))
    assert result == {
        "columns": ["Item", "Quantity"],
        "rows": [["Phone", "12"], ["<script>unsafe</script>", ""]],
    }
    assert normalize_report(envelope([["Item", "Quantity"], ["Phone", 2]]))["rows"] == [
        ["Phone", "2"],
    ]
    assert normalize_report(envelope(None, "NoRecordFoundSuccess")) == {
        "columns": [], "rows": [],
    }


@pytest.mark.parametrize("value", [
    envelope(None, "Failed", 201), envelope(None), envelope({}, "Success"),
    envelope([], "DownloadSuccess"), envelope([], code=False),
    envelope([["Item"], [{"nested": "invalid"}]]),
])
def test_failed_and_invalid_apx_responses_are_not_inventory(value):
    with pytest.raises(InvalidInventoryResponse):
        normalize_report(value)


@pytest.mark.django_db
def test_owner_proxy_uses_fixed_post_and_server_scope(client, settings):
    client.force_login(User.objects.create_superuser("apx-owner", password="test-only"))
    settings.APX_USER_ID = "test-integration-user"
    settings.APX_SECURITY_CODE = "test-integration-secret"
    settings.APX_CLOSING_STOCK_BODY = '{"ApprovedBranch":"test-branch"}'
    settings.APX_API_BASE_URL = "http://10.10.2.50:8080"
    opener = MagicMock()
    opener.open.return_value.__enter__.return_value = BytesIO(json.dumps(envelope([
        {"ITEM": "Item", "QTY": "Stock"}, {"ITEM": "Phone", "QTY": 3},
    ])).encode())
    with patch("apps.inventory.apx.build_opener", return_value=opener):
        response = client.get(URL, {"url": "https://untrusted.example", "Branch": "other"})
    assert response.status_code == 200
    assert "no-store" in response["Cache-Control"]
    request = opener.open.call_args.args[0]
    assert request.get_method() == "POST"
    assert request.full_url == "http://10.10.2.50:8080/api/Report/ClosingStockBreakupReport"
    assert json.loads(request.data) == {"ApprovedBranch": "test-branch", "DownloadReport": False}
    assert request.get_header("Securitycode") == "test-integration-secret"
    assert "secret" not in response.content.decode()
    assert response.json()["rows"] == [["Phone", "3"]]
    with patch("apps.inventory.apx.build_opener", return_value=opener):
        opener.open.side_effect = URLError("private diagnostic")
        error = client.get(URL)
    assert error.status_code == 503
    assert "private diagnostic" not in error.content.decode()
    settings.APX_USER_ID = ""
    with patch("apps.inventory.apx.build_opener") as outbound:
        assert client.get(URL).status_code == 503
        outbound.assert_not_called()


@pytest.mark.django_db
def test_inventory_is_owner_only_and_read_only(client):
    assert client.get(URL).status_code == 403
    client.force_login(User.objects.create_user("apx-staff", is_staff=True))
    assert client.get(URL).status_code == 403
    client.force_login(User.objects.create_superuser("apx-admin", password="test-only"))
    assert client.post(URL, {}, content_type="application/json").status_code == 405
