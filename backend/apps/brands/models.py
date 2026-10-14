from django.db import models


class Brand(models.Model):
    logo = models.FileField(max_length=500, blank=True)
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    is_active = models.BooleanField(default=True)
    show_on_homepage = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name_plural = "brands"

    def __str__(self):
        return self.name
