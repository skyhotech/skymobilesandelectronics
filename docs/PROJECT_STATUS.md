# Project status - 15 October 2026

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
