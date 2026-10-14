from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class CategoryTreeState(models.Model):
    revision = models.PositiveBigIntegerField(default=0)


class Category(models.Model):
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT, related_name="subcategories")
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    is_active = models.BooleanField(default=True)
    image = models.FileField(max_length=500, blank=True)
    badge = models.CharField(max_length=40, blank=True)
    description = models.CharField(max_length=240, blank=True)
    starting_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    destination = models.CharField(
        max_length=40,
        default="#smartphones",
        choices=[
            ("#smartphones", "Smartphones"),
            ("#laptops", "Laptops & tablets"),
            ("#gadgets", "Gadgets & audio"),
            ("#entertainment", "TVs & appliances"),
        ],
    )
    display_order = models.PositiveIntegerField(default=0)
    show_on_homepage = models.BooleanField(default=False)

    class Meta:
        ordering = ["display_order", "name", "id"]
        verbose_name_plural = "categories"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(starting_price__isnull=True) | models.Q(starting_price__gt=0),
                name="category_starting_price_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(show_on_homepage=False) | ~models.Q(image=""),
                name="category_homepage_image_required",
            ),
        ]

    def __str__(self):
        return self.name
