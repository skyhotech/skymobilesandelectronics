# SKY website and admin foundation

Next.js App Router with strict TypeScript, Tailwind, TanStack Query, React Hook Form and Zod.
The homepage reproduces the supplied Stitch design with local optimized images, responsive
sections, carousel controls, search, saved products, and product enquiries. Displayed product
content comes from the design reference; it is not live backend inventory. Other feature routes
remain reserved. Online checkout and accounts are not implemented.

Use `npm ci`, `npm run dev`, `npm run typecheck`, `npm run lint`, and `npm run build`.
Environment values belong in ignored `.env.local`; copy `.env.example` on a fresh checkout.
The root Windows environment helper exposes the locally downloaded Node/npm toolchain.
Vitest and Testing Library are installed; unit suites are not yet written. Four Playwright
homepage tests run with `npm run test:e2e` and the locally installed Chrome browser.
See `docs/design-reference/homepage/IMPLEMENTATION.md` at the repository root for details.
See the root README and verification report for setup and known dependency audit findings.
