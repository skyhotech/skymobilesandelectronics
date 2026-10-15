"""Read-only customer catalog backed by published business records."""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers

from apps.brands.models import Brand
from apps.categories.models import Category
from apps.media_library.api import MediaReferenceField
from common.search import search_queryset

from .models import Product


class CatalogBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name", "slug")


class CatalogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class CatalogProductSerializer(serializers.ModelSerializer):
    image_url = MediaReferenceField(source="image", read_only=True)
    brand = CatalogBrandSerializer(read_only=True)
    category = CatalogCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "description", "price", "compare_at_price",
            "currency", "image_url", "brand", "category",
        )


class CatalogFilters(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True, max_length=120)
    category = serializers.SlugField(required=False, max_length=140)
    brand = serializers.SlugField(required=False, max_length=140)
    ordering = serializers.ChoiceField(
        choices=("name", "-name", "price", "-price"), default="name"
    )


class CatalogMixin:
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = CatalogProductSerializer

    def get_queryset(self):
        return Product.objects.filter(
            is_active=True, brand__is_active=True, category__is_active=True
        ).select_related("brand", "category")


class ProductList(CatalogMixin, generics.ListAPIView):
    @extend_schema(parameters=[CatalogFilters])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        filters = CatalogFilters(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        values = filters.validated_data
        queryset = super().get_queryset()
        if values.get("search"):
            queryset = search_queryset(queryset, values["search"], (
                "name", "description", "sku", "brand__name", "category__name",
            ))
        if values.get("category"):
            queryset = queryset.filter(category__slug=values["category"])
        if values.get("brand"):
            queryset = queryset.filter(brand__slug=values["brand"])
        return queryset.order_by(values["ordering"], "id")


class ProductDetail(CatalogMixin, generics.RetrieveAPIView):
    lookup_field = "slug"
