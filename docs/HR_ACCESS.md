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

Manage Branches is available at `/hr/branches` in the HR sidebar and navbar search.
It uses HR session protection and shows the stored branch directory, with search
and pagination. Branch cards offer View, Add, Edit and confirmed Delete controls.

Leave Requests is available at `/hr/leave-requests` in the sidebar and navbar
search, protected by HR session checks. Leave submission and approvals are not
connected yet.

Employees expands in the sidebar to All, Working, Leave and Past Employees.
Selections persist in `/hr/employees?status=all|working|leave|past` and mark the
active view. Invalid statuses use All. Employee records remain unconnected.

## Careers

Careers in the HR sidebar (`/hr/careers`) supports create, edit, publish/unpublish
and confirmed deletion of job openings. Required fields: title, location, employment
type, plain-text description and application email. New openings are drafts.
`/careers` publicly lists published openings and supports applications via email.
The public page fetches fresh data per request; refresh an already open page after
HR updates. No applicant collection or application upload is implemented.

HR CRUD API: `/api/v1/hr/careers/` and `/api/v1/hr/careers/<id>/` (GET/POST,
GET/PATCH/DELETE respectively), with session/HR membership/CSRF enforcement.
Public read-only API: `GET /api/v1/careers/`. Lists are paginated (24 per page).
Run migrations before deployment; existing branch/employee records are unchanged.

The corrected public URL is `/careers`. Legacy `/carrears` requests permanently
redirect to `/careers`, preserving pagination query parameters.

## Branch workbook import

`python manage.py import_branches <path-to-skydata.xlsx>` previews distinct names
from the Branch column; add `--apply` to persist. Repeated stock rows, differences
in case/whitespace, and Total/Grand Total rows do not create duplicate branches.
Unique branch codes distinguish ARNI-1/ARNI-2, etc.; city is not unique. Existing
branch details are preserved; conflicting identities abort the entire import.
The import only adds missing branches, not products, stock or employee records.

The supplied workbook has 33 branches. City labels are derived from branch names
by removing numbered suffixes, preserving source spelling. HEAD OFFICE and MAINLINE
RETAILER supply no city, so city is blank. Addresses/phones are blank where absent.
City labels are not a verified geographical/address directory. Unknown city/address
fields are optional in the schema; no existing values or stock relations are removed.
`GET /api/v1/hr/branches/` is HR-only, paginated, and supports `?search=arni`.

The HR sidebar uses local SVG icons. Its scrollbar is hidden while wheel, touch
and keyboard scrolling remain available. Employee submenus retain text labels.

The global SKY loader completes one full video playback (about 10 seconds) per
visible loading cycle and waits for active requests, including route loading.
Overlapping requests share one cycle. Reduced-motion mode shows a static loader;
blocked, failed or stalled video playback falls back without holding completed
requests indefinitely (10-second playback-start/stall timeout).

The HR dashboard (`/hr`) includes all seven HR sections, live branch/job/broadcast
counts, branches grouped by city, recent jobs and recent broadcasts. Employee,
attendance, hiring workflow and leave tools are explicitly marked unconnected;
no counts are invented. HR-only `GET /api/v1/hr/overview/` supplies real database
summaries, refreshed each minute while visible and via Refresh overview.

Branch CRUD uses HR-authorized, CSRF-protected POST `/api/v1/hr/branches/` and
GET/PATCH/DELETE `/api/v1/hr/branches/<id>/`. Codes are normalized to lowercase
and checked for uniqueness; duplicate names within a city are rejected. Multiple
distinct branches can share a city. Branches referenced by inventory return 409
on deletion and can be deactivated instead. View opens an accessible details dialog.

The global loading video fills the viewport with a centered 16:9 desktop frame
and 9:16 mobile frame (below 768px). Cover scaling crops outer video edges where
needed; the loading message stays inside the viewport safe area.
