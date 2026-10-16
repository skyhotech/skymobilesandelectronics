import time
from importlib import import_module
from types import SimpleNamespace

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings
from django.contrib.auth import get_user

from .access import allowed


def session_is_current(scope):
    store = import_module(settings.SESSION_ENGINE).SessionStore(
        session_key=scope["session"].session_key
    )
    user = get_user(SimpleNamespace(session=store))
    return user.pk == scope["user"].pk and allowed(user)


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.group = None
        if not await database_sync_to_async(allowed)(self.scope["user"]):
            await self.close(code=4403)
            return
        self.group = f"chat.user.{self.scope['user'].pk}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if self.group:
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        now = time.monotonic()
        if (
            isinstance(content, dict)
            and content.get("type") == "ping"
            and now - getattr(self, "last_ping", 0) > 15
        ):
            self.last_ping = now
            await self.send_json({"type": "pong"})

    async def chat_changed(self, event):
        # Revalidate revocations and session expiry before publishing even an invalidation.
        if not await database_sync_to_async(session_is_current)(self.scope):
            await self.close(code=4403)
            return
        await self.send_json({"type": "changed"})
