from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

admin.site.site_header = "SKY Commerce Management"
admin.site.site_title = "SKY Management"
admin.site.index_title = "Ecommerce administration"

urlpatterns = [
    path("backend/django/admin/", admin.site.urls),
    re_path(
        r"^management/admin/(?P<path>.*)$",
        RedirectView.as_view(
            url="/backend/django/admin/%(path)s", permanent=False, query_string=True
        ),
    ),
    path("admin/", RedirectView.as_view(pattern_name="admin:index", permanent=False)),
    path("api/v1/", include("api.v1.urls")),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(
        "/images/homepage/",
        document_root=settings.BASE_DIR.parent / "frontend/public/images/homepage",
    )
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
    ]
