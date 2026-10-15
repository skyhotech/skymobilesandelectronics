"""Public storefront brand feed (read-only, no authentication)."""

import hashlib
import json

from django.http import HttpResponseNotModified
from django.utils.decorators import method_decorator
from django.utils.http import parse_etags
from django.views.decorators.cache import never_cache
from rest_framework import permissions, serializers
from rest_framework.generics import ListAPIView
from rest_framework.response import Response

from apps.media_library.api import MediaReferenceField

from .models import Brand


class PublicBrandSerializer(serializers.ModelSerializer):
    logo_url = MediaReferenceField(source="logo", read_only=True)

    class Meta:
        model = Brand
        fields = ("id", "name", "slug", "logo_url", "display_order")
        read_only_fields = fields


def published_brands():
    return Brand.objects.filter(is_active=True, show_on_homepage=True).exclude(logo="")


@method_decorator(never_cache, name="dispatch")
class HomepageBrandList(ListAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PublicBrandSerializer
    pagination_class = None

    def get_queryset(self):
        return published_brands()

    def list(self, request, *args, **kwargs):
        data = self.get_serializer(self.get_queryset(), many=True).data
        # Hash exactly the public representation: edits, visibility and deletion
        # invalidate the validator without changing the existing array contract.
        digest = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
        etag = f'"brands-{digest}"'
        validators = parse_etags(request.headers.get("If-None-Match", ""))
        if any(value == "*" or value.removeprefix("W/") == etag for value in validators):
            response = HttpResponseNotModified()
        else:
            response = Response(data)
        response["ETag"] = etag
        return response
