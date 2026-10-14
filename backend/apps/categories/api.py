"""Categories use the shared filesystem media implementation."""

from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.media_library.api import MediaAssetSerializer, MediaReferenceField, MediaUploadThrottle
from apps.media_library.services import create_image_asset

from .models import Category, CategoryTreeState
from .hierarchy import published_categories, validate_parent


class CategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True, default="")
    image_url = MediaReferenceField(source="image", required=False, allow_null=False)

    class Meta:
        model = Category
        fields = (
            "id",
            "parent",
            "parent_name",
            "name",
            "slug",
            "is_active",
            "image_url",
            "badge",
            "description",
            "starting_price",
            "destination",
            "display_order",
            "show_on_homepage",
        )
        read_only_fields = ("id",)

    def validate(self, attrs):
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        validate_parent(self.instance, parent)
        visible = attrs.get("show_on_homepage", getattr(self.instance, "show_on_homepage", False))
        image = attrs.get("image", getattr(self.instance, "image", ""))
        if visible and not image:
            raise serializers.ValidationError(
                {"image_url": "An image is required for homepage categories."}
            )
        return attrs


class PublicCategorySerializer(CategorySerializer):
    image_absolute_url = serializers.SerializerMethodField()

    class Meta(CategorySerializer.Meta):
        fields = CategorySerializer.Meta.fields + ("image_absolute_url",)

    def get_image_absolute_url(self, obj) -> str:
        return self.context["request"].build_absolute_uri(obj.image.url if obj.image else "")


@method_decorator(never_cache, name="dispatch")
class HomepageCategoryList(ListAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicCategorySerializer
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Category.objects.none()
        return published_categories()


class CategoryTreeSerializer(serializers.Serializer):
    revision = serializers.IntegerField()
    nodes = PublicCategorySerializer(many=True)


class ManagementCategoryTreeSerializer(serializers.Serializer):
    revision = serializers.IntegerField()
    nodes = CategorySerializer(many=True)


@method_decorator(never_cache, name="dispatch")
class PublicCategoryTree(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: CategoryTreeSerializer})
    @transaction.atomic
    def get(self, request):
        revision = CategoryTreeState.objects.select_for_update().get(pk=1).revision
        etag = f'"categories-{revision}"'
        if request.headers.get("If-None-Match") == etag:
            return Response(status=304, headers={"ETag": etag})
        return Response({"revision": revision,
                         "nodes": PublicCategorySerializer(published_categories(), many=True, context={"request": request}).data}, headers={"ETag": etag})


class CategoryUploadSerializer(serializers.Serializer):
    file = serializers.FileField()


@method_decorator(never_cache, name="dispatch")
class CategoryImageUpload(APIView):
    authentication_classes = [SessionAuthentication]
    parser_classes = [MultiPartParser]
    throttle_classes = [MediaUploadThrottle]

    def get_permissions(self):
        from apps.products.management_api import OwnerPermission

        return [OwnerPermission()]

    @extend_schema(request=CategoryUploadSerializer, responses={201: MediaAssetSerializer})
    def post(self, request):
        payload = CategoryUploadSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        asset = create_image_asset(payload.validated_data["file"], "categories", request.user)
        return Response(MediaAssetSerializer(asset).data, status=201)
