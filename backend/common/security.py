"""Response hardening without replacing Django's authentication/CSRF machinery."""

from django.http import JsonResponse
from django.views.csrf import csrf_failure as django_csrf_failure


def csrf_failure(request, reason=""):
    if request.path_info.startswith("/api/"):
        # Do not expose validation internals or reflected request content.
        return JsonResponse({"detail": "Security token invalid or expired. Refresh and try again."}, status=403)
    return django_csrf_failure(request, reason=reason)


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Authentication middleware can return before XFrameOptionsMiddleware.
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        # Compatible with Django admin and OpenAPI UI; script policy needs nonces.
        response.headers.setdefault("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'")
        return response
