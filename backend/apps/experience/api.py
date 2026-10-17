import copy

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.utils import OpenApiTypes, extend_schema
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.products.management_api import OwnerPermission

from .models import (
    CampaignMetric,
    Carousel,
    CarouselSlide,
    ExperienceAsset,
    ExperienceRevision,
    ExperienceSettings,
    FestivalEvent,
    Theme,
    ThemeSchedule,
    WeatherCache,
)
from .schemas import DEFAULT_OPTIONS, Options
from .serializers import (
    CarouselSerializer,
    FestivalSerializer,
    ScheduleSerializer,
    SlideSerializer,
    ThemeSerializer,
    json_safe,
)
from .services import (
    experience,
    locked_state,
    media_data,
    record,
    resolve_theme,
    snapshot,
    valid_theme,
)


class AdminThrottle(UserRateThrottle):
    rate = "90/min"
    scope = "experience_admin"


class PublicThrottle(AnonRateThrottle):
    rate = "120/min"
    scope = "experience_public"


@method_decorator(never_cache, name="dispatch")
class ManagedViewSet(viewsets.ModelViewSet):
    permission_classes = [OwnerPermission]
    throttle_classes = [AdminThrottle]
    pagination_class = None

    def perform_create(self, serializer):
        with transaction.atomic():
            state = locked_state()
            obj = serializer.save()
            record(state, self.request.user, f"create:{obj._meta.model_name}:{obj.pk}")

    def perform_update(self, serializer):
        with transaction.atomic():
            state = locked_state()
            obj = serializer.save()
            record(state, self.request.user, f"edit:{obj._meta.model_name}:{obj.pk}")

    def perform_destroy(self, instance):
        with transaction.atomic():
            state = locked_state()
            if isinstance(instance, Theme):
                if (
                    instance.is_default
                    or state.active_theme_id == instance.pk
                    or resolve_theme(state).pk == instance.pk
                ):
                    raise serializers.ValidationError(
                        "Apply a replacement first. The default cannot be removed."
                    )
            label = f"remove:{instance._meta.model_name}:{instance.pk}"
            if hasattr(instance, "archived"):
                instance.archived = True
                instance.save(update_fields=["archived"])
            else:
                instance.delete()
            record(state, self.request.user, label)


class Themes(ManagedViewSet):
    queryset = Theme.objects.filter(archived=False)
    serializer_class = ThemeSerializer

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        with transaction.atomic():
            state = locked_state()
            theme = self.get_object()
            if not valid_theme(theme):
                raise serializers.ValidationError("Theme validation failed; check its assets.")
            state.active_theme, state.mode = theme, "manual"
            record(state, request.user, f"apply:{theme.pk}")
        return Response(experience())

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        theme = self.get_object()
        if not valid_theme(theme):
            raise serializers.ValidationError("Theme is unavailable.")
        return Response(experience(preview=theme))

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        import uuid

        original = self.get_object()
        with transaction.atomic():
            state = locked_state()
            theme = Theme.objects.create(
                name=f"{original.name[:80]} copy",
                slug=f"copy-{uuid.uuid4().hex[:16]}",
                category=original.category,
                description=original.description,
                config=copy.deepcopy(original.config),
            )
            record(state, request.user, f"duplicate:{theme.pk}")
        return Response(self.get_serializer(theme).data, status=201)


class Schedules(ManagedViewSet):
    queryset = ThemeSchedule.objects.all().order_by("start_at")
    serializer_class = ScheduleSerializer


class Festivals(ManagedViewSet):
    queryset = FestivalEvent.objects.all()
    serializer_class = FestivalSerializer

    @action(detail=False, methods=["post"])
    def sync(self, request):
        from .festivals import sync_year

        year = serializers.IntegerField(min_value=2020, max_value=2100).run_validation(
            request.data.get("year")
        )
        with transaction.atomic():
            state = locked_state()
            count = sync_year(year)
            record(state, request.user, f"calendar-sync:{year}")
        return Response({"created": count})


class Carousels(ManagedViewSet):
    queryset = Carousel.objects.filter(archived=False)
    serializer_class = CarouselSerializer

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        with transaction.atomic():
            state = locked_state()
            carousel = self.get_object()
            ids = serializers.ListField(child=serializers.IntegerField()).run_validation(
                request.data.get("ids")
            )
            slides = {s.pk: s for s in carousel.slides.filter(archived=False)}
            if len(ids) != len(set(ids)) or set(ids) != set(slides):
                raise serializers.ValidationError("Send each current slide exactly once.")
            for index, pk in enumerate(ids):
                slides[pk].sort_order = index
            CarouselSlide.objects.bulk_update(slides.values(), ["sort_order"])
            record(state, request.user, f"reorder:{carousel.pk}")
        return Response({"ids": ids})


class Slides(ManagedViewSet):
    queryset = CarouselSlide.objects.filter(archived=False).select_related(
        "asset__media", "carousel"
    )
    serializer_class = SlideSerializer


@method_decorator(never_cache, name="dispatch")
class AdminSettings(APIView):
    permission_classes = [OwnerPermission]
    throttle_classes = [AdminThrottle]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        state = ExperienceSettings.objects.get(pk=1)
        return Response(
            {
                **snapshot(state),
                "revision": state.revision,
                "options": {**DEFAULT_OPTIONS, **state.options},
            }
        )

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    def patch(self, request):
        with transaction.atomic():
            state = locked_state()
            if request.data.get("revision") != state.revision:
                return Response({"detail": "Settings changed. Refresh before saving."}, status=409)
            mode = request.data.get("mode", state.mode)
            if mode not in ["manual", "automatic"]:
                raise serializers.ValidationError("Choose manual or automatic mode.")
            options = Options(
                data={**DEFAULT_OPTIONS, **state.options, **request.data.get("options", {})}
            )
            options.is_valid(raise_exception=True)
            state.mode, state.options = mode, json_safe(options.validated_data)
            record(state, request.user, "settings")
        return self.get(request)


class History(APIView):
    permission_classes = [OwnerPermission]
    throttle_classes = [AdminThrottle]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        return Response(
            list(
                ExperienceRevision.objects.values(
                    "id", "revision", "action", "snapshot", "created_at", "actor__username"
                )[:100]
            )
        )

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        revision = serializers.IntegerField().run_validation(request.data.get("revision"))
        with transaction.atomic():
            state = locked_state()
            previous = ExperienceRevision.objects.filter(revision=revision).first()
            if not previous:
                raise serializers.ValidationError("Revision not found.")
            saved = previous.snapshot
            theme = Theme.objects.get(pk=saved["active_theme"])
            if theme.archived:
                raise serializers.ValidationError("Restore an available theme.")
            ThemeSerializer(data={**saved["theme"], "slug": f"rollback-{state.revision}"})
            # Validate the snapshot without overwriting a protected default.
            if not theme.is_default:
                from .schemas import ThemeConfig

                checked = ThemeConfig(data=saved["theme"]["config"])
                checked.is_valid(raise_exception=True)
                theme.config = checked.validated_data
                if not valid_theme(theme):
                    raise serializers.ValidationError("Snapshot assets are unavailable.")
                theme.save()
            state.active_theme, state.mode, state.options = theme, "manual", saved["options"]
            record(state, request.user, f"rollback:{revision}")
        return Response(experience())


class Assets(APIView):
    permission_classes = [OwnerPermission]
    parser_classes = [MultiPartParser]
    throttle_classes = [AdminThrottle]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        data = []
        themes = list(Theme.objects.filter(archived=False).values("id", "config"))
        for asset in ExperienceAsset.objects.select_related("media", "poster").filter(
            media__is_archived=False
        ):
            refs = [t["id"] for t in themes if asset.pk in t["config"].get("asset_ids", [])]
            data.append(
                {
                    **media_data(asset),
                    "themes": refs,
                    "slides": list(
                        asset.carouselslide_set.filter(archived=False).values_list("id", flat=True)
                    ),
                }
            )
        return Response(data)

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        upload = serializers.FileField().run_validation(request.FILES.get("file"))
        from .media import upload_asset

        asset = upload_asset(upload, request.user, request.data.get("purpose") == "carousel")
        return Response(media_data(asset), status=201)


class PublicExperience(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PublicThrottle]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        response = Response(experience())
        response["Cache-Control"] = "no-store"
        return response


class Health(APIView):
    permission_classes = [OwnerPermission]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        data = experience()
        return Response(
            {
                "active_theme": data["theme"]["name"],
                "revision": data["revision"],
                "missing_themes": [
                    t.name for t in Theme.objects.filter(archived=False) if not valid_theme(t)
                ],
                "upcoming": ScheduleSerializer(
                    ThemeSchedule.objects.filter(
                        enabled=True, start_at__gt=timezone.now()
                    ).order_by("start_at")[:5],
                    many=True,
                ).data,
                "weather": list(WeatherCache.objects.values("city", "fetched_at", "error")),
                "carousels": len(data["carousels"]),
                "metrics": list(CampaignMetric.objects.order_by("-date").values()[:100]),
            }
        )


class Metrics(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PublicThrottle]

    @extend_schema(request=OpenApiTypes.OBJECT, responses={204: None})
    def post(self, request):
        pk = serializers.IntegerField().run_validation(request.data.get("slide"))
        event = request.data.get("event")
        allowed = {s["id"] for c in experience()["carousels"] for s in c["slides"]}
        if pk not in allowed or event not in ["impressions", "clicks"]:
            raise serializers.ValidationError("Unknown published campaign event.")
        metric, _ = CampaignMetric.objects.get_or_create(slide_id=pk, date=timezone.localdate())
        CampaignMetric.objects.filter(pk=metric.pk).update(**{event: F(event) + 1})
        return Response(status=204)
