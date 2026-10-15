from .base import *  # noqa: F403

DEBUG = True

# These are distinct browser origins. Keep the loopback aliases local-only,
# even when an existing .env lists just one of them.
LOCAL_FRONTEND_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys([*CSRF_TRUSTED_ORIGINS, *LOCAL_FRONTEND_ORIGINS]))  # noqa: F405
CORS_ALLOWED_ORIGINS = list(dict.fromkeys([*CORS_ALLOWED_ORIGINS, *LOCAL_FRONTEND_ORIGINS]))  # noqa: F405
ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, "localhost", "127.0.0.1"]))  # noqa: F405

# Fail promptly when the local MySQL server has not been started.
if DATABASES["default"]["ENGINE"] == "django.db.backends.mysql":  # noqa: F405
    DATABASES["default"].setdefault("OPTIONS", {}).setdefault("connect_timeout", 5)  # noqa: F405
