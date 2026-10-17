from channels.generic.websocket import AsyncJsonWebsocketConsumer


class ExperienceConsumer(AsyncJsonWebsocketConsumer):
    """Public invalidations only; no mutation, session or unpublished data."""

    async def connect(self):
        await self.channel_layer.group_add("site-experience", self.channel_name)
        await self.accept()
        await self.send_json({"event": "experience.updated"})

    async def disconnect(self, code):
        await self.channel_layer.group_discard("site-experience", self.channel_name)

    async def experience_changed(self, event):
        await self.send_json({"event": "experience.updated"})
