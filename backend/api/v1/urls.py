from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.accounts.apx_customers import CustomerLookup
from apps.accounts.hr_auth import HRSession
from apps.accounts.hr_overview import HROverview
from apps.branches.hr_api import HRBranches
from apps.branches.public_api import StoreLocations
from apps.branches.streetview_api import StreetViewReview
from apps.brands.api import HomepageBrandList
from apps.careers.api import HRJobs, PublicJobs
from apps.categories.api import CategoryImageUpload, HomepageCategoryList, PublicCategoryTree
from apps.chat import api as chat
from apps.inventory.api import InventoryReport
from apps.media_library.api import MediaAssetViewSet, MediaUpload
from apps.notifications.api import BroadcastList
from apps.products.admin_search import ManagementSearch
from apps.products.management_api import management_urlpatterns
from apps.products.public_api import ProductDetail, ProductFilterOptions, ProductList

from .health import liveness, readiness

media_router = DefaultRouter()
media_router.register("media", MediaAssetViewSet, basename="management-media")

hr_router = DefaultRouter()
hr_router.register("careers", HRJobs, basename="hr-careers")

urlpatterns = [
    path("chat/session/", chat.ChatSession.as_view()),
    path("chat/inbox/", chat.Inbox.as_view()),
    path("chat/threads/<int:pk>/messages/", chat.Messages.as_view()),
    path("chat/threads/<int:pk>/read/", chat.ReadMessages.as_view()),
    path("chat/threads/<int:pk>/calls/", chat.Calls.as_view()),
    path("chat/files/<int:pk>/", chat.Attachment.as_view()),
    path("chat/calls/<int:pk>/", chat.CallDetail.as_view()),
    path("chat/calls/<int:pk>/signals/", chat.Signals.as_view()),
    path(
        "hr/branches/<int:pk>/streetview/", StreetViewReview.as_view(), name="hr-streetview-review"
    ),
    path("branches/", StoreLocations.as_view(), name="public-store-locations"),
    path("hr/overview/", HROverview.as_view(), name="hr-overview"),
    path("hr/branches/", HRBranches.as_view({"get": "list", "post": "create"}), name="hr-branches"),
    path(
        "hr/branches/<int:pk>/",
        HRBranches.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="hr-branch-detail",
    ),
    path("hr/", include(hr_router.urls)),
    path("careers/", PublicJobs.as_view(), name="public-careers"),
    path("hr/notifications/", BroadcastList.as_view(), name="hr-notifications"),
    path("hr/session/", HRSession.as_view(), name="hr-session"),
    path("management/customers/lookup/", CustomerLookup.as_view(), name="management-customers"),
    path("management/inventory/", InventoryReport.as_view(), name="management-inventory"),
    path("management/search/", ManagementSearch.as_view(), name="management-search"),
    path("products/", ProductList.as_view(), name="public-product-list"),
    path(
        "products/filters/options/", ProductFilterOptions.as_view(), name="public-product-filters"
    ),
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
