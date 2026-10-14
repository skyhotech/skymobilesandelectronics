# SKY Mobile & Electronics

Local monorepo initialization for the Next.js website/admin, Django API, and Flutter customer app.
This is the development foundation; catalog, authentication, checkout, real-time events, and the
image-processing workflow still need implementation. Reserved feature directories contain `.gitkeep`
files rather than fake APIs or nonfunctional screens.

## Installed in this workspace

- `frontend/`: Next.js App Router, TypeScript, Tailwind, TanStack Query, React Hook Form, Zod.
- `backend/.venv/`: Python 3.13, Django 5.2 LTS, DRF, Channels, mysqlclient driver, Redis,
  Celery, Pillow, OpenAPI tooling, pytest, and Ruff. No global application pip packages were installed.
- `mobile_app/`: Flutter Android/iOS project, Riverpod, Dio, go_router, secure storage,
  image caching, WebSocket client, and Flutter test packages.
- `.tools/`: ignored; contains only `local-paths.json`. The local Node/npm, Git, Flutter SDK,
  PostgreSQL binaries, Pub cache and bootstrap tooling live **outside the project** in
  `E:\sky-platform-tools` (no spaces in path for Flutter native-asset hooks, and kept out of the
  AI/editor workspace). Python 3.13 was downloaded through uv's managed Python installation.
  `scripts/env.ps1` reads `.tools/local-paths.json` (`tools_alias`) and uses that folder and its
  Pub cache. Recreate a no-spaces SDK path on a fresh Windows checkout if needed.
- `.run/`: ignored runtime logs only. Old screenshots, DB dumps and the stopped PostgreSQL
  cluster were archived to `E:\sky-platform-archive\run-2026-10-14`.
- `compose.dev.yml`: persistent development MySQL/Redis, bound to loopback only.
- `scripts/`: rerunnable setup, checks, foreground startup, and service shutdown for Windows/Linux.

Lockfiles: `frontend/package-lock.json`, `backend/requirements/{base,development}.txt` (with hashes),
and `mobile_app/pubspec.lock`. Dependency input files are in `backend/requirements/*.in`.

## Windows

Open PowerShell in `sky-platform`. The environment helper adds project-local tools only to the
current process PATH. If Windows blocks unsigned scripts, run these specific local entry points
with a process-scoped execution policy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup.ps1 -SkipServices
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check.ps1
```

Docker Desktop is not installed by this project. After installing and starting it, run setup
without `-SkipServices` to start MySQL/Redis and apply Django migrations:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev.ps1
```

The dev script runs in the foreground. Ctrl+C stops its application processes; `stop.ps1` stops
the Compose services. Both preserve database volumes. On Windows Celery uses a solo pool for
development; production workers run on Linux.

For individual components, first load local tool paths:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
. .\scripts\env.ps1
cd frontend
npm.cmd run dev
```

Backend: from `backend/`, `.\.venv\Scripts\python.exe -m uvicorn config.asgi:application --reload`.
Admin creation (after migrations): `.\.venv\Scripts\python.exe manage.py createsuperuser`.
Flutter: from `mobile_app/`, `flutter devices`, then `flutter run -d <device-id>`.
For an Android emulator the API defaults to `http://10.0.2.2:8000/api/v1/`; override with
`--dart-define=API_BASE_URL=https://your-api-host/api/v1/` for a physical device or deployment.

## Linux/macOS and fresh checkouts

Install Python 3.13, Node.js 22/24 LTS, Git, Flutter stable (Dart 3.13.5 or compatible),
and Docker with Compose. Local Windows `.tools` binaries are not portable.

```bash
bash scripts/setup.sh --skip-services
# With Docker running:
bash scripts/setup.sh
bash scripts/dev.sh
bash scripts/check.sh
bash scripts/stop.sh
```

Official downloads: [Python](https://www.python.org/downloads/), [Node/npm](https://nodejs.org/en/download),
[Git](https://git-scm.com/downloads), [Flutter](https://docs.flutter.dev/install),
[Docker](https://docs.docker.com/get-docker/).
Android builds require the Android SDK/JDK. iOS builds require macOS and Xcode.
The scripts do not install or replace global toolchains automatically.

## Configuration and current limits

Setup creates ignored `.env`, `backend/.env`, and `frontend/.env.local` only when missing,
generates local secrets, and does not overwrite existing configuration. Never commit these files.
MySQL is the application database. Tests create an isolated MySQL test database; grant its dedicated development privileges first.

API: `/api/v1/health/live/` checks the process; `/api/v1/health/ready/` checks MySQL and Redis.
OpenAPI and Swagger routes are exposed only with development DEBUG enabled.
Production settings and Dockerfiles are initial configuration, not a verified deployment.
There is no production Compose/TLS/backup automation yet.

The Nginx media snippet serves only preprocessed, versioned image files from a read-only static
location. Upload validation, processing tasks, and storage metadata have not been implemented.
See [media plan](docs/media-optimization.md) and [verification](docs/archive/verification.md).


## Persistent media storage

Uploads use environment-configured Django filesystem storage. Native development defaults to data/media; Docker always uses /app/media, bind-mounted from local data/media or Ubuntu /srv/sky/media. Originals use a separate private root, never a public URL. See [MEDIA_STORAGE.md](docs/MEDIA_STORAGE.md) for configuration, preservation/migration commands and outstanding Docker/VPS acceptance checks.
# Redis during local Windows development

Start Docker Desktop, then run `scripts/start-redis.ps1` from PowerShell. The
`scripts/start-backend.ps1` helper starts Redis automatically before Django.
Verify real cache, Channels and broker connectivity with
`backend/.venv/Scripts/python.exe scripts/check_redis.py`.
See [Redis development setup](docs/REDIS_DEVELOPMENT.md).

