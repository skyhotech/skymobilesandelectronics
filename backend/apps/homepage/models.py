from django.conf import settings
from django.db import models


class HomeConfiguration(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    draft = models.JSONField()
    published = models.JSONField()
    revision = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=models.Q(id=1), name="homepage_singleton")]


class HomeRevision(models.Model):
    configuration = models.ForeignKey(HomeConfiguration, on_delete=models.PROTECT)
    revision = models.PositiveIntegerField()
    snapshot = models.JSONField()
    published_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["configuration", "revision"], name="homepage_revision")
        ]
