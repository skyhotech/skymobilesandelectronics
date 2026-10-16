from django.db.models import Count, Q
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.branches.models import Branch
from apps.careers.api import JobSerializer
from apps.careers.models import JobOpening
from apps.notifications.api import BroadcastSerializer, HRPermission
from apps.notifications.models import Broadcast


class HRCitySerializer(serializers.Serializer):
    city = serializers.CharField(allow_blank=True)
    total = serializers.IntegerField()


class HROverviewSerializer(serializers.Serializer):
    branches = serializers.IntegerField()
    active_branches = serializers.IntegerField()
    jobs = serializers.IntegerField()
    published_jobs = serializers.IntegerField()
    broadcasts = serializers.IntegerField()
    cities = HRCitySerializer(many=True)
    recent_jobs = JobSerializer(many=True)
    recent_broadcasts = BroadcastSerializer(many=True)


@method_decorator(never_cache, name="dispatch")
class HROverview(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [HRPermission]

    @extend_schema(responses=HROverviewSerializer)
    def get(self, request):
        branches = Branch.objects.aggregate(
            total=Count("id"), active=Count("id", filter=Q(is_active=True))
        )
        jobs = JobOpening.objects.aggregate(
            total=Count("id"), published=Count("id", filter=Q(is_active=True))
        )
        return Response(
            {
                "branches": branches["total"],
                "active_branches": branches["active"],
                "jobs": jobs["total"],
                "published_jobs": jobs["published"],
                "broadcasts": Broadcast.objects.count(),
                "cities": list(
                    Branch.objects.values("city").annotate(total=Count("id")).order_by("city")
                ),
                "recent_jobs": JobSerializer(
                    JobOpening.objects.order_by("-updated_at", "-id")[:5], many=True
                ).data,
                "recent_broadcasts": BroadcastSerializer(
                    Broadcast.objects.select_related("sender")[:5], many=True
                ).data,
            }
        )
