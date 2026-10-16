from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import filters, permissions, serializers, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView

from apps.notifications.api import HRPermission

from .models import JobOpening


class PublicJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobOpening
        fields = [
            "id",
            "title",
            "location",
            "employment_type",
            "description",
            "application_email",
            "created_at",
        ]


class JobSerializer(PublicJobSerializer):
    class Meta(PublicJobSerializer.Meta):
        fields = PublicJobSerializer.Meta.fields + ["is_active", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


@method_decorator(never_cache, name="dispatch")
class HRJobs(viewsets.ModelViewSet):
    queryset = JobOpening.objects.all()
    serializer_class = JobSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [HRPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "location", "description"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@method_decorator(never_cache, name="dispatch")
class PublicJobs(ListAPIView):
    queryset = JobOpening.objects.filter(is_active=True)
    serializer_class = PublicJobSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
