# Media implementation file inventory

These application/configuration files were added or updated for universal filesystem storage. Existing unrelated project work was preserved.

## Backend

- backend/config/settings/base.py — environment roots, standard storage aliases, limits and permissions.
- backend/config/settings/production.py — trusted HTTPS proxy handling.
- backend/Dockerfile and backend/.env.example — fixed container paths and native settings.
- backend/api/v1/urls.py — universal owner media routes.
- backend/apps/media_library/__init__.py, apps.py — registered media app.
- backend/apps/media_library/storage.py — private filesystem storage and relative-reference validation.
- backend/apps/media_library/models.py — asset metadata and quota ledger.
- backend/apps/media_library/services.py — validated image processing and storage/quota handling.
- backend/apps/media_library/api.py — upload, metadata, archive and protected original download.
- backend/apps/media_library/checks.py — reject overlapping public/private roots.
- backend/apps/media_library/migrations/0001_initial.py and migrations/__init__.py — media schema.
- backend/apps/media_library/management/__init__.py and management/commands/__init__.py — command packages.
- backend/apps/media_library/management/commands/import_local_media.py — preserving/checksummed legacy copy.
- backend/apps/media_library/management/commands/index_media.py — legacy metadata/quota reconciliation.
- backend/apps/media_library/management/commands/audit_media.py — missing references and disk reporting.
- backend/apps/categories/models.py, api.py, admin.py — storage-backed category images and common uploader.
- backend/apps/categories/migrations/0004_relative_media_files.py — one-time relative-filename conversion.
- backend/apps/products/models.py, management_api.py, admin.py — product images and serialization.
- backend/apps/products/migrations/0002_product_image.py — product FileField.
- backend/apps/brands/models.py, admin.py — brand logo FileField and guarded recovery UI.
- backend/apps/brands/migrations/0002_brand_logo.py — brand FileField.
- backend/tests/test_homepage_categories.py — adapted storage contract tests.
- backend/tests/test_media_storage.py — validation, private originals, replacement, quota, failure and relocation tests.
- backend/tests/test_media_transfer.py — checksum/no-overwrite receiver and Compose mount checks.

## Website

- frontend/src/lib/media.ts and media.test.ts — centralized URL/upload helpers and resolver tests.
- frontend/src/lib/categories.ts — storage URL validation.
- frontend/src/lib/categories-server.ts — internal/public API origin separation.
- frontend/src/components/media/media-image.tsx — responsive images and fallback.
- frontend/public/images/image-placeholder.svg — local fallback artwork.
- frontend/src/components/home/category-collection.tsx — common media component.
- frontend/src/components/management/category-form.tsx — shared upload/persistent artwork paths.
- frontend/src/components/management/media-upload-field.tsx — product/brand media input.
- frontend/src/components/management/dashboard.tsx — product/brand attachment and pending state.
- frontend/next.config.ts, .env.example, Dockerfile — media permissions/proxy/build configuration.
- frontend/vitest.config.mts — separate unit tests from browser suites.
- frontend/e2e/admin-management.spec.ts — product/brand upload previews.
- frontend/e2e/media.spec.ts — real banner and missing-image browser verification.
- frontend/e2e/homepage.spec.ts — accept portable storage-delivered images.

## Flutter

- mobile_app/lib/core/api/media_url.dart — shared API/media-origin resolver.
- mobile_app/lib/shared/widgets/media_image.dart — cached image/placeholder widget.
- mobile_app/lib/features/categories/homepage_categories.dart — central resolver consumption.
- mobile_app/lib/features/home/home_screen.dart — reusable media widget.
- mobile_app/test/media_test.dart — origins, path safety and image fallbacks.

## Infrastructure and operations

- .gitignore — persistent public/private upload exclusions.
- compose.dev.yml — opt-in backend and read-only media server bind mounts.
- compose.prod.yml — persistent VPS mounts, private isolation, resource limits and HTTPS proxy stack.
- infrastructure/nginx/media.conf — development public-image allowlist.
- infrastructure/nginx/production.conf.template — HTTPS, alias and private-path denial.
- infrastructure/environments/backend.production.env.example — backend roots, quotas and configuration.
- infrastructure/environments/compose.production.env.example — host mounts/origins/UID configuration.
- infrastructure/environments/mysql.production.env.example — separate database environment template.
- scripts/project.py — persistent native bootstrap directories.
- scripts/setup-vps-media.sh — guarded Ubuntu provisioning.
- scripts/media_receiver.py and scripts/transfer_media.py — explicit checksum-verified SSH migration.
- scripts/verify_media_deployment.py — live upload/retrieval and opt-in recreation smoke test.

## Documentation and generated references

- docs/MEDIA_STORAGE.md — operating/deployment/migration guide and verification limitations.
- docs/MEDIA_IMPLEMENTATION_FILES.md — this inventory.
- docs/PROJECT_AUDIT.md, docs/CHANGELOG.md, docs/DATABASE_SCHEMA.md, docs/ADMIN_ACCESS.md, README.md — updated status and usage.
- docs/api/management.openapi.yaml — validated API snapshot.
- docs/mysql-schema.sql — schema-only reference export.
- Existing browser screenshot artifacts under docs/design-reference/homepage are refreshed by regression tests. Temporary smoke/recovery files remain under ignored .run; user uploads remain under ignored data directories.
