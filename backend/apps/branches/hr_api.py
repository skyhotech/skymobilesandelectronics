from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import filters, serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView

from apps.notifications.api import HRPermission

from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "name", "code", "city", "address", "phone", "is_active"]


@method_decorator(never_cache, name="dispatch")
class HRBranches(ListAPIView):
    queryset = Branch.objects.order_by("city", "name", "id")
    serializer_class = BranchSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [HRPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "city", "code"]
