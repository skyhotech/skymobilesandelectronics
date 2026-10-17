from django.urls import path
from rest_framework.routers import DefaultRouter

from . import api
from .weather import Weather

router = DefaultRouter()
for name, view in [
    ("themes", api.Themes),
    ("schedules", api.Schedules),
    ("festivals", api.Festivals),
    ("carousels", api.Carousels),
    ("slides", api.Slides),
]:
    router.register(name, view, basename=f"experience-{name}")

admin_urls = [
    *router.urls,
    path("settings/", api.AdminSettings.as_view()),
    path("history/", api.History.as_view()),
    path("assets/", api.Assets.as_view()),
    path("health/", api.Health.as_view()),
]
public_urls = [
    path("", api.PublicExperience.as_view()),
    path("weather/", Weather.as_view()),
    path("metrics/", api.Metrics.as_view()),
]
