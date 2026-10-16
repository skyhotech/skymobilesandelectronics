from django.db.models.deletion import ProtectedError
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import filters, serializers, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response

from apps.notifications.api import HRPermission

from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    street_view_embed_url = serializers.CharField(
        max_length=12000, required=False, allow_blank=True
    )

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
        ]

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
        attrs.update(name=name, city=city)
        return attrs


@method_decorator(never_cache, name="dispatch")
class HRBranches(viewsets.ModelViewSet):
    queryset = Branch.objects.order_by("city", "name", "id")
    serializer_class = BranchSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [HRPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "city", "code"]

    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This branch has inventory records. Deactivate it instead."}, status=409
            )
