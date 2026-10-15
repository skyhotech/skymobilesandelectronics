# Changelog

## 2026-10-15 - Native mobile application removed

Removed native app sources, Flutter setup/check commands, IDE launches and the mobile-only guide. Active scope is Next.js website/admin and Django backend. Responsive mobile web remains supported. Earlier entries describe historical work, including the retired native app. External SDK installations are left untouched.

## 2026-10-14 ? Local commerce management foundation

Added the same-origin `/management/admin/login` entry point, compatibility redirects, products/brands/categories/branches/stock administration, database constraints, migrations and authentication/CRUD/permission/browser tests. No sample inventory created. Orders, payments, checkout and customer app synchronization remain incomplete. See ADMIN_ACCESS.md and PROJECT_AUDIT.md for verified scope.

## Custom frontend management

- Added owner-authenticated Next.js management pages at /management/admin and /management/admin/login.
- Added Django management APIs for products, brands and categories with CSRF protection, validation, protected deletion and login throttling.
- Kept native Django administration at /backend/django/admin/.
- Verified 15 backend tests, frontend build/lint and live browser product CRUD; current static storefront and Flutter catalog integration remain pending.

## 2026-10-14 - MySQL migration

Migrated local PostgreSQL records to MySQL sky_commerce, preserving owner access and original recovery copies. Switched Django driver/settings, default database tests, Docker dependencies, Compose templates and startup scripts. Added safe local provisioning, database design documentation and schema-only export. Verified15 backend tests, live frontend product CRUD, migration consistency and an actual native MySQL backup restore. PostgreSQL stopped; production deployment not performed.

## 2026-10-14 - Owner login refresh

Refreshed /management/admin/login with a navy SKY brand panel, cleaner form and responsive mobile header. Added an accessible password visibility eye toggle (masked by default, type=button, keyboard support and pressed state). Typecheck/lint and two Chrome tests passed: password visibility/responsive layout and actual owner login/product CRUD/logout on MySQL. Visually inspected desktop and mobile screenshots. No backend/API changes; Flutter not applicable to this employee web login. Git commit remains unavailable because author/remote are unconfigured.

## 2026-10-14 - Admin sidebar

Moved catalog navigation into a desktop25% sidebar alongside75% main content. Added active navigation styles and compact mobile navigation. Verified1:3 browser geometry, four responsive widths and live product CRUD; production build/typecheck/lint passed. Backend/API and mobile app unchanged. Git author/remote remain unconfigured; no commit created.

## 2026-10-14 - Admin-managed homepage categories

Connected Explore Our Categories to MySQL through public DRF reads and owner-only category management writes. Added optimized image upload, artwork selection, badges, subtitles, starting prices, destinations, order and visibility. Preserved ten existing cards through migration. Added matching Flutter category feed, refresh and failure handling. Removed frontend links to native Django admin and redirected its frontend entry to custom management.24 backend tests,13 browser tests,4 Flutter tests and1 live Flutter/API test passed; frontend build/lint/typecheck and Flutter analyzer passed. Full homepage audit documents all remaining static sections.

## 2026-10-14 - Universal local/VPS media storage

Introduced environment-configured public/private filesystem roots, portable relative FileFields, validated shared uploads, metadata/quotas, WebP variants and protected originals. Preserved and indexed existing local media. Added shared Next.js/Flutter resolvers and fallback components, product/brand upload previews, persistent Compose mounts, Nginx configuration, guarded provisioning and verified-transfer/recreation tools.36 backend,12 frontend unit,14 browser and8 Flutter tests passed locally. Actual Docker/Nginx/VPS/native-device acceptance remains outstanding; no production deployment or readiness claim. See MEDIA_STORAGE.md and MEDIA_IMPLEMENTATION_FILES.md.
