# Project status - 15 October 2026

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
