from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import extend_schema
from redis.exceptions import RedisError
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.notifications.api import HRPermission

from .hr_api import BranchSerializer
from .models import Branch, BranchLocationAudit
from .streetview import browser_embed_key, embed_url, sync_branch


class ReviewRequest(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["sync", "metadata", "review_location", "confirm_storefront", "revoke"]
    )
    place_id = serializers.RegexField(r"^[A-Za-z0-9_-]{1,255}$", required=False)
    confirmed = serializers.BooleanField(default=False)
    note = serializers.CharField(max_length=500, required=False, allow_blank=True)


class ReviewLimiterUnavailable(APIException):
    status_code = 503
    default_detail = "Location review rate limiting is unavailable. Try again shortly."
    wait = 10


class ReviewThrottle(UserRateThrottle):
    scope = "hr_streetview"
    rate = "12/hour"

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except RedisError:
            raise ReviewLimiterUnavailable() from None


class AuditSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.username", read_only=True, default="System")

    class Meta:
        model = BranchLocationAudit
        fields = ["id", "action", "status", "note", "created_at", "actor_name"]


class ConfigurationState(serializers.Serializer):
    enabled = serializers.BooleanField()
    server_ready = serializers.BooleanField()
    embed_ready = serializers.BooleanField()
    keys_separate = serializers.BooleanField()


class ReviewState(serializers.Serializer):
    configuration = ConfigurationState()
    branch = BranchSerializer()
    history = AuditSerializer(many=True)


@method_decorator(never_cache, name="dispatch")
class StreetViewReview(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [HRPermission]

    def get_throttles(self):
        return [ReviewThrottle()] if self.request.method == "POST" else []

    def response(self, branch):
        return Response(
            {
                "configuration": {
                    "enabled": settings.GOOGLE_MAPS_STREETVIEW_ENABLED,
                    "server_ready": bool(settings.GOOGLE_MAPS_SERVER_API_KEY),
                    "embed_ready": bool(browser_embed_key()),
                    "keys_separate": not settings.GOOGLE_MAPS_SERVER_API_KEY
                    or settings.GOOGLE_MAPS_SERVER_API_KEY != settings.GOOGLE_MAPS_EMBED_API_KEY,
                },
                "branch": BranchSerializer(branch).data,
                "history": AuditSerializer(
                    branch.location_history.select_related("actor")[:30], many=True
                ).data,
            }
        )

    @extend_schema(responses=ReviewState)
    def get(self, request, pk):
        from django.shortcuts import get_object_or_404

        return self.response(get_object_or_404(Branch, pk=pk))

    @extend_schema(request=ReviewRequest, responses=ReviewState)
    def post(self, request, pk):
        from django.shortcuts import get_object_or_404

        payload = ReviewRequest(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        branch = get_object_or_404(Branch, pk=pk)
        action = data["action"]
        if not branch.is_showroom:
            return Response({"detail": "This entry is not a showroom."}, status=400)
        if action in {"sync", "metadata", "review_location"}:
            if action == "review_location" and (
                not data.get("place_id") or not data["confirmed"] or len(data.get("note", "")) < 10
            ):
                return Response(
                    {"detail": "Confirm the place and add a review note (10+ characters)."},
                    status=400,
                )
            if (
                action != "review_location"
                and branch.last_checked_at
                and branch.last_checked_at > timezone.now() - timedelta(minutes=5)
            ):
                return Response(
                    {"detail": "Wait five minutes before another API refresh."},
                    status=429,
                )
            sync_branch(
                branch,
                force=True,
                actor=request.user,
                metadata_only=action == "metadata",
                selected_place_id=data.get("place_id") if action == "review_location" else None,
            )
            branch.refresh_from_db()
            if action == "review_location":
                BranchLocationAudit.objects.create(
                    branch=branch,
                    actor=request.user,
                    action="location_review",
                    status=branch.street_view_status,
                    note=data.get("note", ""),
                )
            return self.response(branch)
        with transaction.atomic():
            branch = Branch.objects.select_for_update().get(pk=pk)
            if action == "confirm_storefront":
                if not data["confirmed"] or len(data.get("note", "")) < 10:
                    return Response(
                        {"detail": "Confirm visual inspection and add a 10+ character note."},
                        status=400,
                    )
                if not branch.street_view_enabled or not embed_url(branch, preview=True):
                    return Response(
                        {"detail": "A working preview is required before verification."},
                        status=400,
                    )
                if not branch.street_view_embed_url and (
                    not branch.location_verified
                    or branch.street_view_status not in {"available_nearby", "storefront_verified"}
                ):
                    return Response(
                        {"detail": "Resolve the location and imagery before confirmation."},
                        status=400,
                    )
                branch.street_view_verified = True
                branch.street_view_status = "storefront_verified"
                branch.last_verified_at = timezone.now()
                branch.manual_override = True
            else:
                branch.street_view_verified = False
                branch.street_view_status = "needs_review"
                branch.last_verified_at = None
            branch.location_revision += 1
            branch.save()
            BranchLocationAudit.objects.create(
                branch=branch,
                actor=request.user,
                action=action,
                status=branch.street_view_status,
                note=data.get("note", ""),
            )
        return self.response(branch)
