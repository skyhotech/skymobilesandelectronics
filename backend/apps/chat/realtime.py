import asyncio
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction


def notify(conversation):
    ids = [conversation.first_id, conversation.second_id]

    def publish():
        try:
            layer = get_channel_layer()

            async def deliver():
                await asyncio.wait_for(
                    asyncio.gather(
                        *(
                            layer.group_send(f"chat.user.{user_id}", {"type": "chat.changed"})
                            for user_id in ids
                        )
                    ),
                    timeout=1,
                )

            async_to_sync(deliver)()
        except Exception:
            # Durable messages remain available through authenticated HTTP fallback.
            logging.getLogger(__name__).warning("Chat realtime unavailable; HTTP resync required")

    transaction.on_commit(publish)
