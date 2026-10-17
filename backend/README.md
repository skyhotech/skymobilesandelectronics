# Backend

Use Python 3.13 and the dependencies installed by the repository setup script.
`python manage.py runserver` automatically delegates to `backend/.venv` when
launched with system Python; an already active virtual environment is respected.
For other Python commands, activate `.venv` or use its Python executable directly.
Production Docker builds check dependency consistency and required runtime imports,
and launch Uvicorn with `/opt/venv/bin/python`. Local `.venv` files are excluded
from the image. Build and verify the image before releasing; these checks do not
replace production configuration, database, Redis, or deployment health checks.

Django 5.2 and DRF provide the authoritative commerce API, backed by MySQL. Dependencies are hash-locked under requirements/ and installed into .venv. Registered commerce apps currently cover brands, categories, branches, products and branch stock.

Apply migrations with `python manage.py migrate`. Run `python -m pytest -q` for an isolated MySQL test database (development-only test database grants required). Run `python manage.py check --database default` and `python manage.py makemigrations --check --dry-run` before releases.

See ../docs/LOCAL_DATABASE.md for MySQL provisioning, recovery copies and backup verification; ../docs/DATABASE_SCHEMA.md for table design; ../docs/ADMIN_ACCESS.md for the frontend dashboard and owner access. Redis remains required for background/realtime readiness. Production deployment and checkout are not verified.
