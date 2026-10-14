from django.contrib import admin

from .models import Brand


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    readonly_fields = ("logo",)
    list_display = ("name", "slug", "is_active", "show_on_homepage", "display_order")
    list_editable = ("show_on_homepage", "display_order")
    list_filter = ("is_active", "show_on_homepage")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
