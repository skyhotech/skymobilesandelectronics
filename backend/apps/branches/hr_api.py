from django.db.models.deletion import ProtectedError
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, serializers, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response

from apps.notifications.api import HRPermission

from .models import Branch, BranchLocationAudit
from .streetview import embed_url, location_embed_url


class BranchSerializer(serializers.ModelSerializer):
    street_view_embed_url = serializers.CharField(
        max_length=12000, required=False, allow_blank=True
    )

    location_embed_url = serializers.SerializerMethodField()

    def get_location_embed_url(self, branch) -> str:
        return location_embed_url(branch)

    imagery_date = serializers.SerializerMethodField()

    def get_imagery_date(self, branch) -> str:
        return getattr(branch, "_imagery_date", "")

    branch_id = serializers.CharField(read_only=True)
    street_view_preview_url = serializers.SerializerMethodField()

    def get_street_view_preview_url(self, branch) -> str:
        return embed_url(branch, preview=True)

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "code",
            "city",
            "address",
            "phone",
            "google_maps_url",
            "street_view_embed_url",
            "is_active",
            "imagery_date",
            "location_embed_url",
            "branch_id",
            "is_showroom",
            "google_place_id",
            "latitude",
            "longitude",
            "location_verified",
            "manual_override",
            "street_view_enabled",
            "street_view_status",
            "street_view_verified",
            "panorama_id",
            "panorama_latitude",
            "panorama_longitude",
            "panorama_distance_m",
            "heading",
            "pitch",
            "last_checked_at",
            "last_verified_at",
            "location_candidates",
            "sync_error",
            "street_view_preview_url",
            "google_data_expires_at",
            "location_source",
        ]

        read_only_fields = [
            "branch_id",
            "street_view_preview_url",
            "street_view_status",
            "street_view_verified",
            "panorama_id",
            "panorama_latitude",
            "panorama_longitude",
            "panorama_distance_m",
            "last_checked_at",
            "last_verified_at",
            "location_candidates",
            "sync_error",
            "google_data_expires_at",
            "location_source",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["google_place_id"] = data.get("google_place_id") or ""
        return data

    def validate_google_place_id(self, value):
        import re

        if not value:
            return None
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,255}", value):
            raise serializers.ValidationError("Use a valid Google Place ID.")
        return value

    def validate_street_view_embed_url(self, value):
        from html import unescape
        from html.parser import HTMLParser
        from urllib.parse import parse_qs, urlsplit

        class EmbedParser(HTMLParser):
            sources = None

            def handle_starttag(self, tag, attrs):
                if tag.lower() == "iframe":
                    self.sources = dict(attrs).get("src")

        value = value.strip()
        if not value:
            return value
        if value.startswith("<"):
            parser = EmbedParser()
            parser.feed(value)
            value = parser.sources or ""
        value = unescape(value)
        try:
            parsed = urlsplit(value)
            port = parsed.port
        except ValueError:
            raise serializers.ValidationError("Invalid Google embed URL.") from None
        params = parse_qs(parsed.query)
        if (
            len(value) > 8000
            or parsed.scheme != "https"
            or parsed.hostname != "www.google.com"
            or parsed.path not in {"/maps/embed", "/maps/embed/"}
            or parsed.username
            or parsed.password
            or port not in {None, 443}
            or not params.get("pb")
            or "key" in params
        ):
            raise serializers.ValidationError(
                "Paste a Google Maps Share/Embed URL or iframe with a pb parameter; "
                "API-key embeds are not supported."
            )
        return value

    def validate_google_maps_url(self, value):
        if not value:
            return value
        from urllib.parse import urlsplit

        parsed = urlsplit(value)
        allowed = {
            "www.google.com",
            "google.com",
            "maps.google.com",
            "maps.app.goo.gl",
            "goo.gl",
            "g.co",
        }
        if (
            parsed.scheme != "https"
            or parsed.hostname not in allowed
            or parsed.username
            or parsed.password
        ):
            raise serializers.ValidationError("Use an HTTPS Google Maps link.")
        if parsed.hostname in {"www.google.com", "google.com"} and not parsed.path.startswith(
            "/maps"
        ):
            raise serializers.ValidationError("Use a Google Maps URL, not another Google page.")
        if parsed.hostname == "goo.gl" and not parsed.path.startswith("/maps/"):
            raise serializers.ValidationError("Use a Google Maps short link.")
        if parsed.hostname == "g.co" and not parsed.path.startswith("/kgs/"):
            raise serializers.ValidationError("Use a Google Maps place link.")
        return value

    def validate_code(self, value):
        value = value.lower()
        existing = Branch.objects.filter(code__iexact=value)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("A branch with this code already exists.")
        return value

    def validate(self, attrs):
        name = " ".join(attrs.get("name", getattr(self.instance, "name", "")).split())
        city = " ".join(attrs.get("city", getattr(self.instance, "city", "")).split())
        existing = Branch.objects.filter(name__iexact=name, city__iexact=city)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("This branch already exists in this city.")
        lat = attrs.get("latitude", getattr(self.instance, "latitude", None))
        lng = attrs.get("longitude", getattr(self.instance, "longitude", None))
        if (lat is None) != (lng is None):
            raise serializers.ValidationError("Provide both latitude and longitude, or neither.")
        if attrs.get("location_verified") and lat is None:
            raise serializers.ValidationError(
                "Verified coordinates require latitude and longitude."
            )
        attrs.update(name=name, city=city)
        return attrs


@method_decorator(never_cache, name="dispatch")
class HRBranches(viewsets.ModelViewSet):
    queryset = Branch.objects.order_by("city", "name", "id")
    serializer_class = BranchSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [HRPermission]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = [
        "is_showroom",
        "street_view_status",
        "location_verified",
        "street_view_verified",
    ]
    search_fields = ["name", "city", "code"]

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This branch has inventory records. Deactivate it instead."}, status=409
            )

    def perform_create(self, serializer):
        branch = serializer.save()
        BranchLocationAudit.objects.create(
            branch=branch,
            actor=self.request.user,
            action="created",
            status=branch.street_view_status,
        )

    def perform_update(self, serializer):
        from django.db import transaction

        with transaction.atomic():
            current = Branch.objects.select_for_update().get(pk=serializer.instance.pk)
            serializer.instance = current
            changed = {
                key
                for key, value in serializer.validated_data.items()
                if getattr(current, key) != value
            }
            sensitive = {
                "address",
                "city",
                "google_maps_url",
                "street_view_embed_url",
                "google_place_id",
                "latitude",
                "longitude",
                "heading",
                "pitch",
            }
            extra = {"location_revision": current.location_revision + 1}
            if changed & sensitive:
                extra.update(
                    street_view_verified=False,
                    last_verified_at=None,
                    street_view_status="needs_review",
                    manual_override=True,
                )
                if changed & {"latitude", "longitude"}:
                    extra.update(location_source="manual", google_data_expires_at=None)
                if changed & {"address", "city", "google_place_id", "latitude", "longitude"}:
                    extra.update(panorama_id="", panorama_latitude=None, panorama_longitude=None)
                    if "location_verified" not in serializer.validated_data:
                        extra["location_verified"] = False
            branch = serializer.save(**extra)
            BranchLocationAudit.objects.create(
                branch=branch,
                actor=self.request.user,
                action="edited",
                status=branch.street_view_status,
                note=", ".join(sorted(changed))[:500],
            )
