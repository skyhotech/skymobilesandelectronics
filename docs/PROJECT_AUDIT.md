# SKY platform repository audit

Audit date: 14 October 2026 (Asia/Calcutta). This is a read-only source and environment inspection, apart from this document. Implementation in the shared workspace is continuing; new catalog/admin work is identified separately from the baseline. No production system or WordPress installation was changed.

## Actual state

The monorepo exists and must be preserved. The customer website has a substantial locally rendered homepage and optimized artwork. Django has a working foundation, PostgreSQL configuration, built-in administration and health endpoints. Flutter is an application scaffold rather than a commerce application. Installing packages and reserving feature directories does not mean those features are implemented.

Git is initialized on an unborn `master` branch: no commits and no configured remote were found. Top-level application directories are untracked. A first baseline commit must deliberately include the reviewed existing work; this audit does not discard or stage it. Ignored local environments, tools, uploads and caches are excluded by `.gitignore`.

## Technology inventory

| Area | Inspected configuration / installed evidence |
| --- | --- |
| Frontend | Next.js 16.4.0, React 19.3.0, strict TypeScript, Tailwind 4, TanStack Query 5.104.2, React Hook Form 7.90.0, Zod 3.25.76 |
| Frontend checks | ESLint 9, Vitest 5.0.4, Playwright Test 1.64.0; package-lock present |
| Python | Virtual environment Python 3.13.16; pyproject targets Python 3.13 |
| Backend | Installed Django 5.2.18, DRF 3.16.1, Channels 4.3.2, Celery 5.6.3, Pillow 12.3.0, psycopg 3.3.6; Redis and OpenAPI tooling configured |
| Python locking | Hash-locked base/development requirements with separate input files |
| Mobile | Local SDK metadata Flutter 3.47.7 / Dart 3.13.5; Riverpod, Dio, go_router, secure storage, cached images and WebSocket packages declared; pubspec.lock present |
| Local tooling | Local Node 24.21.0, Git, PostgreSQL and Flutter binaries in ignored `.tools`; a separate Flutter executable is also available on PATH |
| Infrastructure | Development Compose for PostgreSQL 17 and Redis 7.4; initial non-root frontend/backend Dockerfiles; static-media Nginx snippet |

Framework versions above come from local manifests, package metadata and SDK metadata. No online compatibility or vulnerability claims are implied.

## Feature implementation matrix

“Present” describes inspected source, not freshly passed acceptance tests.

| Feature | Django / data | Next.js | Flutter | Contract / tests / security |
| --- | --- | --- | --- | --- |
| Bootstrap and health | Settings, ASGI, Celery wiring, live/ready endpoints present | Providers and configuration present | Router, Dio provider and launch screen present | Health tests present; dependency readiness includes PostgreSQL and Redis |
| Homepage | No baseline homepage content API | Rich static homepage, categories, brands, banners and imagery | Initialization message only | Browser suite present; website content is not authoritative inventory |
| Administration login | Built-in Django session authentication at `/backend/djngo/admin/` | Existing `/admin` shortcut; requested `/management/admin/login` integration being implemented | Customer app does not require Django staff admin UI | Built-in staff permissions and CSRF; existing admin access tests |
| Catalog, brands, categories, branches | Reserved directories at baseline; models/admin/migrations being added during this task | Homepage product samples; public API integration remains future work | No catalog screen | No baseline shared generated TypeScript/Dart contract |
| Inventory and pricing | Initial inventory/catalog admin work in progress | Display prices are reference content | Missing | Concurrent reservations, movements and availability consistency require a later slice |
| Customer identity and roles | Standard Django users/groups; no customer authentication API or MFA | Account action is not customer identity implementation | Missing | Branch-scoped authorization and privileged MFA remain unimplemented |
| Wishlist and cart | No baseline persistence endpoints | Local-storage wishlist and product enquiry dialogs; no real checkout cart | Missing | Browser interaction coverage exists; no cross-device state |
| Orders and payments | Reserved modules, no transactional checkout | Missing | Missing | No gateway, idempotency, reservations, webhook verification or order acceptance tests |
| Uploads / image pipeline | No validated upload-to-Celery pipeline | Prebuilt optimized static assets | Cache package only | Nginx delivery snippet is a plan foundation, not a verified upload system |
| Real time | Channel layer configured; no WebSocket consumer routes | No authoritative commerce event subscriptions | WebSocket dependency only | No reconnect/resynchronization or event authorization tests |
| AI, CCTV, reports, notifications | Reserved/missing | Missing | Missing | No live integration or security verification |
| Backup, maintenance, migration | Local PostgreSQL startup helper; no verified encrypted restore pipeline | No durable maintenance control | Missing | No production rollback or WordPress migration verification |

The requested management URL should expose genuine Django-backed operations with authenticated permissions. Orders, payments and other unimplemented modules must not be advertised as functioning simply because they appear in navigation. The current step is the administration entry point and foundational catalog management, not completion of all e-commerce operations.

## Source and environment findings

| Severity | Finding | Safe correction |
| --- | --- | --- |
| High | No committed recovery baseline or remote | Review intended files and secret exclusions, create baseline, configure approved development remote before claiming push |
| High | Commerce data, checkout and customer APIs missing | Implement authoritative DRF contracts and synchronized Django/Next/Flutter vertical slices |
| High | Production deployment incomplete | Add resource-aware production Compose, TLS/proxy, health checks, backups and tested recovery before release |
| High | MFA, branch-scoped authorization, login throttling and sensitive-operation auditing not implemented | Add and test explicit policies before exposing privileged operations publicly |
| Medium | Redis not listening on local port 6379 during inspection | Start an approved local Redis service or development Compose; readiness is expected to fail until its dependencies are healthy |
| Medium | Saved npm audit report records five high-severity development-tool findings | Refresh audit during a dedicated dependency review; assess compatible fixes without forced major upgrades |
| Medium | Static storefront and Flutter scaffold are not connected to Django catalog | Establish public read contract and consume it in both clients before representing inventory as live |
| Medium | CI directory contains only `.gitkeep` | Add reproducible lint, typecheck, backend, browser, mobile and secret checks |
| Medium | Prior verification document predates current homepage and local PostgreSQL work | Keep dated historical results separate from current run evidence |

Environment templates exist at the root, backend and frontend. Actual secret environment contents were not read for this audit. Backend reads environment configuration and defaults to authenticated DRF permissions. Production settings enable HTTPS redirect, secure cookies, HSTS and frame denial; this is configuration evidence, not a complete production security review. No CSP, comprehensive API throttling or upload-validation implementation was verified.

The media Nginx snippet uses immutable caching and a narrow static location. Dockerfiles use non-root runtime users. Production Compose, TLS termination, deployment health verification, encrypted off-host backups and restore rehearsal are absent. Existing infrastructure is not production-ready.

## Tools and checks

Executed during this audit:

- Inspected source, configuration templates, lockfiles, existing test files, documentation, Git status/branch/remotes and listening ports.
- Read installed Python library versions and local Flutter SDK metadata.
- Ran backend `python -m pip check`: **passed**, no broken requirements found.
- Discovered available tool metadata: no Playwright MCP/browser tools exposed to this agent. Installed Playwright Test remains available for reproducible browser checks.
- PostgreSQL was listening on loopback port 5432 and its owning process was the project's local PostgreSQL executable. Ports 3000 and 8000 were occupied at the initial snapshot; those process IDs exited before a later lookup, so availability must be refreshed before testing. No processes were terminated by this audit.
- `docker`, `maestro`, `adb` and `java` were not found on the current PATH. This does not prove the Android SDK/JDK are absent from the computer. Check configured SDK paths and `flutter doctor` when mobile build work begins. No connected device was verified.

Not run by this audit: frontend build/lint/typecheck, pytest, migrations, Flutter analyzer/widget tests/build, Maestro, fresh vulnerability scans, load tests, live payment tests, Docker builds or production security checks. Other task verification should be reported with its own command results. iOS native compilation cannot be claimed on this Windows host.

## Test coverage gaps

Backend baseline has five tests covering health and built-in admin access. They do not establish business correctness. Existing Playwright tests exercise homepage assets, interactions, header/categories, animation and the admin shortcut, but they do not establish customer checkout or staff commerce authorization. Flutter has one launch widget test and an empty integration-test directory. No Maestro flows, generated-client contract tests, concurrent stock tests, payment webhook tests or restore tests were found at baseline.

New business models require PostgreSQL-backed constraint/concurrency checks; SQLite foundation tests alone cannot establish PostgreSQL transaction correctness. Admin tests must include anonymous users, nonstaff users, limited-permission staff, validation and CSRF. Browser verification should cover 1440, 1024, 768 and 390px as applicable.

## Safe implementation sequence

1. Preserve source and establish a reviewed Git baseline; document unavailable tools and service prerequisites.
2. Deliver the requested management login/path integration using real Django authentication, catalog administration and explicit limits for missing operations.
3. Define versioned public catalog contracts; implement product/category/brand/branch reads and consume them in Next.js and Flutter together.
4. Add customer authentication, granular staff roles and branch authorization before expanding sensitive operations.
5. Add persistent wishlist/cart, then transaction-safe stock reservations, orders and sandbox payment processing across all clients.
6. Add validated bounded media jobs, targeted real-time updates, AI fallbacks and operational controls as independently verified slices.
7. Establish CI, security review, monitoring, encrypted backups with a real restore test, staging and an approved WordPress migration plan.

The existing WordPress site remains the live site until an explicitly approved migration. No part of this audit certifies production readiness.


## Verified management milestone ? 2026-10-14

- Backend: five new domain apps and initial migrations applied to local PostgreSQL. Nine tests passed against PostgreSQL using a separate test database; SQLite test run also passed. Django system checks, migration drift and scoped Ruff checks passed.
- Frontend: `/management/admin/login` proxies to Django, including static assets and session/CSRF behavior. Trailing-slash rewrite loop reproduced and fixed by forwarding canonical slash-terminated admin URLs.
- Browser: ten storefront regression tests passed. The credential-dependent management test was skipped in that run and executed separately against localhost:3000: login, authenticated dashboard, temporary-brand create/delete, logout and 1440/1024/768/390 px layout checks passed. Playwright MCP unavailable; installed Playwright Test was used.
- Flutter: unchanged; employee administration is website-only in this slice. Customer catalog API and Flutter synchronization remain incomplete.
- Security: password login, CSRF-protected live form submissions and model-level admin permissions verified. Owner MFA, login rate limiting, branch-scoped operational roles and production hardening remain required.
- Git: no commit or push; repository has no configured author identity, baseline commits or remote. No credentials were added to source. Existing uncommitted work preserved.
- Deployment: local only. No changes to live WordPress, DNS or production.
- Next action: define authoritative catalog API contracts and connect customer storefront/Flutter to persisted catalog data before order/payment workflows.

## Frontend management update

The /management/admin route now serves a custom Next.js owner dashboard, with product, brand and category CRUD through Django session-authenticated APIs. Native Django administration is at /backend/django/admin/. Backend regression suite: 15 passed against local PostgreSQL. OpenAPI schema validated. Frontend production build and lint passed. Live browser verification is recorded separately after completion. Storefront catalog consumption, Flutter catalog screens, media, orders and payments remain incomplete. No production readiness claim is made. Git has no configured author/remote and an unborn baseline; changes have not been committed or pushed.

### Verified custom frontend management

The live custom dashboard browser test passed: owner login, brand/category creation, product creation, price edit, product deletion, test-data cleanup, logout and responsive checks at 1440/1024/768/390 px. Fixed accessible field names and narrowed the Tailwind loader to globals.css so CSS-module exports remain intact. No Playwright MCP tool is exposed; installed Playwright Test and Chrome were used. Flutter is not applicable to this employee-only dashboard; customer catalog integration remains deferred. No deployment performed.

## 2026-10-14: PostgreSQL to MySQL migration

- Active backend, environment templates, hash-locked Python dependencies, setup scripts and development Compose now use MySQL/mysqlclient. Existing frontend/Flutter API contracts are unchanged.
- Local installed server: MySQL 8.0.46 (MySQL80 Windows service), database sky_commerce, schema-scoped application user sky. Local requested password is stored only in ignored environment files. Compose uses MySQL8.4; Docker execution remains unverified because Docker is unavailable.
- Preserved PostgreSQL native backup, portable records, source environment and original data directory under ignored .run. PostgreSQL stopped; old helper archived. New MySQL native backup restored successfully into an isolated temporary database, which was removed afterward.
- Migrated 16 application records (owner1, sessions8, brand1, category1, admin log5); counts verified before browser test changes. Verified15 InnoDB tables,9 CHECK constraints, utf8mb4_0900_as_cs and23 applied migrations. No schema drift.
- Tests:15 passed using MySQL through both development settings and default testing settings. Live Chrome frontend owner/product CRUD passed while PostgreSQL was stopped. Scoped Ruff and pip check passed. Updated negative-stock regression to expect MySQL unsigned integer DataError without weakening validation; invalid update leaves quantity unchanged.
- Redis not changed; named-timezone SQL tables not provisioned; Docker image/Compose not executed; Flutter/native iOS not rerun for this backend engine migration. Production hardening and nonimplemented commerce modules remain deferred.
- Git remains an unborn/untracked baseline without author identity or remote; no commit or push created. Local deployment only.

## 2026-10-14 - Homepage category vertical slice

Audited every homepage section in docs/HOMEPAGE_ADMIN_AUDIT.md. Existing admin category CRUD was disconnected from hardcoded website cards. Added MySQL category presentation fields, constraints and a preserving migration for the ten original cards. Custom Categories editor now manages image upload/artwork, badge, subtitle, optional starting price, target section, display order, visibility and active state. Public DRF categories feed filters and sorts authoritative data. Website SSR and Flutter Riverpod/Dio read this feed. Frontend native-Django-admin entry redirects to the custom dashboard; removed native admin navigation links.

Verified24 backend tests against MySQL;13 Playwright/Chrome browser tests including real admin upload/create/edit/hide/delete-to-homepage flow; frontend production build/typecheck/lint; Flutter analyze and4 widget/unit tests;1 actual Flutter-provider-to-DRF API integration test; OpenAPI validation; no migration drift; scoped Ruff. No Playwright MCP exposed, so installed Playwright Test used. No Maestro or Android device/emulator detected; Android/iOS device E2E and production Nginx/Docker deployment remain unverified. Uploaded originals/variants retained safely; synchronous media processing and local-cache throttling limitations recorded in audit. Other homepage sections remain static pending separate integrated features. Git author/remote absent; no commit/push created.

## 2026-10-14 - Universal persistent filesystem media

Audit: only categories previously uploaded images, using direct MEDIA_ROOT writes and URL strings; no product/brand FileFields, no persistent app Compose mounts, no shared client resolvers, and originals inside the public directory. Preserved existing working content and MySQL configuration.

Implemented standard public filesystem storage and a separate URL-less private filesystem storage. Native defaults are data/media and data/private-media; containers consistently use /app/media and /app/private-media. Added relative FileFields for categories/products/brands, safe normalization migration, asset metadata/status/checksums and a row-locked quota ledger. Preserving copy/index commands verified16 existing files and indexed12 initial assets without deleting old files. Native MySQL backup retained at .run/pre-universal-media.sql. Current audit reports no missing media references.

Added shared validated upload service, protected original downloads, archive-only metadata deletion, private/public isolation, per-image size/pixel/format checks, WebP variants, disk thresholds and bounded upload quotas. Website and Flutter now use centralized environment-based resolvers with placeholders. Product/brand previews and category uploads use the shared implementation; banner/media kinds are supported by the generic API/component, without claiming a completed banner CMS.

Verification:36 backend tests passed, including storage/relocation/permission/quota/retention and transfer receiver checks;12 frontend URL unit tests passed;14 real Chrome browser tests passed, including uploads/previews/banner/fallback behavior;8 Flutter tests passed including the actual DRF provider test. Frontend production build/typecheck/lint, Flutter analyzer, scoped Ruff, Django checks, migration consistency and OpenAPI validation passed. Actual local smoke upload/public retrieval passed; import/index were safely rerun; database category and asset file values were checked for relative filenames. Provisioning embedded Python and transfer/smoke scripts parse successfully.

Prepared development/production bind mounts, private isolation, HTTPS Nginx template, guarded VPS provisioning, checksum-verified SSH/SCP migration with no-overwrite behavior and an explicit upload/recreation verification script. Docker, Nginx, Maestro and an approved VPS are unavailable, so no container recreation, nginx -t, Linux permissions, remote SSH transfer, production HTTPS or native device E2E pass is claimed. The feature is locally verified but not fully deployment-verified. Details: docs/MEDIA_STORAGE.md; file inventory: docs/MEDIA_IMPLEMENTATION_FILES.md. Git author and remote remain unconfigured; no commit/push or deployment performed.
