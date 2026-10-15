"""Owner-only management APIs; the customer catalog remains a separate contract."""

import logging

from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from django.middleware.csrf import get_token
from django.urls import include, path
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import OpenApiParameter, extend_schema
from redis.exceptions import RedisError
from rest_framework import filters, permissions, serializers, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.brands.api import published_brands
from apps.brands.models import Brand
from apps.categories.api import CategorySerializer, ManagementCategoryTreeSerializer
from apps.categories.hierarchy import published_categories
from apps.categories.models import Category, CategoryTreeState
from apps.media_library.api import MediaReferenceField

from .models import Product


def is_owner(user):
    return bool(user.is_authenticated and user.is_active and user.is_staff and user.is_superuser)


class OwnerPermission(permissions.BasePermission):
    message = "Owner access is required."

    def has_permission(self, request, view):
        return is_owner(request.user)


class ManagementCountsSerializer(serializers.Serializer):
    total = serializers.IntegerField(min_value=0)
    active = serializers.IntegerField(min_value=0)


class ManagementHomepageCountsSerializer(ManagementCountsSerializer):
    homepage = serializers.IntegerField(min_value=0)


class ManagementOverviewSerializer(serializers.Serializer):
    brands = ManagementHomepageCountsSerializer()
    categories = ManagementHomepageCountsSerializer()
    products = ManagementCountsSerializer()


@method_decorator(never_cache, name="dispatch")
class ManagementOverview(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [OwnerPermission]

    @extend_schema(responses={200: ManagementOverviewSerializer})
    def get(self, request):
        def counts(model):
            return model.objects.aggregate(
                total=Count("pk"), active=Count("pk", filter=Q(is_active=True))
            )

        data = {
            "brands": {**counts(Brand), "homepage": published_brands().count()},
            "categories": {**counts(Category), "homepage": len(published_categories())},
            "products": counts(Product),
        }
        return Response(ManagementOverviewSerializer(data).data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=1024, trim_whitespace=False, write_only=True)


class ManagementUserSerializer(serializers.Serializer):
    username = serializers.CharField()


class ManagementSessionSerializer(serializers.Serializer):
    user = ManagementUserSerializer(allow_null=True)
    csrfToken = serializers.CharField()


class ManagementErrorSerializer(serializers.Serializer):
    detail = serializers.CharField()


class LoginServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Sign-in is temporarily unavailable. Please try again shortly."
    default_code = "login_unavailable"
    wait = 10


class ManagementLoginThrottle(AnonRateThrottle):
    scope = "management_login"
    rate = "10/min"

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except RedisError as error:
            # Fail closed: never authenticate without the shared login limiter.
            # Do not include connection URLs, credentials or submitted data in logs.
            logging.getLogger(__name__).error("Login rate-limit storage is unavailable")
            raise LoginServiceUnavailable() from error

    def get_cache_key(self, request, view):
        # Authenticated staff must not bypass login-attempt rate limiting.
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


@method_decorator(csrf_protect, name="dispatch")
@method_decorator(never_cache, name="dispatch")
class ManagementSession(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [permissions.AllowAny]

    def get_throttles(self):
        return [ManagementLoginThrottle()] if self.request.method == "POST" else []

    def envelope(self, request):
        user = request.user
        return Response(
            {
                "user": {"username": user.get_username()} if is_owner(user) else None,
                "csrfToken": get_token(request),
            }
        )

    @extend_schema(responses={200: ManagementSessionSerializer})
    def get(self, request):
        return self.envelope(request)

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: ManagementSessionSerializer,
            400: ManagementErrorSerializer,
            403: ManagementErrorSerializer,
            429: ManagementErrorSerializer,
            503: ManagementErrorSerializer,
        },
    )
    def post(self, request):
        payload = LoginSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        user = authenticate(request=request, **payload.validated_data)
        if user is None or not is_owner(user):
            return Response(
                {"detail": "Invalid owner credentials."}, status=status.HTTP_400_BAD_REQUEST
            )
        login(request, user)
        request.user = user
        return self.envelope(request)

    @extend_schema(request=None, responses={200: ManagementSessionSerializer})
    def delete(self, request):
        logout(request)
        return self.envelope(request)


class ProductSerializer(serializers.ModelSerializer):
    image_url = MediaReferenceField(source="image", required=False)

    class Meta:
        model = Product
        fields = (
            "id",
            "sku",
            "name",
            "slug",
            "description",
            "image_url",
            "brand",
            "category",
            "price",
            "compare_at_price",
            "currency",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        instance = self.instance
        price = attrs.get("price", instance.price if instance else None)
        compare = attrs.get("compare_at_price", instance.compare_at_price if instance else None)
        if compare is not None and price is not None and compare < price:
            raise serializers.ValidationError(
                {"compare_at_price": "Must be at least the selling price."}
            )
        return attrs


class BrandSerializer(serializers.ModelSerializer):
    logo_url = MediaReferenceField(source="logo", required=False)

    class Meta:
        model = Brand
        fields = (
            "id",
            "name",
            "slug",
            "is_active",
            "logo_url",
            "show_on_homepage",
            "display_order",
        )

    def validate(self, attrs):
        visible = attrs.get("show_on_homepage", getattr(self.instance, "show_on_homepage", False))
        logo = attrs.get("logo", getattr(self.instance, "logo", ""))
        if visible and not logo:
            raise serializers.ValidationError(
                {"logo_url": "A logo is required for brands shown on the homepage."}
            )
        return attrs


@method_decorator(never_cache, name="dispatch")
class ManagementViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication]
    permission_classes = [OwnerPermission]
    filter_backends = [filters.SearchFilter]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This record is in use. Deactivate it instead of deleting it."},
                status=status.HTTP_409_CONFLICT,
            )


@extend_schema(parameters=[OpenApiParameter(
    name="brand",
    type={"type": "integer", "minimum": 1},
    location=OpenApiParameter.QUERY,
    required=False,
    description="Limit reads and writes to this brand. Supplied product brands must match.",
)])
class ProductViewSet(ManagementViewSet):
    queryset = Product.objects.select_related("brand", "category").all()
    serializer_class = ProductSerializer
    search_fields = ("name", "sku")

    def scoped_brand_id(self):
        if "brand" in self.request.query_params:
            field = serializers.IntegerField(min_value=1)
            try:
                return field.run_validation(self.request.query_params["brand"])
            except serializers.ValidationError as error:
                raise serializers.ValidationError({"brand": error.detail}) from error
        return None

    def get_queryset(self):
        queryset = super().get_queryset()
        brand_id = self.scoped_brand_id()
        if brand_id is not None:
            queryset = queryset.filter(brand_id=brand_id)
        return queryset

    def save_scoped_product(self, serializer):
        brand_id = self.scoped_brand_id()
        brand = serializer.validated_data.get("brand")
        if brand_id is not None and brand is not None and brand.pk != brand_id:
            raise serializers.ValidationError({"brand": "Choose the brand being managed."})
        serializer.save()

    def perform_create(self, serializer):
        self.save_scoped_product(serializer)

    def perform_update(self, serializer):
        self.save_scoped_product(serializer)


class BrandMoveSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    before = serializers.IntegerField(min_value=1, allow_null=True)


class BrandViewSet(ManagementViewSet):
    queryset = Brand.objects.order_by("display_order", "name", "id")
    serializer_class = BrandSerializer
    search_fields = ("name",)

    @extend_schema(
        request=BrandMoveSerializer,
        responses={200: BrandSerializer(many=True), 400: ManagementErrorSerializer},
    )
    @action(detail=False, methods=["post"])
    @transaction.atomic
    def move(self, request):
        payload = BrandMoveSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        values = payload.validated_data
        brands = list(Brand.objects.select_for_update().order_by("display_order", "name", "id"))
        moving = next((brand for brand in brands if brand.pk == values["id"]), None)
        if moving is None:
            raise serializers.ValidationError({"id": "Brand no longer exists."})
        if values["before"] == moving.pk:
            raise serializers.ValidationError({"before": "Choose another brand."})
        brands.remove(moving)
        index = len(brands)
        if values["before"] is not None:
            index = next((i for i, brand in enumerate(brands) if brand.pk == values["before"]), -1)
            if index < 0:
                raise serializers.ValidationError({"before": "Brand no longer exists."})
        brands.insert(index, moving)
        for order, brand in enumerate(brands):
            brand.display_order = order
        Brand.objects.bulk_update(brands, ["display_order"])
        return Response(self.get_serializer(brands, many=True).data)


class CategoryMoveSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    parent = serializers.IntegerField(min_value=1, allow_null=True)
    before = serializers.IntegerField(min_value=1, allow_null=True, default=None)
    revision = serializers.IntegerField(min_value=0)


class CategoryRevisionSerializer(serializers.Serializer):
    revision = serializers.IntegerField()


@method_decorator(transaction.atomic, name="dispatch")
class CategoryViewSet(ManagementViewSet):
    queryset = Category.objects.select_related("parent").all()
    serializer_class = CategorySerializer
    search_fields = ("name",)

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            self.tree_state = CategoryTreeState.objects.select_for_update().get(pk=1)

    def changed(self):
        self.tree_state.revision += 1
        self.tree_state.save(update_fields=["revision"])

    def perform_create(self, serializer):
        if Category.objects.count() >= 10000:
            raise serializers.ValidationError({"detail": "Category limit reached."})
        serializer.save()
        self.changed()

    def perform_update(self, serializer):
        serializer.save()
        self.changed()

    def perform_destroy(self, instance):
        instance.delete()
        self.changed()

    @extend_schema(responses={200: ManagementCategoryTreeSerializer})
    @action(detail=False, methods=["get"], pagination_class=None)
    def tree(self, request):
        return Response({"revision": CategoryTreeState.objects.get(pk=1).revision,
                         "nodes": self.get_serializer(self.get_queryset(), many=True).data})

    @extend_schema(request=CategoryMoveSerializer, responses={200: CategoryRevisionSerializer, 409: ManagementErrorSerializer})
    @action(detail=False, methods=["post"])
    def move(self, request):
        payload = CategoryMoveSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        values = payload.validated_data
        if values["revision"] != self.tree_state.revision:
            return Response({"detail": "Categories changed elsewhere. The tree has been refreshed; try again."}, status=409)
        instance = Category.objects.filter(pk=values["id"]).first()
        if instance is None:
            raise serializers.ValidationError({"id": "Category no longer exists."})
        serializer = self.get_serializer(instance, data={"parent": values["parent"]}, partial=True)
        serializer.is_valid(raise_exception=True)
        siblings = list(Category.objects.filter(parent_id=values["parent"]).exclude(pk=instance.pk).order_by("display_order", "name", "id"))
        index = len(siblings)
        if values["before"] is not None:
            index = next((i for i, item in enumerate(siblings) if item.pk == values["before"]), -1)
            if index < 0:
                raise serializers.ValidationError({"before": "Choose a sibling in the destination category."})
        serializer.save()
        siblings.insert(index, instance)
        for order, sibling in enumerate(siblings):
            sibling.display_order = order
        Category.objects.bulk_update(siblings, ["display_order"])
        self.changed()
        return Response({"revision": self.tree_state.revision})


router = DefaultRouter()
router.register("products", ProductViewSet, basename="management-product")
router.register("brands", BrandViewSet, basename="management-brand")
router.register("categories", CategoryViewSet, basename="management-category")

management_urlpatterns = [
    path("overview/", ManagementOverview.as_view(), name="management-overview"),
    path("session/", ManagementSession.as_view(), name="management-session"),
    path("", include(router.urls)),
]
