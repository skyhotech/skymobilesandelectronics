# Repository audit - 15 October 2026

## Search follow-up

Homepage search previously filtered static sample cards; admin lacked global search.
Public and scoped management matching depended on database collation. Replaced
these paths with live catalog navigation, owner-only global suggestions and shared
explicitly case-insensitive token/synonym matching. No schema/data migration needed.

Scope: Next.js storefront/admin, Django API and supporting infrastructure. Native app is outside scope.

| Area | Actual state | Gap / risk |
| --- | --- | --- |
| Frontend | Next 16.4, React 19.3, strict TS, TanStack Query, Zod, RHF | Homepage product collections use static data; public catalog pages absent |
| Backend | Django 5.2 dependency range, DRF, Channels, Celery, Redis | Modular foundation; commerce and real-time consumers incomplete |
| Database | Existing MySQL configuration, mysqlclient, migrations and persistent volumes | **High:** conflicts with required PostgreSQL; migrate through export/restore rehearsal and data verification, never replace volumes in place |
| Authentication | Owner sessions, CSRF, backend owner permission, login throttling | **High:** privileged MFA and granular branch RBAC missing |
| Categories / brands | Management CRUD and public homepage feeds | Existing API/browser coverage; continued regression checks needed |
| Products | Management CRUD, decimal prices and constraints | Public read API, searchable listing and detail UI missing |
| Inventory / checkout | Stock model foundation | Reservations, movement history, durable orders, payments not complete |
| Media | Validated uploads, private originals, relative paths and optimized variants | VPS/Docker persistence acceptance remains unverified; older planning docs are stale |
| Infrastructure | Dev/prod Compose, Nginx, Dockerfiles | MySQL-specific; production release/restore/load verification outstanding |
| CI | Workflow directory contains only a placeholder | Automated CI gates missing |

## Verified baseline

- Clean Git working tree at start; remote origin configured.
- Backend: 55 tests passed against configured local test database.
- Frontend: 22 unit tests passed; typecheck passed.
- No Playwright MCP tools exposed in this session. Use installed Playwright Test; MCP interaction is NOT TESTED.
- Production builds, full browser suite, dependency audits, load tests and production deployment: NOT TESTED in this baseline.

The first catalog milestone is implemented and its final checks are recorded in `PROJECT_STATUS.md`; the matrix above describes the pre-change audit. Do not treat baseline gaps as current implementation claims.

## Safe sequence

1. Add read-only public product API and corresponding SSR website pages with shared response validation; protect drafts and test filtering.
2. Implement privileged MFA and branch-scoped roles before employee/production rollout.
3. Rehearse a PostgreSQL migration using a separate database, preserving MySQL data and recovery paths; synchronize Compose, dependency locks, scripts and docs after verification.
4. Add inventory and commerce through tested vertical features; then CI, staging, security and recovery gates.

No production readiness claim. Live WordPress and production data remain untouched.
