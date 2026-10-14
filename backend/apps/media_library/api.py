from django.core.exceptions import SuspiciousFileOperation
from django.http import FileResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import OpenApiTypes, extend_schema, extend_schema_field
from rest_framework import mixins, serializers, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import MediaAsset
from .services import create_image_asset
from .storage import relative_media_name


@extend_schema_field(OpenApiTypes.STR)
class MediaReferenceField(serializers.Field):
    def to_representation(self, value):
        return value.url if value else ""

    def to_internal_value(self, value):
        # Compatibility for the previous bundled-artwork picker, never persisted as a URL.
        if isinstance(value, str) and value.startswith("/images/homepage/categories-v2/"):
            value = "categories/artwork/" + value.removeprefix("/images/homepage/categories-v2/")
        try:
            return relative_media_name(value)
        except SuspiciousFileOperation:
            raise serializers.ValidationError(
                "Choose a local media image or upload a new image."
            ) from None


class MediaAssetSerializer(serializers.ModelSerializer):
    image_url = MediaReferenceField(source="file", read_only=True)
    thumbnail_url = MediaReferenceField(source="thumbnail", read_only=True)
    file_name = serializers.CharField(source="file.name", read_only=True)

    class Meta:
        model = MediaAsset
        fields = (
            "id",
            "kind",
            "file_name",
            "image_url",
            "thumbnail_url",
            "width",
            "height",
            "total_bytes",
            "original_bytes",
            "sha256",
            "status",
            "is_archived",
            "created_at",
        )
        read_only_fields = fields


class MediaUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    kind = serializers.ChoiceField(choices=MediaAsset.Kind.choices)


class MediaUploadThrottle(UserRateThrottle):
    scope = "media_upload"
    rate = "10/min"


class OwnerMediaMixin:
    authentication_classes = [SessionAuthentication]

    def get_permissions(self):
        from apps.products.management_api import OwnerPermission

        return [OwnerPermission()]


@method_decorator(never_cache, name="dispatch")
class MediaUpload(OwnerMediaMixin, APIView):
    parser_classes = [MultiPartParser]
    throttle_classes = [MediaUploadThrottle]

    @extend_schema(request=MediaUploadSerializer, responses={201: MediaAssetSerializer})
    def post(self, request):
        payload = MediaUploadSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        asset = create_image_asset(
            payload.validated_data["file"], payload.validated_data["kind"], request.user
        )
        return Response(MediaAssetSerializer(asset).data, status=201)


@method_decorator(never_cache, name="dispatch")
class MediaAssetViewSet(
    OwnerMediaMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = MediaAssetSerializer
    queryset = MediaAsset.objects.filter(is_archived=False)

    def perform_destroy(self, instance):
        # References may be shared. Archival does not unlink or remove any file.
        instance.is_archived = True
        instance.save(update_fields=["is_archived"])

    @extend_schema(responses=OpenApiTypes.BINARY)
    @action(detail=True, methods=["get"])
    def original(self, request, pk=None):
        asset = self.get_object()
        if not asset.original:
            return Response({"detail": "Original is unavailable."}, status=404)
        try:
            return FileResponse(
                asset.original.open("rb"),
                as_attachment=True,
                filename=asset.original_name or "original",
            )
        except OSError:
            return Response({"detail": "Original is unavailable."}, status=404)
