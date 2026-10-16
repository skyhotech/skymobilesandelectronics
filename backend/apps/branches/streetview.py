"""Bounded Google-only discovery; never equate imagery availability with storefront proof."""

import json
import logging
import math
import re
import time
from datetime import timedelta
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F, Q
from django.utils import timezone

from .models import Branch, BranchLocationAudit

logger = logging.getLogger(__name__)
FIELDS = "id,displayName,formattedAddress,location,internationalPhoneNumber,businessStatus"


class GoogleError(Exception):
    pass


class NeedsReview(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def request_google(url, payload=None, field_mask=None):
    if not settings.GOOGLE_MAPS_STREETVIEW_ENABLED or not settings.GOOGLE_MAPS_SERVER_API_KEY:
        raise GoogleError("GOOGLE_NOT_CONFIGURED")
    headers = {"Content-Type": "application/json"}
    if field_mask:
        headers.update(
            {"X-Goog-Api-Key": settings.GOOGLE_MAPS_SERVER_API_KEY, "X-Goog-FieldMask": field_mask}
        )
    body = json.dumps(payload).encode() if payload is not None else None
    for attempt in range(3):
        try:
            with build_opener(NoRedirect).open(
                Request(url, data=body, headers=headers), timeout=8
            ) as response:
                data = response.read(1024 * 1024 + 1)
                if len(data) > 1024 * 1024:
                    raise GoogleError("GOOGLE_RESPONSE_TOO_LARGE")
                result = json.loads(data)
                if not isinstance(result, dict):
                    raise GoogleError("GOOGLE_INVALID_RESPONSE")
                return result
        except HTTPError as error:
            code = error.code
            error.close()
            if code not in {429, 500, 502, 503, 504} or attempt == 2:
                raise GoogleError(f"GOOGLE_HTTP_{code}") from None
        except (TimeoutError, URLError):
            if attempt == 2:
                raise GoogleError("GOOGLE_NETWORK_ERROR") from None
        except (ValueError, UnicodeError):
            raise GoogleError("GOOGLE_INVALID_RESPONSE") from None
        time.sleep(2**attempt)
    raise GoogleError("GOOGLE_RETRY_LIMIT")


def canonical(value):
    value = re.sub(r"[^a-z0-9]", "", str(value).lower())
    for source, target in [
        ("thiruvanamalai", "tiruvannamalai"),
        ("thiruvannamalai", "tiruvannamalai"),
        ("thirupattur", "tirupattur"),
        ("thirupathur", "tirupattur"),
        ("sholinghur", "sholingur"),
        ("pudhucherry", "puducherry"),
        ("dharmapurai", "dharmapuri"),
    ]:
        value = value.replace(source, target)
    return value


def coords(location):
    lat = float(location.get("latitude", location.get("lat", float("nan"))))
    lng = float(location.get("longitude", location.get("lng", float("nan"))))
    if (
        not math.isfinite(lat)
        or not math.isfinite(lng)
        or not (-90 <= lat <= 90 and -180 <= lng <= 180)
    ):
        raise GoogleError("GOOGLE_INVALID_COORDINATES")
    return lat, lng


def distance_and_heading(origin, target):
    lat1, lon1, lat2, lon2 = map(math.radians, (*origin, *target))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    hav = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    distance = 6371000 * 2 * math.asin(min(1, math.sqrt(hav)))
    heading = (
        math.degrees(
            math.atan2(
                math.sin(dlon) * math.cos(lat2),
                math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon),
            )
        )
        % 360
    )
    return distance, heading


def candidate_evidence(branch, place):
    name = place.get("displayName", {}).get("text", "")
    address = place.get("formattedAddress", "")
    brand = "sky" in canonical(name) and any(
        word in canonical(name) for word in ["mobile", "electronic", "world"]
    )
    city = bool(branch.city) and canonical(branch.city) in canonical(name + address)
    phone = re.sub(r"\D", "", branch.phone)[-10:]
    phone_match = (
        len(phone) == 10
        and phone == re.sub(r"\D", "", place.get("internationalPhoneNumber", ""))[-10:]
    )
    if phone_match and Branch.objects.exclude(pk=branch.pk).filter(phone=branch.phone).exists():
        phone_match = False
    tokens = set(re.findall(r"[a-z0-9]+", branch.address.lower())) - {
        "no",
        "near",
        "opposite",
        "road",
        "street",
        "the",
    }
    matched = sum(canonical(token) in canonical(address) for token in tokens)
    postcode = re.search(r"\b[0-9]{6}\b", branch.address)
    address_match = (
        len(tokens) >= 4
        and matched >= 4
        and matched / len(tokens) >= 0.75
        and (not postcode or postcode.group() in address)
    )
    expected = re.search(r"-([0-9]+)$", branch.name)
    actual = re.search(r"(?:branch\s*[- ]*|[- ])([0-9]+)\s*$", name, re.I)
    number_conflict = bool(expected and actual and expected.group(1) != actual.group(1))
    unrelated = place.get("businessStatus") == "CLOSED_PERMANENTLY"
    return {
        "brand_match": brand,
        "city_match": city,
        "phone_match": phone_match,
        "address_match": address_match,
        "number_conflict": number_conflict,
        "qualified": brand
        and city
        and not number_conflict
        and not unrelated
        and (phone_match or address_match),
    }


def discover(branch):
    if branch.google_place_id:
        place_id = branch.google_place_id
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,255}", place_id):
            raise GoogleError("INVALID_PLACE_ID")
        place = request_google(
            f"https://places.googleapis.com/v1/places/{place_id}", field_mask=FIELDS
        )
        places = [place]
    else:
        queries = [f"SKY Mobile & Electronics {branch.name} {branch.address or branch.city}, India"]
        if canonical(branch.city) != branch.city.lower():
            queries.append(f"SKY Mobile {canonical(branch.city)} {branch.address}, India")
        places_by_id = {}
        for query in queries[:2]:
            data = request_google(
                "https://places.googleapis.com/v1/places:searchText",
                {"textQuery": query, "regionCode": "IN", "languageCode": "en", "pageSize": 5},
                "places." + FIELDS.replace(",", ",places."),
            )
            for place in data.get("places", [])[:5]:
                if place.get("id"):
                    places_by_id[place["id"]] = place
        places = list(places_by_id.values())
    candidates = []
    qualified = []
    for place in places[:10]:
        evidence = candidate_evidence(branch, place)
        candidates.append({"place_id": place.get("id", ""), "evidence": evidence})
        if evidence["qualified"]:
            qualified.append(place)
    if not candidates and branch.address:
        params = urlencode({"address": branch.address, "key": settings.GOOGLE_MAPS_SERVER_API_KEY})
        result = request_google("https://maps.googleapis.com/maps/api/geocode/json?" + params)
        status = result.get("status")
        if status not in {"OK", "ZERO_RESULTS"}:
            allowed = (
                status
                if status
                in {"REQUEST_DENIED", "OVER_QUERY_LIMIT", "INVALID_REQUEST", "UNKNOWN_ERROR"}
                else "INVALID_RESPONSE"
            )
            raise GoogleError("GEOCODING_" + allowed)
        candidates = [
            {
                "place_id": row.get("place_id", ""),
                "evidence": {"address_only": True, "qualified": False},
            }
            for row in result.get("results", [])[:5]
            if row.get("place_id")
        ]
    branch.location_candidates = candidates
    return qualified[0] if len(qualified) == 1 else None


def apply_place(branch, place):
    place_id = place.get("id", "")
    if (
        not place_id
        or Branch.objects.exclude(pk=branch.pk)
        .filter(google_place_id=place_id, location_verified=True)
        .exists()
    ):
        raise GoogleError("DUPLICATE_OR_INVALID_PLACE")
    lat, lng = coords(place.get("location", {}))
    branch.google_place_id = place_id
    branch.latitude, branch.longitude = (
        Decimal(str(lat)).quantize(Decimal(".0000001")),
        Decimal(str(lng)).quantize(Decimal(".0000001")),
    )
    branch.location_source = "google"
    branch.location_verified = True
    branch.google_data_expires_at = timezone.now() + timedelta(days=29)
    # Do not cache Google business names, phone numbers or formatted addresses.


def check_panorama(branch):
    if branch.latitude is None or branch.longitude is None or not branch.location_verified:
        branch.street_view_status = "needs_review"
        return
    if branch.location_source == "google" and (
        not branch.google_data_expires_at or branch.google_data_expires_at <= timezone.now()
    ):
        raise GoogleError("GOOGLE_COORDINATES_EXPIRED")
    params = urlencode(
        {
            "location": f"{branch.latitude},{branch.longitude}",
            "radius": min(75, settings.GOOGLE_MAPS_MAX_PANORAMA_DISTANCE_M),
            "key": settings.GOOGLE_MAPS_SERVER_API_KEY,
        }
    )
    data = request_google("https://maps.googleapis.com/maps/api/streetview/metadata?" + params)
    status = data.get("status", "INVALID_RESPONSE")
    if status in {"ZERO_RESULTS", "NOT_FOUND"}:
        branch.street_view_status = "unavailable"
        branch.panorama_id = ""
        return
    if status != "OK":
        code = (
            status
            if status in {"OVER_QUERY_LIMIT", "REQUEST_DENIED", "INVALID_REQUEST", "UNKNOWN_ERROR"}
            else "INVALID_RESPONSE"
        )
        raise GoogleError("STREETVIEW_" + code)
    image_date = str(data.get("date", ""))
    branch._imagery_date = image_date if re.fullmatch(r"[0-9]{4}(?:-[0-9]{2})?", image_date) else ""
    panorama = coords(data.get("location", {}))
    distance, heading = distance_and_heading(
        panorama, (float(branch.latitude), float(branch.longitude))
    )
    branch.panorama_latitude, branch.panorama_longitude = panorama
    branch.panorama_distance_m = round(distance, 2)
    branch.panorama_id = str(data.get("pano_id", ""))[:255]
    branch.heading = round(heading, 2)
    branch.street_view_status = (
        "available_nearby"
        if distance <= settings.GOOGLE_MAPS_MAX_PANORAMA_DISTANCE_M and branch.panorama_id
        else "needs_review"
    )
    branch.google_data_expires_at = timezone.now() + timedelta(days=29)


def sync_branch(branch, *, force=False, actor=None, selected_place_id=None, metadata_only=False):
    now = timezone.now()
    if (
        branch.manual_override
        and (not metadata_only or branch.street_view_embed_url)
        and not selected_place_id
    ):
        return "manual_override"
    if not branch.is_showroom or not branch.street_view_enabled:
        return "skipped"
    if (
        not force
        and branch.last_checked_at
        and branch.last_checked_at > now - timedelta(days=1)
        and branch.street_view_status != "pending"
    ):
        return "recently_checked"
    locked = (
        Branch.objects.filter(pk=branch.pk)
        .filter(Q(sync_started_at__isnull=True) | Q(sync_started_at__lt=now - timedelta(minutes=5)))
        .update(sync_started_at=now)
    )
    if not locked:
        return "in_progress"
    branch.sync_started_at = now
    branch.last_checked_at = now
    branch.sync_error = ""
    revision = branch.location_revision
    old_pano = branch.panorama_id
    old_heading = branch.heading
    old_coords = (branch.panorama_latitude, branch.panorama_longitude)
    try:
        if not settings.GOOGLE_MAPS_STREETVIEW_ENABLED or not settings.GOOGLE_MAPS_SERVER_API_KEY:
            raise GoogleError("GOOGLE_NOT_CONFIGURED")
        if not metadata_only:
            if selected_place_id:
                if selected_place_id not in [
                    candidate.get("place_id") for candidate in branch.location_candidates
                ]:
                    raise GoogleError("CANDIDATE_NOT_FOUND")
                if not re.fullmatch(r"[A-Za-z0-9_-]{1,255}", selected_place_id):
                    raise GoogleError("INVALID_PLACE_ID")
                place = request_google(
                    f"https://places.googleapis.com/v1/places/{selected_place_id}",
                    field_mask=FIELDS,
                )
            else:
                place = discover(branch)
            if not place:
                branch.street_view_status = "needs_review"
                branch.location_verified = False
                branch.street_view_verified = False
                raise NeedsReview()
            apply_place(branch, place)
            if selected_place_id:
                branch.manual_override = True
        check_panorama(branch)
        if (
            branch.street_view_status not in {"available_nearby", "storefront_verified"}
            or branch.panorama_id != old_pano
            or old_coords != (branch.panorama_latitude, branch.panorama_longitude)
            or not branch.street_view_verified
        ):
            branch.street_view_verified = False
            branch.last_verified_at = None
        elif branch.street_view_status == "available_nearby":
            branch.heading = old_heading
            branch.street_view_status = "storefront_verified"
    except NeedsReview:
        branch.street_view_status = "needs_review"
        branch.street_view_verified = False
        branch.last_verified_at = None
    except (GoogleError, ValueError, TypeError, KeyError) as error:
        branch.sync_error = (
            str(error) if isinstance(error, GoogleError) else "GOOGLE_INVALID_RESPONSE"
        )
        branch.street_view_status = "error"
        branch.street_view_verified = False
    finally:
        branch.sync_started_at = None
        fields = [
            "manual_override",
            "google_place_id",
            "latitude",
            "longitude",
            "location_verified",
            "location_source",
            "street_view_status",
            "street_view_verified",
            "panorama_id",
            "panorama_latitude",
            "panorama_longitude",
            "panorama_distance_m",
            "imagery_date",
            "heading",
            "pitch",
            "last_checked_at",
            "last_verified_at",
            "google_data_expires_at",
            "location_candidates",
            "sync_error",
            "sync_started_at",
        ]
        values = {field: getattr(branch, field) for field in fields}
        values["location_revision"] = F("location_revision") + 1
        try:
            with transaction.atomic():
                updated = Branch.objects.filter(
                    pk=branch.pk, location_revision=revision, sync_started_at=now
                ).update(**values)
        except IntegrityError:
            branch.street_view_status = "error"
            branch.sync_error = "DUPLICATE_PLACE_CONCURRENT_SYNC"
            updated = Branch.objects.filter(pk=branch.pk, location_revision=revision).update(
                street_view_status="error",
                sync_error=branch.sync_error,
                street_view_verified=False,
                sync_started_at=None,
                last_checked_at=now,
                location_revision=F("location_revision") + 1,
            )
        if not updated:
            Branch.objects.filter(pk=branch.pk, sync_started_at=now).update(sync_started_at=None)
            branch.street_view_status = "needs_review"
            branch.sync_error = "CONCURRENT_EDIT_PRESERVED"
        BranchLocationAudit.objects.create(
            branch=branch,
            actor=actor,
            action="metadata_check" if metadata_only else "sync",
            status=branch.street_view_status,
            note=branch.sync_error,
        )
        logger.info(
            "branch_location_sync branch=%s status=%s", branch.branch_id, branch.street_view_status
        )
    return branch.street_view_status


def coordinates_current(branch):
    return branch.location_source != "google" or bool(
        branch.google_data_expires_at and branch.google_data_expires_at > timezone.now()
    )


def browser_embed_key():
    key = settings.GOOGLE_MAPS_EMBED_API_KEY
    return key if key and key != settings.GOOGLE_MAPS_SERVER_API_KEY else ""


def embed_url(branch, *, preview=False, include_key=True):
    if not branch.street_view_enabled or not branch.is_showroom:
        return ""
    if not preview and (
        not branch.street_view_verified or branch.street_view_status != "storefront_verified"
    ):
        return ""
    if branch.street_view_embed_url:
        return branch.street_view_embed_url
    if not coordinates_current(branch):
        return ""
    if (
        not coordinates_current(branch)
        or not branch.panorama_id
        or not settings.GOOGLE_MAPS_STREETVIEW_ENABLED
        or not browser_embed_key()
    ):
        return ""
    params = {
        "key": browser_embed_key() if include_key else "REDACTED_BROWSER_KEY",
        "pano": branch.panorama_id,
        "heading": branch.heading,
        "pitch": branch.pitch,
    }
    return "https://www.google.com/maps/embed/v1/streetview?" + urlencode(params)


@transaction.atomic
def purge_expired():
    stale = Branch.objects.select_for_update().filter(google_data_expires_at__lte=timezone.now())
    for branch in stale:
        if branch.location_source == "google":
            branch.latitude = branch.longitude = None
            branch.location_verified = False
        branch.panorama_latitude = branch.panorama_longitude = None
        branch.panorama_id = ""
        branch.imagery_date = ""
        if not (branch.street_view_embed_url and branch.manual_override):
            branch.street_view_verified = False
            branch.last_verified_at = None
            branch.street_view_status = "pending"
        branch.google_data_expires_at = None
        branch.location_revision += 1
        branch.save()


def location_embed_url(branch):
    if (
        not branch.is_showroom
        or not branch.location_verified
        or branch.latitude is None
        or not coordinates_current(branch)
        or not browser_embed_key()
        or not settings.GOOGLE_MAPS_STREETVIEW_ENABLED
    ):
        return ""
    query = (
        f"place_id:{branch.google_place_id}"
        if branch.google_place_id
        else f"{branch.latitude},{branch.longitude}"
    )
    return "https://www.google.com/maps/embed/v1/place?" + urlencode(
        {"key": browser_embed_key(), "q": query}
    )
