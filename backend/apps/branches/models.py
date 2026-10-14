from django.db import models


class Branch(models.Model):
    name = models.CharField(max_length=160)
    code = models.SlugField(max_length=40, unique=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    phone = models.CharField(max_length=24, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "branches"

    def __str__(self):
        return f"{self.name} ({self.code})"
