"""Namespace protection in addition to each DRF view's authorization checks."""

from django.http import JsonResponse
from django.utils.cache import patch_cache_control


class ManagementAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info
        if path == "/api/v1/management" or path.startswith("/api/v1/management/"):
            # Public session bootstrap/login must remain reachable. CSRF protection
            # and login throttling continue to be enforced by ManagementSession.
            if path.rstrip("/") != "/api/v1/management/session":
                user = request.user
                if not user.is_authenticated:
                    response = JsonResponse({"detail": "Authentication required."}, status=403)
                elif not (user.is_active and user.is_staff and user.is_superuser):
                    response = JsonResponse({"detail": "Owner access is required."}, status=403)
                else:
                    response = self.get_response(request)
                patch_cache_control(response, private=True, no_store=True)
                return response
        return self.get_response(request)
