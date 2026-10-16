"""Server-side, read-only APX closing stock report adapter."""
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from django.conf import settings
from rest_framework.exceptions import APIException


class InventoryUnavailable(APIException):
    status_code = 503
    default_detail = "Inventory is not connected yet. Contact your administrator."


class InvalidInventoryResponse(APIException):
    status_code = 502
    default_detail = "APX could not return a valid inventory report. Please try again later."


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def normalize_report(envelope):
    if (not isinstance(envelope, dict) or isinstance(envelope.get("StatusCode"), bool)
            or envelope.get("StatusCode") not in (0, "0")):
        raise InvalidInventoryResponse(
            "APX rejected the inventory request. Contact your administrator."
        )
    status = envelope.get("StatusMessage")
    if status == "NoRecordFoundSuccess":
        return {"columns": [], "rows": []}
    if status in ("DownloadSuccess", "ForcedDownloadSuccess"):
        raise InvalidInventoryResponse("APX returned a download instead of inventory table data.")
    data = envelope.get("Data")
    if status != "Success" or not isinstance(data, list):
        raise InvalidInventoryResponse()
    if not data:
        return {"columns": [], "rows": []}
    if len(data) > 10001:
        raise InvalidInventoryResponse(
            "The inventory report is too large. Narrow its server-side scope."
        )
    header = data[0]
    if isinstance(header, list):
        header = dict(enumerate(header))
    if not isinstance(header, dict) or len(header) > 100:
        raise InvalidInventoryResponse()
    keys = [key for key, label in header.items() if label is not None
            and str(label).strip().lower() != "hidden"
            and str(key) not in {"ISALIGN", "IS_GROUP_TOTAL_ROW", "IS_REPORT_TOTAL_ROW"}]
    columns = [str(header[key])[:200] for key in keys]
    if not columns:
        raise InvalidInventoryResponse()
    rows = []
    for record in data[1:]:
        if isinstance(record, list):
            record = dict(enumerate(record))
        if not isinstance(record, dict):
            raise InvalidInventoryResponse()
        values = [record.get(key) for key in keys]
        if any(value is not None and not isinstance(value, (str, int, float, bool))
               for value in values):
            raise InvalidInventoryResponse()
        rows.append(["" if value is None else str(value)[:4000] for value in values])
    return {"columns": columns, "rows": rows}


def closing_stock_report():
    user = settings.APX_USER_ID
    secret = settings.APX_SECURITY_CODE
    raw_body = settings.APX_CLOSING_STOCK_BODY
    if not user or not secret or not raw_body:
        raise InventoryUnavailable()
    try:
        payload = json.loads(raw_body)
        base = settings.APX_API_BASE_URL.rstrip("/")
        parsed = urlsplit(base)
        if (not isinstance(payload, dict) or parsed.scheme not in ("http", "https")
                or not parsed.hostname or parsed.username or parsed.password
                or parsed.query or parsed.fragment):
            raise ValueError()
        payload["DownloadReport"] = False
        body = json.dumps(payload, allow_nan=False).encode()
        if len(body) > 65536:
            raise ValueError()
    except (ValueError, TypeError):
        raise InventoryUnavailable() from None
    request = Request(base + "/api/Report/ClosingStockBreakupReport", data=body,
                      headers={"Content-Type": "application/json", "UserId": user,
                               "SecurityCode": secret}, method="POST")
    try:
        with build_opener(ProxyHandler({}), NoRedirect()).open(request, timeout=15) as response:
            raw = response.read(8 * 1024 * 1024 + 1)
            if len(raw) > 8 * 1024 * 1024:
                raise InvalidInventoryResponse("The inventory report is too large.")
            envelope = json.loads(raw)
    except (HTTPError, URLError, TimeoutError, OSError):
        raise InventoryUnavailable(
            "Inventory service is unavailable. Please try again later."
        ) from None
    except (ValueError, UnicodeError):
        raise InvalidInventoryResponse() from None
    return normalize_report(envelope)
