"""Validated product filters shared by public and owner listings."""
from rest_framework import serializers


class PriceFilters(serializers.Serializer):
    min_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False,
    )
    max_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0, required=False,
    )

    def validate(self, values):
        if ("min_price" in values and "max_price" in values
                and values["min_price"] > values["max_price"]):
            raise serializers.ValidationError({
                "max_price": "Maximum must be at least minimum price.",
            })
        return values


def filter_prices(queryset, values):
    if "min_price" in values:
        queryset = queryset.filter(price__gte=values["min_price"])
    if "max_price" in values:
        queryset = queryset.filter(price__lte=values["max_price"])
    return queryset


class ManagementProductFilters(PriceFilters):
    status = serializers.ChoiceField(choices=("all", "active", "inactive"), default="all")
    category = serializers.IntegerField(min_value=1, required=False)
    ordering = serializers.ChoiceField(
        choices=("name", "-name", "price", "-price", "-id"), default="name"
    )
