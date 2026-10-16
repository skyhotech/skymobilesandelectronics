from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import permissions, serializers
from rest_framework.generics import ListAPIView

from .models import Branch
from .streetview import coordinates_current, embed_url, location_embed_url


class StoreLocationSerializer(serializers.ModelSerializer):
    google_place_id = serializers.SerializerMethodField()

    def get_google_place_id(self, branch) -> str:
        return branch.google_place_id or ""

    location_embed_url = serializers.SerializerMethodField()

    def get_location_embed_url(self, branch) -> str:
        return location_embed_url(branch)

    street_view_verified = serializers.SerializerMethodField()
    street_view_status = serializers.SerializerMethodField()

    def get_street_view_verified(self, branch) -> bool:
        return bool(embed_url(branch))

    def get_street_view_status(self, branch) -> str:
        return (
            branch.street_view_status
            if coordinates_current(branch)
            or (branch.street_view_embed_url and branch.street_view_verified)
            else "needs_review"
        )

    branch_id = serializers.CharField(read_only=True)
    street_view_embed_url = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    def get_street_view_embed_url(self, branch) -> str:
        return embed_url(branch)

    def get_latitude(self, branch) -> str | None:
        return (
            str(branch.latitude)
            if branch.location_verified
            and coordinates_current(branch)
            and branch.latitude is not None
            else None
        )

    def get_longitude(self, branch) -> str | None:
        return (
            str(branch.longitude)
            if branch.location_verified
            and coordinates_current(branch)
            and branch.longitude is not None
            else None
        )

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "city",
            "address",
            "phone",
            "google_maps_url",
            "location_embed_url",
            "street_view_embed_url",
            "branch_id",
            "street_view_status",
            "street_view_verified",
            "latitude",
            "longitude",
            "google_place_id",
        ]


@method_decorator(never_cache, name="dispatch")
class StoreLocations(ListAPIView):
    serializer_class = StoreLocationSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    queryset = Branch.objects.filter(is_active=True, is_showroom=True).order_by("city", "name")[
        :200
    ]
