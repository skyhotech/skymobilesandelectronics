from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "brand", "category", "price", "currency", "is_active")
    search_fields = ("name", "sku", "brand__name")
    list_filter = ("is_active", "brand", "category")
    autocomplete_fields = ("brand", "category")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at", "image")
    list_select_related = ("brand", "category")
