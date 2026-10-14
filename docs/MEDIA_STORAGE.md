# Universal filesystem media storage

## Outcome and verification boundary

Django uses FileSystemStorage for public images and the same filesystem mechanism with a separate, URL-less private root for originals. Category/product/brand FileFields store relative filenames. MySQL remains the configured database.

The application code and database filenames work unchanged on Windows and Ubuntu. Only environment configuration and mounts differ. Existing files were copied with checksum verification and the old files retained. Local upload, retrieval, browser rendering and storage-root relocation were tested. Docker, Nginx and an authorized VPS are unavailable here: container recreation, Linux ownership, nginx -t, HTTPS and remote transfer are deployment acceptance checks, not verified production claims.

## Storage paths

| Environment | Public host directory | Django directory |
|---|---|---|
| Native Windows | sky-platform/data/media | Environment-resolved local directory |
| Docker on Windows | ./data/media | /app/media |
| Docker on Ubuntu | /srv/sky/media | /app/media |

Private originals use data/private-media locally and /srv/sky/private-media on Ubuntu, mounted only into Django at /app/private-media. Nginx does not mount this directory. Originals have no public storage URL. Private documents are not accepted by image uploads and require a separate authorized document workflow.

Public files use products/optimized and products/thumbnails, with equivalent brands/categories/banners/other directories. Existing category artwork lives under categories/artwork. Originals use the matching kind/originals directory in private storage. UUID names prevent collisions; original filenames are metadata only.

Example: the database stores products/optimized/UUID.webp; the API returns /media/products/optimized/UUID.webp through storage.url(). Neither stores a filesystem root or hostname.

## Native Windows

From the project root:

```powershell
backend\.venv\Scripts\python.exe backend/manage.py migrate
backend\.venv\Scripts\python.exe backend/manage.py import_local_media
backend\.venv\Scripts\python.exe backend/manage.py index_media
backend\.venv\Scripts\python.exe backend/manage.py audit_media --json
.\scripts\start-backend.ps1
```

Defaults work without Docker. Optional backend environment values MEDIA_ROOT=../data/media and PRIVATE_MEDIA_ROOT=../data/private-media resolve relative to backend. Absolute locations may be supplied in environment configuration. Nested public/private roots are rejected by a Django check.

The one-time category migration removes former URL prefixes and converts bundled artwork references to relative filenames. import_local_media copies old files/artwork through storage APIs, verifies SHA256, refuses conflicting targets and preserves sources. index_media records existing assets/private originals and reconciles tracked bytes. This workspace has already completed that migration. Applying database migrations alone does not transfer physical files.

## Development Docker

compose.dev.yml adds an optional app profile with persistent public/private bind mounts:

```sh
docker compose -f compose.dev.yml --profile app build backend
docker compose -f compose.dev.yml --profile app up -d
docker compose -f compose.dev.yml exec backend python manage.py migrate
docker compose -f compose.dev.yml exec backend python manage.py import_local_media --artwork /app/bundled-category-artwork
docker compose -f compose.dev.yml exec backend python manage.py index_media
```

Do not start Docker MySQL on port 3306 while native MySQL owns that port. Docker MySQL has a separate database volume; importing native records is an intentional, separate operation. The native frontend can continue using the exposed backend port.

Uploads are excluded from Git and Docker images. Container restarts, rebuilds and recreation do not intentionally remove host bind directories. Deployment scripts contain no media cleanup. Do not remove persistent volumes or media directories during routine deployment. Actual recreation persistence must still be verified on a Docker-capable host.

## API, validation and retention

- Existing category upload: POST /api/v1/management/category-images/.
- Universal upload: POST /api/v1/management/media/upload/, multipart file and kind: products, brands, categories, banners or other.
- Owner-only list/detail: /api/v1/management/media/.
- Owner-only original download: /api/v1/management/media/UUID/original/.
- DELETE archives metadata without deleting potentially shared files.

Custom admin category/product/brand image inputs use the shared implementation. Responses preserve image_url, thumbnail_url, width and height, and add asset ID, relative filename, checksum, byte counts and status. Category image_url, product image_url and brand logo_url serializers normalize references into relative FileField names. Native recovery-admin image fields are read-only to prevent bypassing validation.

The extension must match decoded PNG/JPEG/WebP content. Defaults: 5 MiB upload, 16 MP decoded pixels, optimized WebP up to 1600px at quality 90, and 320px thumbnails at quality 85. Orientation is applied, metadata is not copied into rendered variants, and originals remain private. Invalid images are rejected. Storage errors return 503 without host paths; failed records retain a successfully written original for recovery.

This bounded small-image workflow is synchronous. Large images are rejected; bulk/heavy processing remains deferred to the existing Celery infrastructure. Replacement/deletion does not automatically unlink shared files. Retained originals, archived assets and failed uploads remain counted against quota. No unapproved retention cleanup is enabled.

## Next.js and Flutter

Next.js uses lib/media.ts and MediaImage. Relative filenames and /media URLs resolve against NEXT_PUBLIC_MEDIA_ORIGIN, or the configured public API origin. With both absent they remain same-origin and use the /media proxy. The resolver rejects traversal, file URLs and unapproved absolute origins. MediaImage supports responsive sizes and placeholders. Next does not recompress already optimized uploads; remotePatterns allow only configured media origins.

NEXT_PUBLIC settings are build-time configuration: rebuild for the deployment environment, or use same-origin delivery. API_INTERNAL_BASE_URL handles Docker server-to-server API access separately from public browser URLs. No component changes are needed.

Flutter uses core/api/media_url.dart and shared/widgets/media_image.dart. Set API_BASE_URL through dart-define: Android emulator uses the host bridge, physical devices use a reachable host address, production uses HTTPS. Optional MEDIA_ORIGIN configures a separate public image origin. Widgets do not embed environment-specific IPs. cached_network_image supplies caching and placeholder/error UI. Native device cache-hit behavior and Maestro E2E are not verified here.

## Approved Ubuntu provisioning

1. Copy infrastructure/environments production templates to ignored environment files. Use approved hostnames and separately generated secrets.
2. Supply approved fullchain.pem and privkey.pem under /srv/sky/tls. Certificate issuance and DNS remain separate deployment operations.
3. Run sudo bash scripts/setup-vps-media.sh on the approved Ubuntu host. It creates validated directories, configures UID/GID 10001 and checks disk headroom. It does not deploy or replace data. MEDIA_APP_UID/GID must match Compose.
4. Transfer files using the migration tool below. Import the intended database backup separately, run migrations and audit_media, and reconcile writes before cutover.
5. Build/start compose.prod.yml through the approved release path using the production Compose environment file.
6. Run the Nginx configuration test and the explicit deployment smoke test.

Production Compose maps public storage to /app/media and private storage to /app/private-media. Missing production bind sources are not auto-created. Nginx mounts only public files, read-only at /srv/media; it allows raster-image extensions, denies other media paths, disables symlinks and caches versioned images. Public modes are 0644/0755; private modes are 0600/0700. Internal database/Redis ports are not published. Resource limits are starting settings, not measured capacity guarantees.

## Safe local-to-VPS migration

The tool uses existing OpenSSH ssh/scp clients and SSH keys; no cloud provider or extra Python dependency is required.

```powershell
backend\.venv\Scripts\python.exe scripts/transfer_media.py --host deploy@approved-host --include-private
backend\.venv\Scripts\python.exe scripts/transfer_media.py --host deploy@approved-host --include-private --remote-sudo --apply
backend\.venv\Scripts\python.exe scripts/transfer_media.py --host deploy@approved-host --include-private --remote-sudo --verify-only
```

The first command is a local dry-run. Apply explicitly copies missing files only. remote-sudo uses already approved passwordless sudo for destination access/ownership; it does not install keys or grant sudo. Source/destination directories and port are CLI configuration.

Local/remote SHA256 checks skip matching files and reject conflicts. Source files are never deleted. Reruns resume at file level; an interrupted individual file is recopied, without byte-offset resume. Staging is private, verified, and atomically linked without replacing an existing target. Traversal and symlinks are rejected. SSH host-key checks remain enabled. Simple DNS/IPv4 user@hostname syntax is supported.

Run audit_media on the destination after importing the corresponding database. A file transfer does not migrate database records. Use a consistent export/freeze window. Rollback retains the previous release, database backup and media tree: stop writes, reconcile new data, restore approved previous configuration and verify references. Never automatically restore an old database over newer production writes.

## Storage budget and monitoring

Configurable defaults: MEDIA_MIN_FREE_BYTES=1 GiB blocks uploads; MEDIA_WARN_FREE_BYTES=2 GiB logs a warning; MEDIA_MAX_STORAGE_BYTES=20 GiB bounds tracked originals and variants; MEDIA_MAX_ASSETS=10000 caps count. A database row lock serializes quota admission across workers. audit_media reports missing references, tracked bytes and free disk without removing anything; index_media reconciles legacy assets.

The VPS's 75 GB also holds Ubuntu, MySQL, Docker, logs and application files. For planning only, a 2 MB original plus 250 KB optimized image and 30 KB thumbnail uses about 2.28 MB per asset, or 2.28 GB for 1000 assets in decimal units. Measure actual growth. Off-VPS backup and retention remain separate operational requirements.

## Verification

Backend: run python -m pytest from backend using its virtual environment. Frontend: run npm test, typecheck, lint, build and Playwright. Flutter: run analyze and tests; provide LIVE_API_BASE_URL to include the actual DRF provider test.

Local smoke test:

```powershell
backend\.venv\Scripts\python.exe scripts/verify_media_deployment.py --api-base http://localhost:8000/api/v1/ --allow-http-dev
```

On an approved Docker staging/VPS host, first load the production Compose environment. Owner credentials come from environment variables or a hidden password prompt:

```sh
docker compose -f compose.prod.yml exec -T nginx nginx -t
python3 scripts/verify_media_deployment.py --api-base https://approved-host/api/v1/ --compose compose.prod.yml --recreate-backend
```

The explicit recreation flag interrupts the backend and requires an approved window. The test performs a real upload, public retrieval, nginx -t, recreation, database reference check and image checksum comparison. Its small smoke asset is archived rather than physically deleted. Local Windows upload/retrieval passed. Docker recreation, Linux ownership, nginx -t, HTTPS, actual SSH transfer and native device E2E remain unrun here. Do not call the deployment production-ready until those checks pass.

References: [Django storage API](https://docs.djangoproject.com/en/5.2/ref/files/storage/), [Django file management](https://docs.djangoproject.com/en/5.2/topics/files/), [Nginx alias](https://nginx.org/en/docs/http/ngx_http_core_module.html#alias).
