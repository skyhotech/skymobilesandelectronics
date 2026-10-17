# Storefront experience implementation

## Audit and rollback (2026-10-17)

The existing theme screen is a nonpersistent preview. Hero promotions are embedded
in `hero-carousel.tsx`; the animated brand strip is `gadget-banner.tsx`. Preserve
both as the default fallback. Owner session authentication, CSRF, media validation,
TanStack Query, Django Channels and MySQL already exist. Do not migrate databases
as part of this feature. The old homepage models are not installed.

Use a separate additive `experience` app, scoped storefront CSS variables and the
existing owner namespace. Never execute imported markup or scripts. Reference
artwork is a source collection, not production media. Originals remain untouched.

Rollback: select Restore Default and manual mode, disable weather/animations and
unpublish CMS carousels. Existing hero content remains the fallback. Configuration
revisions are immutable snapshots. Export before publication; use the previous Git
commit for code rollback while retaining the additive tables and media. Do not
reverse migrations or delete media in a production rollback. Existing unrelated
working-tree changes are outside this implementation.

Open-Meteo's hosted free endpoint excludes commercial use:
https://open-meteo.com/en/terms . Live weather must remain disabled until a
self-hosted or commercially permitted endpoint is configured. Never request GPS
permission automatically. Festival dates use the maintained python-holidays India
Tamil Nadu calendar with editable, source-labelled records; review estimated dates.

Playwright MCP is unavailable; use the installed Playwright runner.
