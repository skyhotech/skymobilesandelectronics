from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = [*ALLOWED_HOSTS, "10.0.2.2"]  # noqa: F405

# Fail promptly when the local MySQL server has not been started.
if DATABASES["default"]["ENGINE"] == "django.db.backends.mysql":  # noqa: F405
    DATABASES["default"].setdefault("OPTIONS", {}).setdefault("connect_timeout", 5)  # noqa: F405
