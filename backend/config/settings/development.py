
from .base import *  # noqa: F403

DEBUG = True

# Local development origins
LOCAL_FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Temporary Cloudflare preview
CLOUDFLARE_HOST = (
    "arbor-testimonials-selecting-outline.trycloudflare.com"
)
CLOUDFLARE_ORIGIN = f"https://{CLOUDFLARE_HOST}"

# Allow trusted frontend origins for Django CSRF validation
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys([
    *CSRF_TRUSTED_ORIGINS,
    *LOCAL_FRONTEND_ORIGINS,
    CLOUDFLARE_ORIGIN,
]))  # noqa: F405

# CORS origins
CORS_ALLOWED_ORIGINS = list(dict.fromkeys([
    *CORS_ALLOWED_ORIGINS,
    *LOCAL_FRONTEND_ORIGINS,
    CLOUDFLARE_ORIGIN,
]))  # noqa: F405

# Permitted HTTP hostnames
ALLOWED_HOSTS = list(dict.fromkeys([
    *ALLOWED_HOSTS,
    "localhost",
    "127.0.0.1",
    CLOUDFLARE_HOST,
]))  # noqa: F405

# Keep CSRF cookies available to frontend JavaScript.
# This matches the existing management-api.ts cookie reader.
CSRF_COOKIE_HTTPONLY = False

# Do not set CSRF_COOKIE_DOMAIN or SESSION_COOKIE_DOMAIN
# to localhost. Host-only cookies work better for this preview.

# Preserve existing MySQL connection configuration
if DATABASES["default"]["ENGINE"] == "django.db.backends.mysql":  # noqa: F405
    DATABASES["default"].setdefault(
        "OPTIONS", {}
    ).setdefault("connect_timeout", 5)  # noqa: F405



#previous code



# from .base import *  # noqa: F403

# DEBUG = True

# # These are distinct browser origins. Keep the loopback aliases local-only,
# # even when an existing .env lists just one of them.
# LOCAL_FRONTEND_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
# CSRF_TRUSTED_ORIGINS = list(dict.fromkeys([*CSRF_TRUSTED_ORIGINS, *LOCAL_FRONTEND_ORIGINS]))  # noqa: F405
# CORS_ALLOWED_ORIGINS = list(dict.fromkeys([*CORS_ALLOWED_ORIGINS, *LOCAL_FRONTEND_ORIGINS]))  # noqa: F405
# ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, "localhost", "127.0.0.1"]))  # noqa: F405

# # Fail promptly when the local MySQL server has not been started.
# if DATABASES["default"]["ENGINE"] == "django.db.backends.mysql":  # noqa: F405
#     DATABASES["default"].setdefault("OPTIONS", {}).setdefault("connect_timeout", 5)  # noqa: F405
