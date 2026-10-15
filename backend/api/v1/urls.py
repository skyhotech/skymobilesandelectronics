from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.brands.api import HomepageBrandList
from apps.categories.api import CategoryImageUpload, HomepageCategoryList, PublicCategoryTree
from apps.media_library.api import MediaAssetViewSet, MediaUpload
from apps.products.admin_search import ManagementSearch
from apps.products.management_api import management_urlpatterns
from apps.products.public_api import ProductDetail, ProductFilterOptions, ProductList

from .health import liveness, readiness

media_router = DefaultRouter()
media_router.register("media", MediaAssetViewSet, basename="management-media")

urlpatterns = [
    path("management/search/", ManagementSearch.as_view(), name="management-search"),
    path("products/", ProductList.as_view(), name="public-product-list"),
    path("products/filters/options/", ProductFilterOptions.as_view(), name="public-product-filters"),
    path("products/<slug:slug>/", ProductDetail.as_view(), name="public-product-detail"),
    path("categories/tree/", PublicCategoryTree.as_view(), name="public-category-tree"),
    path("management/media/upload/", MediaUpload.as_view(), name="media-upload"),
    path("management/", include(media_router.urls)),
    path("categories/", HomepageCategoryList.as_view(), name="homepage-categories"),
    path("brands/", HomepageBrandList.as_view(), name="homepage-brands"),
    path(
        "management/category-images/", CategoryImageUpload.as_view(), name="category-image-upload"
    ),
    path("management/", include(management_urlpatterns)),
    path("health/live/", liveness),
    path("health/ready/", readiness),
]
