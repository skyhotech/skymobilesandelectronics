# MySQL database design

Authoritative database: `sky_commerce`. Schema is maintained through Django migrations; `mysql-schema.sql` is a schema-only export of the migrated local database, not a second migration system. No customer or credential data is included in that export.

## Current implemented entities

| Table | Purpose | Integrity |
|---|---|---|
| auth_user | Staff/customer authentication | Unique username; Django password hashes |
| auth_group and permission joins | Built-in roles/permissions | Unique associations and foreign keys |
| brands_brand | Product brands | Unique name and slug |
| categories_category | Product categories | Unique name and slug |
| branches_branch | Store locations | Unique branch code |
| products_product | Catalog and prices | Unique SKU/slug; protected brand/category references |
| inventory_stock | Branch stock balance | Unique product/branch pair; protected references |
| django_admin_log | Native admin history | User/content-type references |
| django_session | Server-side login sessions | Session primary key and expiry index |
| django_content_type | Django model registry | Unique application/model pair |
| django_migrations | Applied migration history | Managed by Django |

There are 17 physical tables, including Django many-to-many tables. All use InnoDB with transaction support. Primary keys and references use Django's existing integer definitions. utf8mb4 supports Tamil, English and emoji; case-sensitive collation preserves identifier uniqueness behavior from the former database.

Product money is DECIMAL(12,2), currency constrained to INR. Selling price must be positive; optional comparison price must be at least the selling price. Quantity/reserved stock use unsigned integers, with reserved <= quantity. Eleven CHECK constraints are present after the homepage category migration. Unique constraints prevent duplicate SKUs, slugs and branch stock records.

Timestamps remain Django UTC-aware values, represented by MySQL datetime columns. API contract and frontend/Dart identifiers are unchanged. Default transaction isolation is read committed; future stock reservation/checkout must explicitly use atomic transactions and appropriate row locks.

## Scope limits

Product variants, carts, orders, payments, stock movement ledger, reservations and custom RBAC are not implemented database entities yet. They must be introduced through tested vertical feature migrations, not fabricated empty tables presented as working modules. Existing protected relationships and price/stock constraints were preserved during the engine migration.


## Homepage category fields

categories_category now owns the storage-backed image FileField, badge, description, optional starting_price DECIMAL(12,2), destination (an existing homepage section), display_order and show_on_homepage. A positive-price CHECK and required-image CHECK protect the new presentation fields. Public DRF reads require is_active and show_on_homepage. Existing ten homepage cards were seeded without overwriting existing category records. Product-category protection remains unchanged. Browser and Flutter consume this table through the same DRF API; neither accesses MySQL directly.


## Universal media

media_library_mediaasset records relative public/private FileField names, dimensions, checksum, sizes, status and ownership. media_library_mediastoragestate serializes global quota admission and tracks retained bytes. Product.image and Brand.logo are FileFields. Public API image_url/logo_url values are derived by storage APIs; no filesystem root or hostname is stored. Private originals cannot generate public URLs. See MEDIA_STORAGE.md for deployment acceptance limits.
# Category hierarchy update

`categories_category.parent_id` is a nullable self-reference protected from
deletion while children exist. DRF permits up to 12 hierarchy levels
and returns `parent` (ID/null) and read-only `parent_name`. Category image
references remain relative filesystem-storage names; no host paths are stored.

`categories_categorytreestate` stores the singleton tree revision and serializes
management writes using a database row lock. Move requests include the expected
revision to prevent stale hierarchy/order changes. Public snapshots use this
revision as their ETag and omit descendants of any unpublished/inactive ancestor.

