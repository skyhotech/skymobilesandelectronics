"""Separate HR sign-in with explicit HR group membership."""
from django.contrib.auth import authenticate, login
from django.middleware.csrf import get_token
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response

from apps.products.management_api import (
    LoginSerializer,
    ManagementSession,
    ManagementSessionSerializer,
)


def is_hr(user):
    return user.is_authenticated and user.is_active and user.groups.filter(name="HR").exists()


class HRSession(ManagementSession):
    def envelope(self, request):
        return Response({
            "user": {"username": request.user.get_username()} if is_hr(request.user) else None,
            "csrfToken": get_token(request),
        })

    @extend_schema(request=LoginSerializer, responses={200: ManagementSessionSerializer})
    def post(self, request):
        payload = LoginSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        user = authenticate(request=request, **payload.validated_data)
        if user is None or not is_hr(user):
            return Response(
                {"detail": "Invalid HR credentials."}, status=status.HTTP_400_BAD_REQUEST,
            )
        login(request, user)
        request.user = user
        return self.envelope(request)
