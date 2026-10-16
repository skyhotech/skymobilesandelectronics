# HR access

Open `http://localhost:3000/hr/login`. This is a separate HR sign-in with SKY
branding, password visibility controls, 3D motion and the shared video loader.
Successful sign-in opens the protected `/hr` dashboard with a sticky, independently
scrollable 20% sidebar and 80% main content on desktop. The Dashboard navigation,
account details and sign-out are available; mobile uses a stacked layout.
Employee, payroll and attendance features are not implemented.

## Accounts

An active Django user must belong to the **HR** group. Owner/superuser status alone
does not grant HR access. HR membership alone does not grant store-owner/admin access.
No default HR account or password is created.

An authorized administrator can create the HR group and assign an appropriate user
through Django's admin at the backend's `/backend/django/admin/` URL (locally,
`http://localhost:8000/backend/django/admin/`). Use Django's password controls to
set that account's password; do not save passwords in source or documentation.
An HR-only account does not need staff or superuser flags.

## Authentication boundary

HR uses `/hr/api/session/`, proxied to `/api/v1/hr/session/`, with distinct HR query
state and HR group authorization. It reuses Django's hashed-password authentication,
CSRF protection, server-side sessions and the shared fail-closed login throttle.
HR and management use the same Django session cookie/identity store: switching
accounts changes the current browser identity and logout ends that session.
The sign-in screens and permission checks remain separate.

The Next.js proxy checks HR sessions for HR page access. Session-cookie presence
alone is insufficient; removing HR membership immediately removes HR session access.
Return destinations are restricted to the existing HR workspace, rejecting external
URLs, login loops and management destinations. Authentication responses are no-store.

Verified: backend HR login/CSRF/logout, wrong-role/inactive rejection, group revocation
and throttle tests; a real local browser flow using an isolated HR fixture account,
four viewport widths, password toggle, protected landing and management denial.
The fixture account was deleted afterwards. No HR credentials were committed.
