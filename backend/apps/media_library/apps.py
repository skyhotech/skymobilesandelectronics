from django.apps import AppConfig


class MediaLibraryConfig(AppConfig):
    name = "apps.media_library"
    verbose_name = "Media library"

    def ready(self):
        from . import checks  # noqa: F401
