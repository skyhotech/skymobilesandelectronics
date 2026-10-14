"""Public storefront brand feed (read-only, no authentication)."""

from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import permissions, serializers
from rest_framework.generics import ListAPIView

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
