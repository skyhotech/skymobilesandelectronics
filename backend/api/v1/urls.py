from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.categories.api import CategoryImageUpload, HomepageCategoryList, PublicCategoryTree
from apps.media_library.api import MediaAssetViewSet, MediaUpload
from apps.products.management_api import management_urlpatterns

from .health import liveness, readiness

media_router = DefaultRouter()
media_router.register("media", MediaAssetViewSet, basename="management-media")

urlpatterns = [
    path("categories/tree/", PublicCategoryTree.as_view(), name="public-category-tree"),
    path("management/media/upload/", MediaUpload.as_view(), name="media-upload"),
    path("management/", include(media_router.urls)),
    path("categories/", HomepageCategoryList.as_view(), name="homepage-categories"),
    path(
        "management/category-images/", CategoryImageUpload.as_view(), name="category-image-upload"
    ),
    path("management/", include(management_urlpatterns)),
    path("health/live/", liveness),
    path("health/ready/", readiness),
]
