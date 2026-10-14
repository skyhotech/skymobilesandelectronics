"""Owner-only management APIs; the customer catalog remains a separate contract."""

from django.contrib.auth import authenticate, login, logout
from django.db.models.deletion import ProtectedError
from django.db import transaction
from django.middleware.csrf import get_token
from django.urls import include, path
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema
from rest_framework import filters, permissions, serializers, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework.decorators import action

from apps.brands.models import Brand
from apps.categories.api import CategorySerializer, ManagementCategoryTreeSerializer
from apps.categories.models import Category, CategoryTreeState
from apps.media_library.api import MediaReferenceField

from .models import Product


def is_owner(user):
    return bool(user.is_authenticated and user.is_active and user.is_staff and user.is_superuser)


class OwnerPermission(permissions.BasePermission):
    message = "Owner access is required."

    def has_permission(self, request, view):
        return is_owner(request.user)


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


class ManagementLoginThrottle(AnonRateThrottle):
    scope = "management_login"
    rate = "10/min"

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


class ProductViewSet(ManagementViewSet):
    queryset = Product.objects.select_related("brand", "category").all()
    serializer_class = ProductSerializer
    search_fields = ("name", "sku")


class BrandViewSet(ManagementViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    search_fields = ("name",)


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
    path("session/", ManagementSession.as_view(), name="management-session"),
    path("", include(router.urls)),
]
