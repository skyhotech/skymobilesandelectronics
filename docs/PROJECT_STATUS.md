# Project status - 15 October 2026

## Separate HR sign-in - 16 October 2026

Added /hr/login and a protected /hr landing page with distinct HR authentication
endpoints/query state and explicit active-user HR group authorization. Owner status
alone does not grant HR access; HR-only users cannot access management APIs. Shared
Django identity/session storage, CSRF protection, login throttling and existing SKY
login styling/video loader are preserved. No default HR account/password is created.
See docs/HR_ACCESS.md for assigning HR membership and the implemented scope.

Verified: 4 backend HR auth tests, 31 frontend tests, typecheck, lint, OpenAPI and
production build passed. Real local browser HR login/logout/password toggle/group
access and four widths passed; its isolated test user was deleted. Existing owner
login/navbar browser regression also passed. HR screenshot visually reviewed.
No migrations. Production and future employee/payroll workflows remain NOT TESTED.

## APX Customers tab - 16 October 2026

Added owner-only Customers sidebar/search navigation and mobile-number lookup.
Local CSRF-protected POST calls APX GetCustomerList using upstream GET with a fixed
server company code and approved credentials. Results clear on input changes,
are not persisted and have no-store responses. No customer import/login is implied.

Verified: 5 backend tests, browser fixture flow at four widths, typecheck, lint and
production build passed. No live customer record was queried. Configure APX_COMPANY_CODE
and approved APX credentials; see docs/APX_CUSTOMERS.md for the response contract and
verification limits. Existing unrelated working changes are preserved.

## Shared video loader - 16 October 2026

The supplied /videos/loader.mp4 is now the shared full-screen loading animation.
Root loading.tsx handles streamed page/route loading; the query provider covers
active first-data queries and pending mutations. Inventory opts into loading for
manual refresh as well. Cached background polling and typeahead search do not
interrupt the page. The overlay disappears on success or failure, with no artificial
minimum duration. Playback is muted/looping/inline and pauses for reduced motion;
readable loading text remains if playback is unavailable.

Verified: typecheck, lint, 30 unit tests and production build passed. The browser
loader test delayed report responses, checked actual video decoding, four viewport
widths, reduced-motion pause and removal on success/error. Screenshot reviewed.
No backend or credential changes. Production remains NOT TESTED.

## APX inventory report - 16 October 2026

Added Inventory sidebar/search navigation and an owner-only read endpoint that
POSTs ClosingStockBreakupReport server-side with configured credentials and scope.
The report view supports vendor columns, text search, 100-row pagination, manual
refresh and safe empty/error handling. No local stock records are overwritten.

Recovered request property names/types from the supplied APX DLL and report
response conventions from its JavaScript client; see docs/APX_INVENTORY.md.
Live empty POST reached APX but returned business status 201/Failed. Backend APX
credentials and an approved scoped JSON request are not configured. Successful
live inventory retrieval remains NOT VERIFIED; the page honestly reports this.

Verified: 9 backend adapter/permission tests and the inventory browser flow passed,
with fixture-based data clearly distinguished from live stock. Frontend lint,
unit tests and build checked. No credentials are committed and no migrations run.

## Rebuilt dashboard

The dashboard now includes four catalog summary cards, storefront visibility bars,
the five most recently updated products, missing-image/inactive-product counts and
a Themes shortcut. All counts and recent records come from the owner-only overview
API; recent products link to their brand product panel. Empty, loading and failed
refresh states are supported, preserving previously loaded data on a refresh error.
The current homepage/theme and existing catalog management flows are preserved.

Verified: 7 backend overview tests, 30 frontend unit tests, typecheck, lint, Django
system check, OpenAPI validation and production build passed. Two live browser
flows covered real counts, four viewport widths, recent-product navigation, stale
refresh/recovery and brand scrolling. Desktop/mobile dashboard screenshots reviewed.
Mobile Brands controls were compacted and its minimum height corrected to retain
a usable card viewport. No migrations. Production and Playwright MCP NOT TESTED.

## Theme preview card

Default theme now has a live homepage preview card, pointer-driven 3D tilt, Active
badge and Apply theme confirmation. The current homepage remains unchanged;
there are no alternative themes or simulated persistence. Homepage framing is
restricted to the same origin; admin routes retain frame denial.

Verified: theme browser test passed at 390/768/1024/1440px, including actual iframe
content, Apply confirmation, refresh, focus reset, reduced motion and frame headers.
Desktop screenshot visually inspected. Typecheck, lint and production build passed.

## Listing filters and Themes

Added shared validated price filters and owner product status/category/order filters,
plus published-only catalog filter options. Customer catalog now has brand/category
selectors and price bounds. Admin directories add homepage/image/order filters with
safe drag restrictions and reset; global search adds record-type filtering.
Themes sits below Dashboard and shows the existing Default theme selected. No
homepage design, theme persistence, database schema or production settings changed.

Verified: 117 existing backend tests and 11 new filter tests passed; 30 frontend
unit tests, typecheck, lint, production build and OpenAPI validation passed. Browser
checks passed for combined directory/product/catalog filters, range errors, reset,
refresh, record-type search and the protected Themes route at four viewport widths.
The existing optional live-product fixture test was skipped; isolated products were
created and deleted by the filter/search tests. Playwright MCP unavailable; installed
Playwright Test used. Production remains NOT TESTED.

## Global search

Added owner-only `/api/v1/management/search/?q=...`, sticky top-bar suggestions,
keyboard navigation and refresh-safe brand product links. Shared bounded token
search explicitly lowercases database fields and queries, matching across related
catalog data and common synonyms. Scoped admin filters use the same matching.
Homepage search now opens the live catalog instead of filtering sample cards.

Verified: backend full suite 116 passed, then all 12 search tests passed including
the added scoped-filter regression; frontend 28 unit tests, typecheck, lint and
production build passed. Browser checks passed for global record/page navigation,
keyboard selection, refresh, mixed-case live catalog search, mobile homepage search,
empty results and sticky navbar at 390/768/1024/1440px. Isolated records were deleted.
Playwright MCP unavailable; installed Playwright Test used. Production NOT TESTED.

## Dashboard and pinned Brands workspace

Admin root now opens Dashboard, the first navigation item. New owner-only read API
`GET /api/v1/management/overview/` returns real totals/active counts for brands,
categories and products plus brand/category homepage counts using public visibility
rules. The dashboard validates the response, handles errors and supports refresh
plus a 30-second foreground update. No sales, order or revenue data is invented.

Brands summary/directory/filter controls stay in place; cards and directory scroll
independently. Mobile controls compact within the available space. Drag edge-scroll
targets the card viewport. Existing product panels remain available.

Verified: 105 backend tests, 28 frontend tests, typecheck, targeted lint and production
build passed. Live overview/brand-drag tests passed including counts against API,
fixed controls while cards scroll at 390/768/1024/1440px, and saved ordering/homepage
updates. Product CRUD and category navigation regression flows also passed. Final
900px-height browser checks verified a usable card area and independently scrolling
directory; mobile screenshots were visually inspected. Helper copy compacts on mobile.
No migrations. Production, native touch and Playwright MCP remain NOT TESTED.

## Product management inside brand cards

Removed the standalone Products navigation item; admin entry now shows Brands.
Each card opens a brand-specific product panel within the same Brands page. The
existing product editor, image uploads, search, pagination, validation and deletion
are reused; selected brand is fixed in the editor. Back to brands restores the
directory. The old management Products URL redirects to Brands. Public product
pages and existing data are preserved.

Django management products accept optional positive `brand` scope on CRUD. Lists
and detail lookup are constrained; mismatched create/update payloads are rejected.
Unscoped API clients remain compatible. OpenAPI updated; no migrations.

Verified: 99 backend tests, 28 frontend tests, production build, typecheck and
targeted lint passed. Live browser tests passed for scoped product CRUD/image
uploads, excluding another brand's product, fixed-brand form, redirect/back,
responsive layout, brand drag persistence/homepage updates and category navigation.
Temporary test records were cleaned up; existing brand orders restored.
Production, native touch and Playwright MCP remain NOT TESTED.

## Brands workspace matches Categories

Replaced the brand table with the shared Categories workspace styling: summary
tiles, directory sidebar, search/status filters, grid/list controls, large logo
cards, edit/delete actions, add tile and floating drag preview. Card clicks open
the existing brand editor. Brands remain flat; category nesting is unchanged.
Full-directory fetching reuses existing paginated APIs and invalidation keys.
Filtered ordering is disabled; up/down controls and live homepage updates remain.

Frontend unit tests: 28 passed; typecheck, targeted lint and production build
passed. Desktop screenshot visually inspected. No backend changes or migrations.
Both live brand/category browser regressions passed, including brand card editing,
search/layout controls, 390/768/1024/1440px overflow, drag cancellation/persistence
and homepage synchronization. Temporary records were cleaned up.
The prior 89-test backend result was not rerun for this UI-only change. Production,
touch devices and Playwright MCP remain NOT TESTED.

## Brand thumbnails and drag ordering

Admin brand rows now show shared media thumbnails and floating 3D drag previews.
Drop before another row to persist global order; keyboard Move up/Move to end,
Escape/capture-loss cancellation, reduced motion, save/error states and filtered
search protection are included. New owner-only `POST /api/v1/management/brands/move/`
accepts `{id, before}` (null means end), validates IDs and locks/reorders brands in
one transaction. OpenAPI updated; no schema migration.

Verification: 89 backend tests passed. Live browser verified logo loading,
floating preview/cancellation, saving/reload persistence and live storefront order.
Test-created brands were removed and pre-test display orders restored. Touch
devices, production and Playwright MCP remain NOT TESTED.
Frontend: 28 unit tests, typecheck, targeted lint and production build passed.
Backend targeted lint passed, excluding four pre-existing category E501 lines.

## Live homepage brands

"Authorized Retail Partner / Shop Your Favourite Brands" now uses a shared,
Zod-validated TanStack Query feed. Foreground storefronts check every five seconds
and on focus; admin name/logo/order/visibility changes and deletion appear without
navigation. ETag conditional reads return 304 for unchanged public data. Existing
cards survive errors with an automatic retry notice. The public JSON array and
owner-only write permissions are unchanged; no database migration is needed.

Verification: 82 backend tests and 28 frontend unit tests passed. Live Playwright
admin-to-storefront creation/edit/hide/republish/delete, 304, temporary-error
retention/recovery and absence of navigation all passed. Its isolated brand was
removed afterward. Playwright MCP and production remain NOT TESTED.
Typecheck, production build and targeted frontend/backend lint passed. The full
frontend lint scan stalled and was stopped; changed frontend files were linted
successfully instead.

## Development origins and log duplication

Development settings now explicitly trust `http://localhost:3000` and
`http://127.0.0.1:3000` for CSRF/CORS, including existing local environment files
that contain only one alias. Production settings are unchanged. Tokens remain
required; foreign origins/ports are rejected. Django logging stops propagation to
the duplicate root console handler. Targeted security/configuration tests: 16 passed.
Final verification: all 81 backend tests and targeted Ruff passed; live owner
login/logout passed separately in Playwright at both local origins. Production
and Playwright MCP verification remain NOT TESTED.

## Category drag animation

Added a viewport-wide floating category preview with perspective tilt, glow,
highlighted targets and animated sibling movement. Pointer identity/capture,
Escape, blur, invalid drops and reduced-motion preferences are handled; existing
up/down controls and backend reorder permissions remain unchanged.
Verified live owner browser flow: floating preview outside grid, Escape cancellation,
saved reorder, nested navigation, reload persistence, storefront synchronization and
390px overflow check. Test-created categories were removed by its cleanup. Frontend
lint, typecheck and production build passed. Touch-device behavior is NOT TESTED.

## Login Redis outage fix

Docker Engine was stopped, making configured loopback Redis cache/Channels/broker connections time out. Started Docker Desktop and the existing Redis-only Compose service without changing database volumes. Verified PING, cross-process cache access, Channels delivery and broker connection.

Login throttle storage failures now return JSON 503 with Retry-After instead of an unhandled 500. Login fails closed; CSRF, owner authorization and 429 throttling remain enforced. Verification: 76 backend tests passed; two browser tests passed for outage messaging and real owner login/logout at `http://localhost:3000`. Targeted lint passed; existing unrelated E501 lines in management API were excluded from its lint check. Production and Playwright MCP: NOT TESTED. The subsequent development-origin fix above supports both local browser aliases.

Scope: Next.js storefront/admin and Django API. Preserve existing data; no live WordPress changes.

## Current milestone: public catalog

- Added anonymous read-only product list/detail APIs and SSR website pages at `/products` and `/products/{slug}`.
- Search, price/name ordering, pagination and brand/category links use authoritative Django records. Draft products and inactive brands/categories are excluded.
- Reuses media handling; validates API responses with Zod. No cart or checkout success is simulated. Homepage demo product collections remain separate and static.
- No database migration in this slice. Existing database is MySQL; PostgreSQL remains a required, separate migration with data preservation/recovery verification.
- OpenAPI is generated from DRF into `docs/api/management.openapi.yaml` (includes public endpoints despite the historical filename).

## Verification

Final milestone verification:

- Backend: 68 tests passed (including 13 public-catalog regression tests); migration consistency check passed; targeted Ruff passed.
- Frontend: 26 unit tests, typecheck, lint and production build passed.
- Playwright: catalog search/404, live product detail/filtering, and protected-route regression passed (3 tests). Catalog listing/detail overflow checked at 390/768/1024/1440px. Isolated Django fixture was removed afterward.
- Dependency checks: npm production audit reported zero vulnerabilities; pip check passed. Python vulnerability audit is NOT TESTED (pip check checks compatibility, not known vulnerabilities).
- Review corrected long brand/category slug truncation and invalid filter handling. Unique product metadata added. Diff/secret review completed for intended changes.

Playwright MCP is unavailable; installed Playwright Test provides browser coverage. Production, full security audit and deployment remain NOT TESTED.

## Catalog contract and regression runs

`GET /api/v1/products/`: standard DRF page envelope (`count`, `next`, `previous`, `results`). Optional `search` (120 characters), `category`/`brand` (exact slugs, 140 characters), `ordering` (`name`, `-name`, `price`, `-price`) and `page`. Related category/brand must be active; homepage placement is independent. `GET /api/v1/products/{slug}/` returns one published product or 404. Writes are rejected. Prices are decimal strings in INR; no availability or payment guarantees are inferred.

From `frontend`, run `npm run test:e2e -- e2e/catalog.spec.ts e2e/auth-routes.spec.ts` with Django running. The live-product test requires `SKY_CATALOG_TEST_SLUG` naming an isolated active test product whose name matches that slug, price is 12345.00 INR and brand name is `SKY catalog test brand`. Prepare/remove this fixture only against a local test environment; do not use customer/production data. Without the variable that test is explicitly skipped.

Storefront pages use server rendering and no-store fetches rather than a duplicate client cache. The product list uses noindex while catalog/SEO rollout remains incomplete. Browser logs contain nonblocking existing image-sizing and smooth-scroll warnings; no unhandled page errors occurred in the catalog flow.

## Next priorities

1. Privileged MFA and branch-scoped authorization.
2. PostgreSQL migration rehearsal against a separate database and tested data export/restore.
3. Replace homepage demo product collections; then inventory movement/reservations and commerce.
4. CI gates, staging and production acceptance including restore/load/security checks.

## Branch location and Street View milestone ? 2026-10-16

HR Manage Branches now supports location editing, candidate review, individual discovery/metadata refresh, visual confirmation and audit history. The locator includes all 31 showrooms; HEAD OFFICE and MAINLINE RETAILER remain separate. Migrations 0005?0008 are applied locally without replacing MySQL. Automated Google requests are disabled until separate restricted keys and billing are configured; no live panorama or location has been newly verified. JSON/CSV exports are generated locally under `.run/branch-streetview-report`. See `GOOGLE_STREETVIEW.md` for setup, retention and commands.

Validation: mocked backend location tests, frontend direction tests, typecheck/lint, production build, OpenAPI validation and HR browser flow passed. Browser review covered 390/768/1024/1440 px and verification/revocation. Playwright MCP is unavailable; Playwright Test was used. Live Google APIs, production/load testing and deployment are NOT TESTED.

## Staff chat milestone ? 2026-10-16

Implemented HR/employee one-to-one messaging, private attachments/shared-file history, unread/read status, Channels notifications with HTTP fallback, and consent-based WebRTC voice/video calls. Added Employees-group access and a separate employee sign-in; no employee credentials were seeded. Chat migrations applied to the existing local MySQL database.

Validation: 17 backend chat/HR tests passed, including access control and WebSocket tests; two-browser Chrome tests connected local audio/video with synthetic devices, exchanged messages/files and verified responsive layouts, mute, decline and hangup. TypeScript/lint and production build passed. See `STAFF_CHAT.md`. Cross-network TURN, actual cameras/microphones, production load/deployment and closed-browser push are NOT TESTED.
