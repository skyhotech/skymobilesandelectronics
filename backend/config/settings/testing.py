import os

os.environ.setdefault("DJANGO_SECRET_KEY", "test-only-secret-not-for-deployment")

from .base import *  # noqa: E402,F403

CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
CELERY_TASK_ALWAYS_EAGER = True
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
