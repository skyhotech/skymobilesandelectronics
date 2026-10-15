# SKY frontend management

## Rebuilt dashboard

The dashboard now includes four catalog summary cards, storefront visibility bars,
the five most recently updated products, missing-image/inactive-product counts and
a Themes shortcut. All counts and recent records come from the owner-only overview
API; recent products link to their brand product panel. Empty, loading and failed
refresh states are supported, preserving previously loaded data on a refresh error.
The current homepage/theme and existing catalog management flows are preserved.

## Themes and filters

Themes appears directly below Dashboard at `/management/admin/themes`. The existing
homepage is the selected Default theme and the only option. This page is a starting
point for future themes; it does not change the current homepage or save a new design.

The Default theme is presented as a responsive 3D preview card showing the real
homepage. Apply theme confirms it is already active; View current homepage opens
the full page. Tilt resets on focus and respects reduced motion/touch devices.
Only the homepage permits same-origin framing for this preview; admin pages and
external framing remain blocked.

Brands and Categories retain status/search controls and add a Filters popup for
homepage enabled/disabled settings, images present/missing and name/saved ordering.
Clear all filters resets search, status and extra filters. Reordering is available
only with no filters and saved order, protecting the complete sibling order.

Brand product panels support status, category, minimum/maximum INR price and sorting
by name, price or newest. Apply filters resets pagination; Clear filters resets search
as well. Django validates the filters and always retains the selected brand scope.
Public catalog filters include selectable brand/category, price range and sorting;
URLs preserve selections on refresh and pagination. Options come only from published
products. Invalid ranges display an error without applying an incorrect range.
The global admin search also lets you choose pages, brands, categories or products.

## Global admin and storefront search

The sticky top bar searches Dashboard, Brands, Categories and catalog records.
Type at least two characters; select a result or use arrow keys and Enter. Escape
closes results. Category results open their folder; brand/product results open a
brand product panel, with product names prefilled. These links survive refresh.

Search ignores letter case and combines words across names, SKU, descriptions,
brands and categories. Common terms such as phones/mobiles, earbuds/earphones and
laptops/notebooks are matched using deterministic synonyms; no AI service is called.
Homepage search opens the live product catalog and respects the category selection.
Admin search remains owner-only, includes drafts and returns at most eight results
per record type; public search only returns published products.

## Dashboard and pinned Brands controls

Dashboard is the first sidebar item and the default admin screen. It shows real
brand/category/product totals, active counts and homepage publication counts from
the owner-only overview API. Refresh updates immediately; active tabs also refresh
every 30 seconds. Management links open the corresponding screens.

In Brands, the summary, Add brand, directory and search/status/layout controls stay
in place while cards scroll in their own area. The directory scrolls separately;
mobile layouts compact the controls to preserve card space. Dragging near the card
area edges scrolls that area. Product panels retain their existing layout.

## Products inside Brands

The sidebar contains Dashboard, Brands and Categories. Every brand card has a **Products**
button that opens its product manager within the Brands page, without a browser
popup or leaving `/management/admin/brands`. Use **Back to brands** to return.
Search, pagination, add/edit/delete and image uploads operate on the selected
brand. New products have that brand selected and cannot switch to another brand
inside this panel. Django validates the `brand` scope independently.

`/management/admin` opens Dashboard; the old `/management/admin/products` URL redirects
to Brands. Existing products and public storefront product pages are preserved.

The management top bar stays visible while scrolling and uses the existing SKY
logo linked to the dashboard. The sidebar offsets itself below the bar, including
when mobile controls wrap. View website and Sign out remain accessible.
The brighter management sidebar has its own scrollbar-hidden scroll area and
stays below the top bar. It supports keyboard focus and compact mobile navigation.

## Live homepage brands

Brands uses the same workspace/card styling as Categories: summary totals,
directory sidebar, search/status filters, grid/list toggle, image cards, Edit/Delete
controls and an Add brand tile. All brands are loaded across API pages, so filters
and counts cover the complete directory. Clicking a brand card opens its edit form.
Brands remain a flat directory.

Drag a handle onto another card to place the brand before it; the order saves
automatically. Clear search and select All before reordering. Escape or an invalid
drop cancels. Keyboard users can use Move up/down. Homepage order updates
automatically. Use Edit to replace a logo; missing images use the shared fallback.

In Brands, edit the name/logo/display order and enable Active + Show on homepage.
The "Authorized Retail Partner / Shop Your Favourite Brands" section in an
already-open storefront updates within about five seconds, without refreshing.
Hiding/deleting a brand removes its card; publishing adds it. Checks pause in
background tabs and resume on focus. Unchanged feeds return HTTP 304 using ETags.
If updates fail, existing cards stay visible with a retry notice. No manual
storefront refresh or production WebSocket setup is required for this feature.

Open http://localhost:3000/management/admin/ (login: /management/admin/login).
This is a custom Next.js dashboard connected to Django REST APIs, not a Django admin redirect.
Start both frontend and backend. The /admin shortcut opens this dashboard.

## Implemented

- Owner login/logout using Django sessions and CSRF protection.
- Products: create, view, edit and delete; SKU, description, brand, category, INR price, comparison price and active status.
- Brands: create, edit, delete, search and pagination.
- Categories: nested image cards, drag ordering, folder search, image uploads and CRUD.
- Validation, protected deletion, confirmation dialogs and responsive layouts.

Create a brand and category before adding products. Records persist in MySQL.
The local owner username is owner@sky; the password is configured in the local database and is not stored here.
The management API requires an active staff superuser, independently of frontend controls.

The custom management dashboard is the employee interface. Frontend /backend/django/admin/ redirects to /management/admin/ and no native Django admin links appear in the dashboard. Native Django admin remains an internal backend recovery tool only.

Category image uploads and homepage category editing are implemented. Published categories update automatically within five seconds in open website screens. Orders, payments, other homepage sections and reports remain pending. Product/brand CRUD is stored in MySQL but their homepage collections are still static. Owner MFA and production hardening remain outstanding. Login throttling uses the configured Redis cache in development.

## Verification

Run backend `python -m pytest` with the configured `config.settings.testing`. Frontend build and lint are available through npm scripts.
The opt-in e2e/admin-management.spec.ts browser test logs in, creates brand/category/product records, edits price, checks four viewport widths, deletes the product, cleans test references and logs out. Supply SKY_ADMIN_TESTS=1, SKY_ADMIN_USERNAME and SKY_ADMIN_PASSWORD through process environment only, against local development. Authentication traces are disabled.

Frontend requests /management/api/*; Next proxies to Django /api/v1/management/*. Configure NEXT_PUBLIC_API_BASE_URL and CSRF_TRUSTED_ORIGINS for the actual frontend origin. Keep CSRF enabled. The versioned schema is docs/api/management.openapi.yaml.

## Login interface

The existing login layout also has subtle pointer-driven 3D depth, logo parallax
and decorative lock/ring animation. Tilt resets when controls receive focus, and
coarse pointers/reduced-motion settings disable the effects. No sign-in fields,
branding, credential handling or redirect rules were changed.

The frontend owner login uses a responsive SKY-branded split layout on desktop and compact branded header on mobile. Passwords start masked. The eye button toggles visibility without submitting the form, preserves the entered value, supports keyboard activation and exposes Show password / Hide password labels with pressed state. Existing Django session/CSRF authentication remains unchanged. The reusable admin-login browser test checks visibility behavior and viewport widths1440/1024/768/390/320px; screenshots are stored locally under .run.

## Dashboard layout

At widths768px and above, management navigation occupies25% and main content75% of the dashboard workspace. Sidebar navigation switches between Dashboard, Brands and Categories; products are managed inside each brand card. Below768px navigation becomes a compact row above the content. Live owner CRUD browser coverage also checks the desktop1:3 width ratio and horizontal overflow at1440/1024/768/390px. Production build, typecheck and lint passed.


## Manage Explore Our Categories

1. Sign in at /management/admin/login and choose Categories in the sidebar.
2. Add or edit a category: name, slug, image, badge, card subtitle, optional starting price, destination section and display order.
3. Choose existing artwork or upload a PNG/JPEG/WebP (5MB/16MP maximum).
4. Enable Show on homepage and Active to display the card. Lower display order appears first.
5. Save category, then check the website category feed. Changes persist in MySQL through DRF.
6. Uncheck Show on homepage to hide without deleting. Categories referenced by products are protected from deletion.

The website reads /api/v1/categories/. Writes use /api/v1/management/categories/ and owner image uploads use /api/v1/management/category-images/. Starting price is owner-managed promotional copy, separate from product pricing. Development media routes are included; production must serve uploaded variants and bundled category artwork through a configured static server.


## Universal image storage

Category, product and brand image upload fields now use the shared media service. Files are stored under persistent public/private roots and MySQL stores only relative FileField names. Images resolve through shared website helpers. Replacing an attachment or deleting its record does not delete shared files. Originals are available only to the owner through the protected media original-download endpoint. See MEDIA_STORAGE.md for environment configuration and production acceptance checks.
# Category hierarchy and uploads

Categories now support a parent selector for subcategories and direct file-picker
uploads into Django media storage. The fixed artwork selector is removed. See
[category instructions](CATEGORY_MANAGEMENT.md) for publication rules and demo
category retirement.

Categories use nested card folders, up to 12 levels. Open a card to manage its
subcategories; drag card handles to reorder the current level. Sidebar sections
and category folders have their own URLs. Already-open storefronts update
within five seconds using conditional API checks. Saving does not require the
customer to refresh the page.

