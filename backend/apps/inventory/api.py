from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.products.management_api import OwnerPermission

from .apx import closing_stock_report


class InventoryReportSerializer(serializers.Serializer):
    columns = serializers.ListField(child=serializers.CharField())
    rows = serializers.ListField(
        child=serializers.ListField(child=serializers.CharField(allow_blank=True))
    )


@method_decorator(never_cache, name="dispatch")
class InventoryReport(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [OwnerPermission]

    @extend_schema(responses={200: InventoryReportSerializer})
    def get(self, request):
        return Response(InventoryReportSerializer(closing_stock_report()).data)
