# 2026-09-10 — Live Website Hierarchy and Filter Fix

## Reported behaviour

The first version of Live Website Control was a flat manufacturer/category/product list. This did not match the required workflow: Management needs to open a manufacturer, then that manufacturer's branch/category, then individual products. The public Shop filters also behaved as independent selectors, so choosing a manufacturer and then a category could discard the manufacturer and show all manufacturers for that category.

## Diagnosis

The existing database supported manufacturer, category and product visibility, but not a manufacturer-specific category branch. A global `category` override would have caused an unwanted side effect: hiding `Drones` beneath DJI would hide Drones for every manufacturer.

The public Shop JavaScript also explicitly cleared the opposite filter when either Manufacturer or Category changed.

## Repair

### Database

Added the `manufacturer_category` visibility scope using a stable key:

`<manufacturer>::<canonical category>`

Updated the public storefront read functions so this scope is honoured by:

- `public_storefront_categories`
- `public_storefront_manufacturers`
- `public_storefront_category_manufacturers`
- `public_storefront_models`
- `public_storefront_catalog`
- `public_storefront_stock`

Added `public_storefront_manufacturer_categories(...)` for exact manufacturer → category browsing.

Extended the existing Management-only `staff_set_storefront_visibility(...)` writer to accept `manufacturer_category` without relaxing its Management security check.

Added `staff_storefront_visibility_tree(...)` as the Management tree data source.

### Staff dashboard

Replaced the flat visibility lists with:

**Manufacturer → Category/Branch → Individual Product**

Each level uses:

- RED = NOT LISTED
- GREEN = LISTED
- YELLOW = AUTO

Visibility changes now save immediately when Management changes a selector. No separate save step is required.

### Public website

Manufacturer and Category filters are now dependent. Selecting a manufacturer limits the category list to that manufacturer's visible categories. Selecting a category limits the manufacturer list to manufacturers that have visible products in that category. When both are selected, the exact manufacturer/category combination is retained for model and stock browsing.

## Preservation

- `sales_catalog_visibility` contained zero overrides before/after this repair.
- No product was deliberately hidden by the repair.
- No catalogue product `active` values were changed.
- No inventory, listing, sales or valuation records were changed.
- Existing Management-only write protection remains in force.

## Verification

Supabase functions were deployed successfully. Baseline checks confirmed DJI currently has multiple visible categories, including Drones and Action Cameras, and the Action Cameras manufacturer function returns only manufacturers with visible products in that category.

Browser verification remains required for the live dashboard tree and public Shop interactions.

## Related roadmap

`docs/DIAGNOSTIC-ROADMAPS/LIVE-WEBSITE-VISIBILITY-CONTROL.md`
