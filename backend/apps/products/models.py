from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Product(models.Model):
    sku = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=220)
    slug = models.SlugField(max_length=240, unique=True)
    description = models.TextField(blank=True)
    image = models.FileField(max_length=500, blank=True)
    brand = models.ForeignKey("brands.Brand", on_delete=models.PROTECT)
    category = models.ForeignKey("categories.Category", on_delete=models.PROTECT)
    price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    compare_at_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    currency = models.CharField(max_length=3, choices=[("INR", "Indian Rupee")], default="INR")
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(condition=models.Q(price__gt=0), name="product_price_positive"),
            models.CheckConstraint(
                condition=models.Q(compare_at_price__isnull=True)
                | models.Q(compare_at_price__gte=models.F("price")),
                name="product_compare_price_valid",
            ),
            models.CheckConstraint(condition=models.Q(currency="INR"), name="product_currency_inr"),
        ]

    def clean(self):
        super().clean()
        if self.compare_at_price is not None and self.price is not None:
            if self.compare_at_price < self.price:
                raise ValidationError({"compare_at_price": "Must be at least the selling price."})

    def __str__(self):
        return f"{self.name} [{self.sku}]"
