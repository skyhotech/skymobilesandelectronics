from django.conf import settings
from django.db import models


class Broadcast(models.Model):
    title = models.CharField(max_length=120)
    message = models.TextField(max_length=2000)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-id"]
