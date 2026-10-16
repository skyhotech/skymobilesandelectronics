from django.db.models.deletion import ProtectedError
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework import filters, serializers, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response

from apps.notifications.api import HRPermission

from .models import Branch


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "name", "code", "city", "address", "phone", "is_active"]

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
