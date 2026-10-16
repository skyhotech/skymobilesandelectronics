from django.conf import settings
from django.db import models


class JobOpening(models.Model):
    title = models.CharField(max_length=150)
    location = models.CharField(max_length=150)
    employment_type = models.CharField(
        max_length=20,
        choices=[
            ("full_time", "Full time"),
            ("part_time", "Part time"),
            ("contract", "Contract"),
            ("internship", "Internship"),
        ],
        default="full_time",
    )
    description = models.TextField(max_length=10000)
    application_email = models.EmailField()
    is_active = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
