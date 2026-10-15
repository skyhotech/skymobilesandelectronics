# SKY: focused engineering

Scope: Next.js storefront/admin and Django API only. Native mobile development has been removed. Do not recreate Flutter, Dart, Android/iOS or Maestro scaffolding unless explicitly requested. Responsive mobile web remains supported.

- Complete the current request only. Do not restart a repository audit, implement the entire roadmap, or delegate unless requested for this task.
- Inspect Git status and relevant code before editing. Preserve unrelated work. Repo: `sky-platform/` when opened from its parent.
- Source: `frontend/src`, `backend/{apps,config,common,api}`; tooling: `scripts`, `infrastructure`, `.github`.
- Search the smallest relevant directory with `rg`; bound output and read targeted line ranges. Never recursively list the workspace or dump large files. Expand scope only when evidence requires it.
- Skip SDKs, dependencies, caches, generated files, logs, media, archives and lockfiles during routine exploration. Inspect a specific excluded file when necessary. Ignore files are search aids, not access controls. Never print secrets.
- Read docs only for affected behavior or uncertain APIs. For Next.js, consult the specific installed-version guide needed; never bulk-read its documentation tree.
- Fix the root cause with the smallest maintainable change. Preserve stack and API compatibility; Django owns business rules. Synchronize frontend/backend/API contracts when affected.
- Run checks appropriate to the change. Use browser verification when behavior requires it. Avoid unnecessary screenshots and repeated full suites. Report unavailable checks honestly.
- Never disable authorization, CSRF, validation or tests to obtain a pass. Do not modify live WordPress, production data or paid services without authorization.
- Update relevant documentation only. Keep messages concise: outcome, verification, remaining blocker. Do not repeat code or tool output.
- Review the diff and check for secrets before committing. Stage explicit intended paths only; never `git add -A`. Commit verified milestones. Push only to an approved development branch when configured and permitted. Never force-push or discard work.
- These rules cannot remove instructions or history already supplied in a conversation. Do not claim measured token savings without usage evidence.
