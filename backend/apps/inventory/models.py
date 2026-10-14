from django.core.exceptions import ValidationError
from django.db import models


class Stock(models.Model):
    product = models.ForeignKey("products.Product", on_delete=models.PROTECT)
    branch = models.ForeignKey("branches.Branch", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=0)
    reserved = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["branch__name", "product__name"]
        verbose_name_plural = "stock balances"
        constraints = [
            models.UniqueConstraint(
                fields=["product", "branch"], name="stock_product_branch_unique"
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=0), name="stock_quantity_nonnegative"
            ),
            models.CheckConstraint(
                condition=models.Q(reserved__gte=0), name="stock_reserved_nonnegative"
            ),
            models.CheckConstraint(
                condition=models.Q(reserved__lte=models.F("quantity")),
                name="stock_reserved_within_quantity",
            ),
        ]

    @property
    def available(self):
        return self.quantity - self.reserved

    def clean(self):
        super().clean()
        if self.quantity is not None and self.reserved is not None:
            if self.quantity < self.reserved:
                raise ValidationError({"quantity": "Cannot be below the reserved quantity."})

    def __str__(self):
        return f"{self.product.sku} at {self.branch.code}: {self.available} available"
