import uuid

from django.conf import settings
from django.db import models

from apps.media_library.storage import private_storage


def attachment_path(instance, filename):
    return f"chat/{uuid.uuid4().hex}"


class Conversation(models.Model):
    first = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="chat_first"
    )
    second = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="chat_second"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["first", "second"], name="chat_unique_pair"),
            models.CheckConstraint(
                condition=models.Q(first__lt=models.F("second")), name="chat_ordered_pair"
            ),
        ]


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    client_id = models.UUIDField(default=uuid.uuid4)
    text = models.TextField(max_length=4000, blank=True)
    attachment = models.FileField(storage=private_storage, upload_to=attachment_path, blank=True)
    filename = models.CharField(max_length=180, blank=True)
    size = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["sender", "client_id"], name="chat_message_retry_safe")
        ]
        indexes = [models.Index(fields=["conversation", "id"])]


class Call(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="calls")
    caller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    kind = models.CharField(max_length=5, choices=[("audio", "Voice"), ("video", "Video")])
    status = models.CharField(
        max_length=10,
        default="ringing",
        choices=[(s, s) for s in ["ringing", "accepted", "declined", "ended", "missed"]],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    caller_seen_at = models.DateTimeField(null=True, blank=True)
    recipient_seen_at = models.DateTimeField(null=True, blank=True)


class Signal(models.Model):
    call = models.ForeignKey(Call, on_delete=models.CASCADE, related_name="signals")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    kind = models.CharField(
        max_length=6, choices=[("offer", "offer"), ("answer", "answer"), ("ice", "ice")]
    )
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
