# Category tree milestone — 14 October 2026

Backend: multi-level parent validation, ancestor publication rules, serialized
category writes, versioned moves and conditional public snapshots implemented.
Migration 0007 applied locally against MySQL. Existing categories and files remain.

Frontend: pointer-based drag handles, before/inside/root destinations, sibling
reordering, keyboard alternatives, expandable public hierarchy and shared live
category data implemented. Updates are conditional polling every five seconds;
this is not an assertion of WebSocket delivery or an internet capacity guarantee.

Flutter: shared snapshot API, conditional requests, tree ordering and five-second
foreground updates implemented. A widget test verifies an already-open screen
updates after the API changes without manually refreshing.

Verified locally:

- 53 Django tests passed, including nested moves, cycle/depth rejection, stale
  revisions, protected deletion, ancestor visibility and ETag invalidation.
- 22 frontend unit tests passed.
- Frontend lint, TypeScript checks and optimized production build passed.
- All 17 Playwright browser tests passed, including a real mouse drag, sibling
  ordering, keyboard branch movement, file uploads, rename/unpublish propagation
  into an already-open storefront, and an assertion of zero navigation requests.
- Nine Flutter tests passed, including the local API integration test and live
  screen update test. Flutter analyzer passed after correcting a test lint issue.
- OpenAPI generation validated without warnings; migration consistency checked.
- Media audit found no missing files, and no live-tree browser fixtures remain.

The initial native HTML drag implementation failed browser tests; it was replaced
with pointer capture and explicit drop targets. Failed-run fixture categories
were removed by their exact generated identifiers; unrelated categories and
media were preserved. This milestone does not claim native Android/iOS, Maestro,
VPS or distributed-load verification. Playwright MCP is unavailable; installed
Playwright Test was used.

Git: repository files remain untracked on an unborn branch. No commit or push
was created; author/remote configuration and an initial reviewed baseline are
still required. Deployment: local only.
