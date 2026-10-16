"""Owner-only APX customer lookup; mobile numbers stay out of local URL logs."""
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import ProxyHandler, Request, build_opener

from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.apx import NoRedirect
from apps.products.management_api import OwnerPermission


class CustomerServiceError(APIException):
    status_code = 502
    default_detail = "APX could not return customer information. Please try again later."


class CustomerLookupInput(serializers.Serializer):
    mobile = serializers.RegexField(r"^\+?[0-9]{7,15}$", max_length=16)


class CustomerLookupOutput(serializers.Serializer):
    columns = serializers.ListField(child=serializers.CharField())
    rows = serializers.ListField(child=serializers.ListField(child=serializers.CharField()))


def fetch_customers(mobile):
    if not all((settings.APX_COMPANY_CODE, settings.APX_USER_ID, settings.APX_SECURITY_CODE)):
        error = CustomerServiceError(
            "Customer lookup is not connected yet. Contact your administrator."
        )
        error.status_code = 503
        raise error
    base = settings.APX_API_BASE_URL.rstrip("/")
    parsed = urlsplit(base)
    if (parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username
            or parsed.password or parsed.query or parsed.fragment):
        raise CustomerServiceError()
    query = urlencode({"CompanyCode": settings.APX_COMPANY_CODE, "MobileNo": mobile})
    request = Request(base + "/api/apxapi/GetCustomerList?" + query, headers={
        "Accept": "application/json", "UserId": settings.APX_USER_ID,
        "SecurityCode": settings.APX_SECURITY_CODE,
    }, method="GET")
    try:
        with build_opener(ProxyHandler({}), NoRedirect()).open(request, timeout=15) as response:
            raw = response.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise CustomerServiceError()
            envelope = json.loads(raw)
    except (HTTPError, URLError, TimeoutError, OSError, ValueError):
        raise CustomerServiceError() from None
    if (not isinstance(envelope, dict) or isinstance(envelope.get("StatusCode"), bool)
            or envelope.get("StatusCode") not in (0, "0")):
        raise CustomerServiceError()
    if envelope.get("StatusMessage") == "NoRecordFoundSuccess":
        return {"columns": [], "rows": []}
    records = envelope.get("Data")
    if envelope.get("StatusMessage") != "Success" or not isinstance(records, list):
        raise CustomerServiceError()
    if len(records) > 200 or any(not isinstance(row, dict) for row in records):
        raise CustomerServiceError()
    columns = list(dict.fromkeys(key for row in records for key in row if not any(
        blocked in key.lower() for blocked in ("password", "secret", "token", "securitycode")
    )))
    if len(columns) > 100:
        raise CustomerServiceError()
    rows = []
    for row in records:
        values = [row.get(key) for key in columns]
        if any(value is not None and not isinstance(value, (str, bool, int, float))
               for value in values):
            raise CustomerServiceError()
        rows.append(["" if value is None else str(value)[:4000] for value in values])
    return {"columns": columns, "rows": rows}


@method_decorator(never_cache, name="dispatch")
class CustomerLookup(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [OwnerPermission]

    @extend_schema(request=CustomerLookupInput, responses={200: CustomerLookupOutput})
    def post(self, request):
        payload = CustomerLookupInput(data=request.data)
        payload.is_valid(raise_exception=True)
        result = fetch_customers(payload.validated_data["mobile"])
        return Response(CustomerLookupOutput(result).data)
