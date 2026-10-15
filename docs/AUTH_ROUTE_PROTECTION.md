# Route authentication

The storefront, public category API, media and login remain public. Every route
under `/management/admin/` except the login page requires a Django owner session.
Next.js 16 uses `frontend/src/proxy.ts` (the replacement for middleware.ts).
The proxy validates the session with Django; a cookie alone never grants access.
Missing, expired or forged sessions redirect to login with a validated internal
return path. Session-service failures return 503 rather than exposing the page.
Protected responses use private/no-store caching.

The Django `ManagementAuthenticationMiddleware` protects the entire
`/api/v1/management/` namespace, including future routes. It runs after Django's
session and authentication middleware. The session bootstrap/login endpoint is
the only public exception; existing CSRF checks and login throttling remain.
Anonymous and non-owner requests receive JSON 403, preserving the existing
session-authentication API contract. DRF owner permissions remain independently
enforced. New management endpoints must retain CSRF protection and permissions.

Configure `API_INTERNAL_BASE_URL` for Next.js server-to-Django communication.
Use secure session cookies and HTTPS in production. Privileged MFA and production
deployment verification remain separate outstanding work. Public customer account
authentication is not implemented by this management-session guard.

Verification: 44 backend tests, 20 frontend unit tests, type checking, lint and
production build passed. Installed Playwright verified anonymous/forged-session
denial, public route access and real owner product CRUD. Playwright MCP is not
available. The authorization contract remains enforced by Django.
