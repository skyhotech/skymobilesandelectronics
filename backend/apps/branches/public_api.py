from django.db.models import Q
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import permissions, serializers
from rest_framework.generics import ListAPIView

from .models import Branch


class StoreLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "name", "city", "address", "phone", "google_maps_url"]


@method_decorator(never_cache, name="dispatch")
class StoreLocations(ListAPIView):
    serializer_class = StoreLocationSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    queryset = (
        Branch.objects.filter(is_active=True)
        .filter(~Q(address="") | ~Q(google_maps_url=""))
        .order_by("city", "name")[:200]
    )
