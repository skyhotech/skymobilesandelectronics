from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.hr_auth import is_hr

from .models import Broadcast


class HRPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_hr(request.user)


class BroadcastThrottle(UserRateThrottle):
    scope = "hr_broadcast"
    rate = "10/min"


class BroadcastSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(
        source="sender.username", read_only=True, default="Former user"
    )

    class Meta:
        model = Broadcast
        fields = ["id", "title", "message", "sender_name", "created_at"]
        read_only_fields = ["id", "sender_name", "created_at"]


@method_decorator(never_cache, name="dispatch")
class BroadcastList(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [HRPermission]

    def get_throttles(self):
        return [BroadcastThrottle()] if self.request.method == "POST" else []

    @extend_schema(responses=BroadcastSerializer(many=True))
    def get(self, request):
        return Response(
            BroadcastSerializer(Broadcast.objects.select_related("sender")[:50], many=True).data
        )

    @extend_schema(request=BroadcastSerializer, responses={201: BroadcastSerializer})
    def post(self, request):
        payload = BroadcastSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        payload.save(sender=request.user)
        return Response(payload.data, status=201)
