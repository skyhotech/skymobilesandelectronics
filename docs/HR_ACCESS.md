# HR access

Open `http://localhost:3000/hr/login`. This is a separate HR sign-in with SKY
branding, password visibility controls, 3D motion and the shared video loader.
Successful sign-in opens the protected `/hr` dashboard with a sticky, independently
scrollable 20% sidebar and 80% main content on desktop. The Dashboard navigation,
account details and sign-out are available; mobile uses a stacked layout.
Employee, payroll and attendance features are not implemented.
The sidebar includes Employees at `/hr/employees`, protected by the same HR
session checks. It currently shows an explicit unconnected directory state.
Attendance is available below Employees at `/hr/attendance` with the same HR
protection; attendance data is not connected yet.

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

Hiring Process is available below Attendance at `/hr/hiring` with HR session
protection. Recruitment data and workflows are not connected yet.

## Broadcast notifications

`/hr/notifications` lets active HR members send title/message broadcasts to all HR
accounts. `GET /api/v1/hr/notifications/` returns the latest 50 broadcasts;
`POST` accepts `{"title":"Meeting","message":"At 10"}` (120/2000 character limits).
Session authentication, HR membership and CSRF are required. Django stores sender
and creation time. Run migrations before deployment.

HR pages refresh the feed every 30 seconds while visible. Browser alerts require
explicit permission via Enable browser notifications and a supported secure context
(localhost or HTTPS). Previously received broadcasts are not replayed on navigation.
This is local browser delivery while HR is open, not push to closed browsers, SMS
or email. All HR members can broadcast; employee accounts are not configured yet.

The HR navbar stays at the top while scrolling. Search matches HR section names
and related keywords (for example staff, interview and alerts), regardless of case;
a section filter narrows results. It searches navigation, not employee records.
The live clock displays Asia/Kolkata time and updates every second.
