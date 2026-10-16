# Employee and HR chat

HR: `/hr/chat` (Messages & Calls in the HR sidebar and dashboard).
Employees: `/employee/login` → `/employee/chat`.

One-to-one conversations require an active Django account in `HR` or `Employees`.
At least one participant must be HR. Customers, inactive users and unrelated staff
cannot list messages, download files or access call signaling. Removing group
membership revokes access. The existing HR sign-in and admin permissions remain
separate; no default employee password or shared account is created.

For an existing approved employee user, from `backend`:

```powershell
.venv/Scripts/python.exe manage.py enable_employee_chat USERNAME
```

Create individual accounts through the approved account administration workflow,
set passwords securely, then grant employee chat access. This command does not
grant HR or owner permissions. HR and employee sessions share Django's session
cookie, so use separate browser profiles when testing both roles simultaneously.

## Messaging and files

Messages are stored in the database with retry-safe client UUIDs, unread counts
and read receipts. History loads 50 messages at a time; Shared files filters the
same history to attachments. The contact directory currently caps at 500 active
accounts and the conversation list at 100 threads.

Attachments use the existing private filesystem storage with random filenames,
outside public media. Allowed uploads: validated PNG/JPEG/WebP images, PDF and
UTF-8 text, at most 5 MB; images are limited to 25 million pixels. Downloads
require participant authorization and are forced as attachments with no-store
and nosniff headers. This is format validation, not antivirus scanning; add a
quarantine/scanner workflow before allowing unrestricted corporate document
types. HTML, SVG, executables, archives and office documents are rejected.

Back up the database and `PRIVATE_MEDIA_ROOT` together. Existing production
Compose already mounts `/srv/sky/private-media` persistently. Do not publish that
directory in Nginx. Deactivate former employee accounts instead of deleting users
referenced by chat history. Establish a staff-data retention policy before rollout.
Text/files are access-controlled server data, not WhatsApp-style end-to-end
encrypted messages. No call recordings are created.

## Realtime and notifications

Authenticated Channels WebSockets at `/ws/chat/` send invalidations only after
database commit. Origin checks use `CSRF_TRUSTED_ORIGINS`; notifications recheck
the database session and group membership. Redis is the channel transport, not
message storage. Reconnect uses bounded backoff and HTTP resynchronization.
The client sends a heartbeat every 30 seconds through Nginx's upgrade proxy.

HTTP fallback refreshes the inbox every five seconds and an open conversation
every three seconds while visible. Browser notifications are opt-in, use generic
message text and work while the app is open; no service-worker Web Push or
closed-browser/mobile push is included. A visible incoming-call link opens the
conversation so the recipient can explicitly accept or decline.

Local `manage.py runserver` is HTTP-only. To enable WebSockets, run the existing
ASGI app with Redis available:

```powershell
.venv/Scripts/python.exe -m uvicorn config.asgi:application --host 127.0.0.1 --port 8000
```

Set `NEXT_PUBLIC_CHAT_WS_URL=ws://localhost:8000/ws/chat/` in the frontend's local
environment, using the same hostname as the browser session, then restart Next.
Keep the frontend origin in `CSRF_TRUSTED_ORIGINS`. In production leave this URL
unset: WSS uses the website hostname through the supplied Nginx configuration.

## Voice and video calls

Voice call and Request video call create a durable incoming request. Only the
recipient can accept or decline; camera/microphone acquisition starts only after
acceptance. Either participant can end the call. Active calls show local/remote
media, microphone mute, camera toggle and an audio-playback fallback. Keep the
chat page open during a call. Navigation stops local media; abandoned accepted
calls expire after 90 seconds without either participant's heartbeat. Ringing
requests expire after 60 seconds; calls are capped at two hours.

WebRTC uses authenticated HTTP signaling with participant checks, fixed caller
offer/recipient answer roles, bounded payload/count limits and ICE candidate
queuing. Signals expire after five minutes and are deleted when calls end.
Polling signaling continues during a call, even without a working WebSocket.

Calls require HTTPS outside localhost and browser camera/microphone permission.
Next's permissions policy allows camera and microphone for the same origin only.
See [MDN's WebRTC calling guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling).

No paid provider is enabled. With no ICE servers configured, local peer calls
work, but connections across NAT/firewalls are not guaranteed. Configure an
approved self-hosted coturn relay before remote employee rollout:

```dotenv
CHAT_ICE_SERVERS=[]
CHAT_TURN_URLS=turn:YOUR_RELAY:3478,turns:YOUR_RELAY:5349
CHAT_TURN_SECRET=
```

Use coturn's shared-secret REST authentication (`use-auth-secret`) with the same
secret, stored only in backend environment/secrets. The authenticated call API
issues user-specific HMAC credentials expiring two hours and five minutes after call creation; it never returns
the shared secret. Supply appropriate TLS certificates, realm, relay port range,
firewall/network restrictions and capacity. Browser clients necessarily receive
temporary relay credentials. `CHAT_ICE_SERVERS` may contain an approved STUN
configuration; do not put permanent TURN credentials there. TURN availability,
cross-network quality, deployment and real-device permissions require staging
verification. No relay infrastructure or billing was provisioned by this change.

`apps.chat.tasks.clean_call_state` is scheduled each minute in Celery Beat for
call expiry and signal cleanup. Inbox reads also run cleanup, so ordinary calls
recover without Beat; configure workers/Beat for unattended retention cleanup.

## Validation

Backend: `python -m pytest tests/test_chat.py`. Covers role isolation, deduplication,
private downloads, read receipts, unsafe uploads, request consent, signaling,
call expiry, CSRF, WebSocket origin/session revocation and TURN-secret handling.

Frontend (local isolated fixtures only):

```powershell
$env:SKY_CHAT_TESTS='1'
npx playwright test e2e/chat.spec.ts
```

The test creates and removes separate HR/employee accounts and conversations,
exchanges a private file, checks 390/768/1024/1440 px layouts and establishes real
local WebRTC video and audio connections using Chrome's synthetic media devices.
It also exercises mute, hangup and declined calls. No production staff data,
paid relay, camera feed or real credentials are used. Playwright MCP is unavailable;
Playwright Test provides browser verification. Cross-network TURN, closed-browser
push, production load and real hardware remain NOT TESTED.
