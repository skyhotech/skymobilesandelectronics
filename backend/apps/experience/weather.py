import gzip
import json
import math
from datetime import timedelta
from email.utils import parsedate_to_datetime
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import OpenApiTypes, extend_schema
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .api import PublicThrottle
from .models import ExperienceSettings, WeatherCache

CITIES = {
    "Vellore": (12.9165, 79.1325),
    "Chennai": (13.0827, 80.2707),
    "Bengaluru": (12.9716, 77.5946),
    "Mumbai": (19.0760, 72.8777),
    "Delhi": (28.6139, 77.2090),
}


def condition(symbol, temperature, threshold):
    if "thunder" in symbol:
        return "storm"
    if "snow" in symbol or "sleet" in symbol:
        return "snow"
    if "rain" in symbol:
        return "rain"
    if temperature >= threshold:
        return "sun"
    if "cloud" in symbol:
        return "cloud"
    return "mist" if temperature < 18 else "clear"


def get_weather(city, options):
    now = timezone.now()
    WeatherCache.objects.get_or_create(city=city)
    with transaction.atomic():
        row = WeatherCache.objects.select_for_update().get(city=city)
        refresh = not row.checked_at or (
            now - row.checked_at > timedelta(minutes=15)
            and (not row.expires_at or row.expires_at <= now)
        )
        if refresh:
            # Lease before the bounded network request prevents a cache stampede across workers.
            row.checked_at = now
            row.save(update_fields=["checked_at"])
    if refresh:
        lat, lon = CITIES[city]
        headers = {"User-Agent": "SKYMobile/1.0 https://skymobile.in/", "Accept-Encoding": "gzip"}
        if row.modified:
            headers["If-Modified-Since"] = row.modified
        request = Request(
            f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat:.4f}&lon={lon:.4f}",
            headers=headers,
        )
        try:
            with urlopen(request, timeout=5) as response:
                raw = response.read(1_000_001)
                if len(raw) > 1_000_000:
                    raise ValueError("oversized")
                if response.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                if len(raw) > 4_000_000:
                    raise ValueError("oversized")
                points = json.loads(raw)["properties"]["timeseries"]
                point = min(
                    points, key=lambda p: abs((parse_datetime(p["time"]) - now).total_seconds())
                )
                details = point["data"]["instant"]["details"]
                symbol = point["data"].get("next_1_hours", point["data"].get("next_6_hours"))[
                    "summary"
                ]["symbol_code"]
                temperature, humidity, wind = (
                    float(details[k])
                    for k in ["air_temperature", "relative_humidity", "wind_speed"]
                )
                if not (-90 <= temperature <= 65 and 0 <= humidity <= 100 and 0 <= wind <= 150):
                    raise ValueError("invalid weather")
                # Australian apparent-temperature approximation, explicitly labelled as calculated.
                vapor = (
                    humidity / 100 * 6.105 * math.exp(17.27 * temperature / (237.7 + temperature))
                )
                row.payload = {
                    "temperature": temperature,
                    "apparent": round(temperature + 0.33 * vapor - 0.7 * wind - 4, 1),
                    "symbol": symbol,
                    "forecast_at": point["time"],
                    "cloud": details.get("cloud_area_fraction", 0),
                }
                row.expires_at = (
                    parsedate_to_datetime(response.headers["Expires"])
                    if response.headers.get("Expires")
                    else now + timedelta(hours=1)
                )
                row.modified = response.headers.get("Last-Modified", "")
                row.fetched_at, row.error = now, ""
        except HTTPError as exc:
            if exc.code == 304:
                row.fetched_at, row.error = now, ""
                row.expires_at = now + timedelta(hours=1)
            else:
                row.error = "Provider unavailable"
        except (OSError, ValueError, KeyError, TypeError):
            row.error = "Provider unavailable"
        row.save()
    if not row.payload or not row.fetched_at or now - row.fetched_at > timedelta(hours=6):
        return {
            "city": city,
            "status": "unavailable",
            "condition": "none",
            "attribution": "MET Norway",
        }
    payload = row.payload
    used_temperature = (
        payload["apparent"] if options.get("apparent_temperature", True) else payload["temperature"]
    )
    return {
        **payload,
        "city": city,
        "status": "stale" if row.error else "ready",
        "condition": condition(
            payload["symbol"], used_temperature, options.get("hot_threshold", 35)
        ),
        "night": payload["symbol"].endswith("_night"),
        "fetched_at": row.fetched_at.isoformat(),
        "attribution": "Forecast: MET Norway / CC BY 4.0; apparent temperature calculated by SKY",
    }


class Weather(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [PublicThrottle]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        options = ExperienceSettings.objects.get(pk=1).options
        city = request.query_params.get("city", options.get("city", "Vellore"))
        if city not in CITIES:
            city = options.get("city", "Vellore")
        if not options.get("weather", False):
            return Response({"city": city, "status": "disabled", "condition": "none"})
        response = Response(get_weather(city, options))
        response["Cache-Control"] = "private, max-age=300"
        return response
