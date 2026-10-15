# Local Redis

Docker Desktop runs Redis for Windows development. Start Docker Desktop, then run
from the repository root:

```powershell
.\scripts\start-redis.ps1
backend\.venv\Scripts\python.exe scripts\check_redis.py
```

`start-backend.ps1` also starts/checks Redis before Django. The Redis-only startup
does not start a second MySQL server, avoiding a conflict with native Windows MySQL.
The environment script discovers user-profile Docker Desktop installations as
well as Docker CLI installations already on PATH.

Local URLs in the ignored backend `.env`:

```dotenv
REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/1
REDIS_CACHE_URL=redis://127.0.0.1:6379/2
```

Compose overrides these hostnames with `redis` for containerized Django. Django's
built-in Redis cache now backs normal development cache operations and DRF login
throttling; Channels uses database 0 and Celery's broker uses database 1. Session
records remain in MySQL. Cache connection timeouts and pool size are bounded.

Redis is published only on `127.0.0.1:6379`, uses AOF persistence and the named
`sky-platform-dev_redis_data` volume, restarts automatically with Docker, and has
a 256 MB Redis memory limit plus a 384 MB container limit. The noeviction policy
avoids silently evicting broker/channel data when cache and broker share a server.
Do not remove its volume as part of routine startup/deployment.

`check_redis.py` verifies cross-process Django caching, a real Channels group
message and a Celery broker connection. It deletes only its own temporary cache
key. It does not claim a Celery worker executed a task. Unit tests deliberately use
in-memory cache/Channels and eager Celery, so they cannot clear development data.

The existing category storefront updates still use five-second conditional HTTP
polling. Enabling Redis here does not silently turn those endpoints into WebSockets.
DRF's cache-based throttle is best-effort, not a strict atomic rate-limit guarantee.
Start Redis before using endpoints that depend on caching/throttling.

## Login timeouts / stopped Docker Engine

Development supports both `http://localhost:3000` and `http://127.0.0.1:3000`.
Use one consistently within a session: browser cookies are separate for the two
hostnames. CSRF tokens remain mandatory; other origins are not automatically trusted.

If session GET succeeds but login POST times out, check Docker Desktop and run
`scripts/start-redis.ps1`, then `backend/.venv/Scripts/python.exe scripts/check_redis.py`.
Session bootstrap does not use the login limiter; a successful GET does not prove
Redis is reachable. Start only Redis; do not recreate database volumes.

Login now fails closed with JSON HTTP 503 and `Retry-After: 10` if Redis rejects
or times out while reading/writing throttle state. Authentication is not attempted
without that state. The existing frontend displays the message and permits retry.
Healthy Redis continues to enforce HTTP 429 after ten attempts per minute.
No in-process fallback or disabled throttling is used.

Verified locally: Redis PING, cross-process cache access, Channels group delivery,
Celery broker connectivity, cache persistence after actual container recreation,
and HTTP 200 from Django readiness. All 53 backend tests passed. Docker Desktop
29.8.2 was available in the user-profile installation; no new Docker installation
or unrelated database/container startup was required.
