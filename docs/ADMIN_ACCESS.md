# SKY frontend management

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

The frontend owner login uses a responsive SKY-branded split layout on desktop and compact branded header on mobile. Passwords start masked. The eye button toggles visibility without submitting the form, preserves the entered value, supports keyboard activation and exposes Show password / Hide password labels with pressed state. Existing Django session/CSRF authentication remains unchanged. The reusable admin-login browser test checks visibility behavior and viewport widths1440/1024/768/390/320px; screenshots are stored locally under .run.

## Dashboard layout

At widths768px and above, management navigation occupies25% and main content75% of the dashboard workspace. Sidebar navigation switches between Products, Brands and Categories and provides advanced administration access. Below768px navigation becomes a compact row above the content. Live owner CRUD browser coverage also checks the desktop1:3 width ratio and horizontal overflow at1440/1024/768/390px. Production build, typecheck and lint passed.


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

