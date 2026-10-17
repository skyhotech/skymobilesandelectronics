import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.core.asgi import get_asgi_application
from django.urls import path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
http_application = get_asgi_application()

from django.conf import settings  # noqa: E402

from apps.chat.consumers import ChatConsumer  # noqa: E402
from apps.experience.consumers import ExperienceConsumer  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": http_application,
        "websocket": OriginValidator(
            AuthMiddlewareStack(URLRouter([path("ws/chat/", ChatConsumer.as_asgi()), path("ws/experience/", ExperienceConsumer.as_asgi())])),
            settings.CSRF_TRUSTED_ORIGINS,
        ),
    }
)
