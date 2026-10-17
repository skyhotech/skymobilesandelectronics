# Local Django admin access

The backend admin is served at:

`http://localhost:8000/backend/django/admin/`

The storefront shortcut `http://localhost:3000/admin` redirects to that path on
the backend configured by `NEXT_PUBLIC_API_BASE_URL`. The former backend
`/admin/` entry point also redirects to the new admin location.

The requested local owner username is `owner@sky`. Its password was set directly
in the local database and is not stored in source code or documentation.
The account is active, staff and superuser. Django's standard authentication,
CSRF protection and admin authorization continue to apply.

This is local development access. Owner MFA and production access controls have
not been implemented or verified by this configuration change.
