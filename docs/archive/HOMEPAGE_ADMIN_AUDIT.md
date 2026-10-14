# Homepage and admin integration audit

Audit date: 2026-10-14. Inspected the actual Next.js homepage and its component source, current Django models/API, custom management dashboard and Flutter home screen. This records implemented behavior separately from proposed controls.

## Architecture finding

Before this change, all visible homepage sections used local content and assets. Product/category CRUD already persisted through Django REST Framework to MySQL, but those records were not used by the homepage or mobile scaffold. This caused admin edits to appear ineffective. The selected integrated correction is the Explore Our Categories feature, following the owner's latest request.

The custom frontend at /management/admin is the business admin. It sends authenticated, CSRF-protected requests to Django REST Framework; Django validates and persists in MySQL. Public website/mobile readers consume filtered DRF data. The browser never connects to MySQL. Native Django admin links were removed; /backend/django/admin on the frontend redirects to the custom dashboard. Native Django administration remains an internal backend recovery surface, not a required employee workflow.

## Section-by-section matrix

| Homepage section | Existing content/behavior | Required management controls | Actual integration status |
|---|---|---|---|
| Header and navigation | Local logo, utility text, category anchors, search/menu, account/wishlist/bag enquiries | Business/contact settings; navigation labels/order; logo and approved links | Static; existing search filters rendered cards only |
| Animated gadget banner | Four animated rows, static gadget cutouts and SKY logo | Artwork selection, row arrangement, visibility and motion settings | Static; animations preserved |
| Hero carousel | Six locally authored promotional slides and timer | Slide CRUD, media, copy, CTAs, order, active dates and draft/publish | Static; scheduling/publishing not implemented |
| Service assurances | Four static promises and illustrations | Copy, illustrations, display order/visibility | Static; claims require owner review |
| Explore Our Categories | Ten image cards, starting prices, badges, section links | Category CRUD, artwork upload/select, subtitle, badge, starting price, target section, sort order, active/homepage flags | Implemented through MySQL/DRF/custom admin; public website and Flutter consume same feed |
| Favourite brands | Local authentic logo assets, animated grid | Brand logo, featured state, order and destination | Name/slug/active CRUD exists; homepage logo/grid integration pending |
| Smartphones | Local card array, filter buttons, local wishlist, enquiry dialog | Real product/variant/media integration, featured placement and order | Product CRUD persists; rendered product cards remain static |
| Featured offers | Static promotional tiles and links | Campaign media/copy, dates, destinations and publication | Pending |
| Laptops and tablets | Static product cards and descriptions/prices | Shared product/variant/media data and featured collections | Pending |
| Gadgets and 3DOT | Static cards and local imagery | Product/brand collections, featured placement | Pending |
| TVs and appliances | Static promotional/product cards | Product/category collections and campaign content | Pending |
| Why SKY | Four static legacy/showroom/service/EMI cards and images | Copy/media/ordering/visibility | Pending |
| Community | Static Instagram profile/reel links and imagery | Social links, media, labels and ordered cards | Pending |
| Finance partners | Local finance assets in two looping rows | Partner CRUD, image, order, active state and disclosure copy | Pending; animation preserved |
| Footer/contact | Static company description/address/phone/email, category/policy/payment labels | Business settings, branch/contact/social/policy content | Pending; no verified policy page workflows |
| WhatsApp | Local contact link | Owner-managed contact number and enquiry template | Pending |

## Category feature rules

- Existing ten cards were migrated into Category records without replacing existing records or deleting products.
- Only active categories marked show_on_homepage are public. New admin categories start hidden until explicitly enabled and supplied an image.
- Sort by display_order, then name and id. Lower order appears first.
- Starting price is optional merchandising copy, stored as DECIMAL. It is not an inventory-derived minimum or a product price update. The owner must maintain its accuracy.
- Destination is restricted to existing homepage sections; no arbitrary script/external URL is accepted.
- Images use existing local artwork or owner-uploaded PNG/JPEG/WebP. Upload validation inspects file content, limits5MB/16MP, strips metadata through rendering, preserves an original, and creates1280px/320px WebP variants with versioned UUID names.
- Image processing is synchronous and bounded for this small-image workflow. Celery queue processing for large/bulk media remains pending. Upload throttling is10/minute per user using the configured cache; distributed production limits require shared caching.
- Public reads are uncached at API/SSR layers so a reload sees current data. No WebSocket push or live multi-tab auto-refresh is claimed. Flutter supports refresh and error retry.
- Deleting a category referenced by a product returns409; deactivate/hide it instead. Uploaded files are retained on category deletion to avoid breaking other references; an audited media retention workflow remains pending.

## Frontend and mobile behavior

The website keeps its existing category design and reads the public API on the server. Invalid/unavailable API data shows an honest unavailable state rather than silently showing obsolete hardcoded cards. Zero published categories shows an empty state. Other homepage sections remain visually unchanged.

Flutter now reads the same paginated categories API via Riverpod/Dio and displays published category cards with cached images, loading/empty/error states and refresh. Category product-list navigation is not implemented or presented as a working button. This is category-content integration, not completion of the mobile storefront.

## Acceptance and remaining sequence

The targeted browser scenario creates a category in the custom admin, uploads an image, saves content/order/link, verifies the real homepage, edits a badge, hides it, verifies disappearance and deletes it. Backend tests cover persistence, public filtering/order, owner/CSRF enforcement, unsafe values and actual image validation/variants. Flutter tests cover rendering, retry, empty state and image URL resolution. Android/iOS device and Maestro E2E remain unverified where tooling/devices are absent.

Next integrated slices: real product/media publication into storefront and mobile; brand-logo publication; campaign/hero CRUD with draft/publish; shared contact/footer settings; remaining content sections; inventory/checkout/permissions. Do not represent the audit list as implemented modules.
