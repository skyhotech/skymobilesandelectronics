# Management security hardening

Web authentication uses Django database sessions, not browser localStorage or
custom cryptography. DRF now explicitly accepts session authentication by default.
Session cookies are host-only, HttpOnly and SameSite=Lax; production additionally
requires Secure cookies and HTTPS. Sessions have a configurable one-hour maximum
age (`SESSION_COOKIE_AGE`) and browser-close expiry. Browsers restoring sessions
can retain session cookies; server expiry remains authoritative.

CSRF checks remain mandatory on login and authenticated writes. Login rotates the
CSRF token; logout flushes the session. JavaScript reads only the CSRF cookie for
the X-CSRFToken header. API CSRF failures return a generic JSON error. No JWT or
long-lived bearer tokens were added to the browser. Mobile customer login and its
token lifecycle remain unimplemented and must be designed separately.

Frontend and backend now send anti-framing, nosniff, referrer and permissions
headers. The CSP blocks embedding, plugins and foreign base URLs; it does not yet
restrict scripts. A nonce-based script policy needs separate integration work.
Existing owner permissions, namespace middleware and login throttling remain.
Login throttling currently uses Django's configured cache; distributed enforcement
needs a shared production cache and infrastructure rate limiting.

Remaining production requirements include privileged MFA, deployment verification,
dependency/security review and distributed rate limiting. These changes do not
constitute a guarantee of complete security. Run backend pytest and frontend
Vitest, lint, typecheck, build, and auth/admin Playwright suites to verify changes.

Reference: https://docs.djangoproject.com/en/6.1/topics/http/sessions/
