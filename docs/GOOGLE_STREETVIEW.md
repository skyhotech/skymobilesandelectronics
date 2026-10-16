# Branch locations and Google Street View

## Current state

HR access: `/hr/login` then **Manage Branches**. **View** opens location details,
Google location map when configured, and the Street View review panel. **Edit**
contains coordinates, place ID, camera heading/pitch, visibility and manual protection.

The original supplied `skydata.xlsx` is the directory source. No complete
`sky_all_branches_streetview.json` file was present. The database preserves 33
identities: 31 showrooms and 2 non-showroom entries (HEAD OFFICE, MAINLINE RETAILER).
No numbering is merged. Stable public IDs derive from immutable database IDs;
SKY identifiers in the pasted partial directory are not assumed to be database IDs.
The public locator includes every active showroom, including missing locations,
with status and a Google search fallback. Non-showrooms stay in HR only.
Existing addresses from SKY's website remain owner-supplied business data.

No real Google API keys are configured, no live API discovery has been verified,
and no storefront panorama has been marked verified. Do not infer unavailable
imagery from missing credentials. Missing setup is reported as GOOGLE_NOT_CONFIGURED.

## External setup

In private `backend/.env` configure:

```dotenv
GOOGLE_MAPS_EMBED_API_KEY=
GOOGLE_MAPS_SERVER_API_KEY=
GOOGLE_MAPS_STREETVIEW_ENABLED=true
GOOGLE_MAPS_MAX_PANORAMA_DISTANCE_M=75
GOOGLE_MAPS_SYNC_DELAY_SECONDS=1
```

Enable Maps Embed API on a dedicated browser key restricted to approved HTTP
referrers (separate localhost and production restrictions). Enable Places API
(New), Geocoding API and Street View Static API on a separate server key,
restricted to those APIs and the backend's public egress IP. Never put the server
key in NEXT_PUBLIC variables. Browser Embed keys are necessarily visible in iframe
URLs; restrict them at Google. No keys are persisted in database embed URLs or reports.
Configure billing, quotas and spend alerts before enabling discovery. Places field
masks deliberately exclude photos/reviews; phone matching requires phone fields
and may use a higher-priced Places SKU. Metadata requests are not billed imagery
requests, but still need proper credentials. No paid calls run in tests.

Publish suitable site Terms of Use and Privacy Policy incorporating the applicable
Google terms/privacy notices before enabling Google Platform in production.
Keep Google attribution visible; do not proxy, scrape or cache panorama imagery.

## Processing

From `backend/`:

```powershell
.venv/Scripts/python.exe manage.py import_branches ../../skydata.xlsx --apply
.venv/Scripts/python.exe manage.py branch_streetview sync --all --dry-run
.venv/Scripts/python.exe manage.py branch_streetview sync --all
.venv/Scripts/python.exe manage.py branch_streetview sync --branch ARNI-1 --force
.venv/Scripts/python.exe manage.py branch_streetview sync --all --retry-errors
.venv/Scripts/python.exe manage.py branch_streetview verify --all
.venv/Scripts/python.exe manage.py branch_streetview report --output ../.run/branch-streetview-report
.venv/Scripts/python.exe manage.py branch_streetview purge
```

`verify` checks metadata only; it never confirms storefront visibility. Processing
is limited to 31 branches by default (max 200 with --limit), paced at >=1 second,
and skips recent checks for a day unless forced. Authentication/quota errors are
recorded as errors. Network/HTTP transient errors retry at most 3 times with
1/2-second backoff and 8-second request timeouts; redirects are not followed.
Per-branch locks recover after five minutes, and optimistic revisions preserve
concurrent HR changes. Manual overrides survive automated discovery even with
--force; use metadata refresh or deliberately remove the protection to rediscover.
No scheduled billable discovery runs. The management command resumes by skipping
recent completed branch records; --retry-errors targets errors.

## Matching and review

Text Search/Place Details compare SKY identity, city/spelling aliases, branch-number
conflicts and a unique branch phone or strong street-address/postcode match.
Multiple strong matches are not auto-selected. A Place ID already verified for
another branch is rejected. Geocoding an address supplies only review candidates,
never automatic proof of business identity. Candidates retain Place IDs and matching
booleans only; Google names, addresses and phone responses are not copied into the DB.

Statuses: pending, needs_review, available_nearby, storefront_verified, unavailable,
error. A metadata OK means nearby imagery only. Distance is checked (75m default),
and an initial bearing toward the location is calculated but is not storefront proof.

In **View -> Location and Street View review**, inspect candidate Google Maps links,
select a candidate, check the confirmation box and write a note before confirming
its location. Preview the panorama and explicitly confirm the storefront with a
note to publish **Explore in 360**. This is a human attestation, not machine vision.
Changing location, manual embed, heading or pitch revokes the prior verification.
Revocation, disable switches, stale Google data or failed checks hide public viewing.

Manual no-key fallback is retained: paste Google Share/Embed HTML or its src.
Only the HTTPS www.google.com/maps/embed?pb=... src is stored; raw HTML, scripts
and event handlers are never rendered. API-key URLs cannot be pasted into this field.
Public viewers use verified generated embeds or human-confirmed manual embeds.
The iframe is created only after a click, in an accessible dialog with Escape/Close
and Google's fullscreen controls. Live Street View coverage needs external validation.

## Retention, security and reports

Google Place IDs remain stable references. API coordinates expire after 29 days,
leaving an hourly cleanup margin before 30 days. Stale API data is hidden immediately;
Celery Beat's hourly `purge-google-location-cache` task deletes expired API coordinates
and panorama metadata. Run Beat/worker in production, or run the purge command hourly
via cron. Owner-supplied manual coordinates are retained. Panorama IDs may change;
keep source address/Place ID and refresh metadata. Image dates are returned transiently
for HR review, not cached as Google content. Do not retain old report exports containing
API coordinates beyond their expiry; include export cleanup in operational retention.
The current offline exports contain no discovered coordinates or keys.

JSON/CSV reports contain Branch ID/Name, Address, Latitude, Longitude, Google Place ID,
Google Maps URL, Street View Embed URL (browser key redacted), status, human verification,
last check and error code. CSV formula-leading strings are escaped. HR audit history
records reviewer/time/action/note without API keys or full Google payloads. HR review
endpoints require session authentication, HR membership and CSRF, with a 12/hour/user
limit and five-minute branch refresh cooldown. Public clients cannot enumerate Google
APIs through these endpoints. All destination URLs are fixed Google hosts.

## Verification

```powershell
.venv/Scripts/python.exe -m pytest tests/test_streetview.py tests/test_branch_locations.py tests/test_branch_crud.py tests/test_branch_import.py
```

External Google responses are mocked, with explicit test-only identifiers and keys.
Browser fixtures verify unpublished panoramas stay hidden, HR review/confirmation,
viewer lazy loading, same-browser locator sync, mobile layout and dialog controls.
No mock storefront confirmations are retained in the real branch directory.

Official references:
- https://developers.google.com/maps/documentation/places/web-service/text-search
- https://developers.google.com/maps/documentation/streetview/metadata
- https://developers.google.com/maps/documentation/embed/embedding-map
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://cloud.google.com/maps-platform/terms/maps-service-terms

When a fresh verified location and browser key are configured, View Location opens
a Google map inside the website (and a map appears in HR branch details). Otherwise
it remains a Google location/search link; missing coordinates are never guessed.
Server and browser keys must differ: generated embeds are blocked when the keys
are identical. The HR review panel reports configuration readiness using booleans
only. Location-status filtering is available in Manage Branches.

Google Place IDs have a database uniqueness constraint (empty IDs use NULL),
so concurrent syncs cannot assign one Google place to two branches. The migration
preserves data and stops for review if pre-existing duplicate Place IDs are found.
Manual share embeds protected by manual override are skipped by metadata-only
checks as well; API coordinate cleanup does not revoke a human-confirmed manual
share embed. No Google images or API keys are stored in those manual sources.
