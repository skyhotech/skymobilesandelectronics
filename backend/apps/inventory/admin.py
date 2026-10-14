from django.contrib import admin

from .models import Stock


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ("product", "branch", "quantity", "reserved", "available", "updated_at")
    list_filter = ("branch",)
    search_fields = ("product__name", "product__sku", "branch__name")
    autocomplete_fields = ("product", "branch")
    readonly_fields = ("reserved", "updated_at")
    list_select_related = ("product", "branch")
