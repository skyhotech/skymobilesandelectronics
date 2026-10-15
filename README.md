# SKY Mobile & Electronics

Local monorepo initialization for the Next.js website/admin and Django API. Native mobile development has been removed; responsive mobile web remains supported.
This is the development foundation; catalog, authentication, checkout, real-time events, and the
image-processing workflow still need implementation. Reserved feature directories contain `.gitkeep`
files rather than fake APIs or nonfunctional screens.

## Installed in this workspace

- `frontend/`: Next.js App Router, TypeScript, Tailwind, TanStack Query, React Hook Form, Zod.
- `backend/.venv/`: Python 3.13, Django 5.2 LTS, DRF, Channels, mysqlclient driver, Redis,
  Celery, Pillow, OpenAPI tooling, pytest, and Ruff. No global application pip packages were installed.
- `.tools/`: ignored tool-path configuration; shared external SDK installations are not managed by the project.
- `.run/`: ignored runtime logs and diagnostics.
- `compose.dev.yml`: persistent development MySQL/Redis, bound to loopback only.
- `scripts/`: rerunnable setup, checks, foreground startup, and service shutdown for Windows/Linux.

Lockfiles: `frontend/package-lock.json` and `backend/requirements/{base,development}.txt` (with hashes). Dependency input files are in `backend/requirements/*.in`.

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
## Linux/macOS and fresh checkouts

Install Python 3.13, Node.js 22/24 LTS, Git,
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
[Git](https://git-scm.com/downloads),
[Docker](https://docs.docker.com/get-docker/).
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

