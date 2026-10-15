# Categories and subcategories

Category drag handles lift a floating card that follows the pointer across the
viewport, with 3D tilt, a soft glow and animated sibling movement. Drop on a
category in the current folder to save the order. Escape, interrupted gestures,
or dropping outside a valid target cancel the drag. Positions are category
ordering, not permanent free-form website coordinates. Reduced-motion settings
disable tilt and movement animations; up/down buttons remain available.

Open `/management/admin/`, select **Categories**, then **Add category**.
Leave **Parent category** empty for a main category, or choose any category
to create its subcategory. Nesting supports up to 12 levels. Edit and delete use the existing category controls.
The admin shows only the cards inside the currently opened category. Click a card to open its subcategories, and use breadcrumbs to navigate back.

Select **Upload image** to open the computer's file picker. Choose a PNG, JPEG
or WebP file (up to 5 MB and 16 megapixels). The authenticated, CSRF-protected
request uploads it to Django, which validates and optimizes the image, stores
the public WebP in `MEDIA_ROOT/categories/optimized/` and preserves the original
in private storage. The database stores the relative filename. The preview shows
the actual media URL. Saving associates that image with the category.

Uploads use the existing universal media system: local development stores files
under `data/media/`; containers use `/app/media/` with the configured persistent
host mount. Uploading does not save files inside frontend/public. Removing an
image association or deleting a category does not erase shared media files.

Enable **Active** and **Show on homepage** to publish a category; publishing
requires an image. A subcategory appears only while every ancestor is also active
and published. Website cards display the parent name. The
website header lists published main categories, and its search category picker
includes published main categories and subcategories. These lists come from DRF,
with no fixed category-name or artwork arrays. Open storefronts automatically check for changes every five seconds. No manual refresh
is required. The website pauses checks in background tabs and uses ETag conditional requests
to avoid downloading unchanged trees. Website clients share one TanStack Query
cache for the header, search menu and category cards. Stale website data remains visible
when live checks fail, with a retry notice on the website.
The existing link-to-section setting still targets the current homepage sections;
standalone category product-listing pages are outside this change.

The API rejects self-parenting, cycles and moves exceeding the 12-level limit,
including descendants of the branch being moved. Deleting a parent with children returns 409; move
or delete the children first. Existing product-category protections still apply.

## Nested category cards

The sidebar uses real URLs: `/management/admin/products`,
`/management/admin/brands`, and `/management/admin/categories`.
Opening a category card goes to `/management/admin/categories/<id>` and shows
only that category's immediate subcategories. Open another card to go deeper.
Breadcrumbs, direct links, page refresh and browser Back preserve the folder.
The root `/management/admin` remains a compatible entry to the products section.

Each card displays its image, name, status, subcategory count and Edit/Delete
controls. Add category inside a folder automatically selects that parent.
Search applies to the current folder; Show inactive includes retired categories.
Drag a dotted card handle onto another card to reorder the current list. The
same behavior is available independently at every level. Up/down buttons provide
keyboard and touch alternatives. Reparenting remains available through the parent
selector in Edit. There is no global tree panel or separate nesting drop buttons.
Existing descendants stay attached when a parent category is moved or edited.

Migration 0007 adds a singleton category-tree revision record. All management
category writes lock it inside a database transaction. Moves submit the last
revision; stale moves return 409 and refresh the admin tree instead of overwriting
another editor's work. The limit is 10,000 categories, including inactive entries.

API additions:

- `GET /api/v1/categories/tree/`: public published snapshot `{revision, nodes}`
  with ETag support. Ancestors control visibility at every level.
- `GET /api/v1/management/categories/tree/`: owner-only complete snapshot.
- `POST /api/v1/management/categories/move/`: owner-only, CSRF-protected move
  `{id, parent, before, revision}`. `parent: null` means root; `before: null`
  appends to that sibling group. A successful response returns the new revision.

This is five-second conditional polling, not a WebSocket deployment. It works
without Redis. Polling volume should be measured before scaling to a large live
audience. Category writes must go through the management API so validation,
locking and revision updates remain authoritative; direct SQL/ORM writes bypass
this flow. No production deployment or native-device test is implied.

Migration 0005 adds the nullable parent relationship. Migration 0006 retires only
rows that still match every original demo merchandising value and artwork path.
It hides/deactivates these rows without deleting categories, products or images.
Edited categories are preserved. Retired rows remain visible in admin as inactive
and can be repurposed or deleted there. Reversing this migration does not republish
demo data automatically; explicitly activate and publish desired categories.

Verification includes Django parent/child CRUD and deletion rules, browser file
uploads and storefront image decoding.
VPS persistence checks have not run here.
