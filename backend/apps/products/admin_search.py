"""Small owner-only search feed across existing management records."""

from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.brands.models import Brand
from apps.categories.models import Category
from common.search import search_queryset, search_tokens

from .management_api import OwnerPermission
from .models import Product


class ManagementSearchQuery(serializers.Serializer):
    q = serializers.CharField(max_length=120, allow_blank=True, default="")


class ManagementSearchResult(serializers.Serializer):
    kind = serializers.ChoiceField(choices=("brand", "category", "product"))
    id = serializers.IntegerField(min_value=1)
    name = serializers.CharField()
    brand_id = serializers.IntegerField(min_value=1, allow_null=True)


class ManagementSearchResponse(serializers.Serializer):
    results = ManagementSearchResult(many=True)


@method_decorator(never_cache, name="dispatch")
class ManagementSearch(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [OwnerPermission]

    @extend_schema(parameters=[ManagementSearchQuery], responses={200: ManagementSearchResponse})
    def get(self, request):
        payload = ManagementSearchQuery(data=request.query_params)
        payload.is_valid(raise_exception=True)
        query = payload.validated_data["q"]
        results = []
        if len("".join(search_tokens(query))) >= 2:
            entities = (
                ("brand", Brand, ("name", "slug")),
                ("category", Category, ("name", "slug", "description")),
                ("product", Product, (
                    "name", "slug", "description", "sku", "brand__name", "category__name",
                )),
            )
            for kind, model, fields in entities:
                matches = search_queryset(model.objects.all(), query, fields).order_by("name", "id")
                for row in matches[:8]:
                    results.append({
                        "kind": kind, "id": row.pk, "name": row.name,
                        "brand_id": row.brand_id if kind == "product" else None,
                    })
        return Response(ManagementSearchResponse({"results": results}).data)
