# Nested category cards and admin URLs

The former global category tree panel has been replaced with one folder of cards
at a time. Main categories appear first; opening a card shows its subcategories,
and opening a subcategory shows the next level. Cards contain their image, status,
name, immediate child count, Edit/Delete controls, a drag handle and order buttons.
Existing category records, media, descendants and publication rules are preserved.

Sidebar URLs:

- `/management/admin/products`
- `/management/admin/brands`
- `/management/admin/categories`
- `/management/admin/categories/<id>` for the immediate children of a category.

Breadcrumb links and browser history navigate folders. Direct links and reloads
preserve the current section/folder. The selected sidebar item uses aria-current.
Existing management authentication guards protect all new paths.

Drag handles reorder the current sibling list at every level. A forward drop
moves after the target; a backward drop moves before it. Up/down buttons provide
an alternative. Editing the parent moves a branch to another category. Add category
inside a folder defaults to that parent, including while parent choices load.
Category search is scoped to the open folder. Inactive entries are optional.

The Django move contract, revision conflict handling and live public category feed
are reused; no migrations or API/mobile contract changes were necessary. The
storefront continues to update without a manual page refresh.

Verification covers real card dragging, nested folder URLs, sidebar URLs, refresh,
browser Back, default parent creation, uploads, CRUD, live storefront updates and
mobile viewport overflow. Screenshots are in `.run/category-cards-desktop.png`
and `.run/category-cards-mobile.png`. Git remains uncommitted because the repository
still has an untracked initial baseline; no production deployment was performed.
