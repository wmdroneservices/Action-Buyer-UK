# Developer Diagnostic Roadmap — Live Website Visibility Control

## Purpose

Management controls what the public retail storefront is allowed to show without changing the master Quote Catalogue used by valuations and research. Sales and Purchasing staff can inspect the same state read-only.

The management hierarchy is deliberately:

**Manufacturer → that manufacturer's category/branch → individual products**

A manufacturer can therefore be closed while its whole branch remains configured, or a single branch such as **DJI → Drones** can be closed without closing DJI's other branches. Individual products can then be closed beneath that branch.

## User actions

1. Open **LIVE WEBSITE** from the main staff dashboard.
2. Open a manufacturer.
3. Open one of that manufacturer's categories/branches.
4. Set the manufacturer, manufacturer/category branch, or individual catalogue product to `LISTED`, `NOT LISTED`, or `AUTO`.
5. Changes save immediately; there is no separate save button.
6. Search can locate a manufacturer, branch or product and automatically expose matching ancestors.
7. Sales/Purchasing staff can inspect the tree read-only.

## Status colour coding

- **RED = NOT LISTED** — explicit `HIDE` override.
- **GREEN = LISTED** — explicit `SHOW` override.
- **YELLOW = AUTO** — no explicit override; normal storefront rules apply.

A product also reports its effective website state. For example, a product can be yellow `AUTO` but effectively not listed because its manufacturer or manufacturer/category branch is red.

## Front-end entry points

- `admin.html` — main staff dashboard; LIVE WEBSITE card is available to active Management, Sales and Purchasing staff.
- `admin-dashboard.js` — maps staff permissions to the storefront card.
- `admin-live-website.html` — hierarchical visibility tree/read-only view.
- `admin-live-website.js` — authenticated access, tree rendering, status colours and immediate Management writes. It pages through the complete catalogue rather than stopping at the Supabase 1,000-row REST limit.
- Retail repository `shop.html` — public catalogue filter interface.
- Retail repository `js/shop.js` — dependent manufacturer/category filtering and manufacturer → category → model → stock browsing.
- `admin-purchasing.html` — Purchasing Dashboard.
- `admin-purchasing.js` — existing purchasing pipeline plus dynamic loading of the purchasing catalogue controller.
- `admin-purchasing-catalog-control.js` — Purchasing manufacturer → category → product active/inactive tree.

## Supabase path

### Tables

- `sales_storefronts` — storefront identity/configuration.
- `sales_catalog_visibility` — public storefront visibility overrides. Supported scope types are `manufacturer`, `manufacturer_category`, `category` and `product`.
- `quote_catalog_products` — master catalogue. `active` controls whether a catalogue product is available to the purchasing/valuation catalogue; `customer_visible` is separate public/customer presentation state.
- `resale_listings` — published retail listings.
- `inventory_assets` — physical stock and catalogue-product linkage.
- `sales_outlets` — WEBSITE outlet and other sales channels.
- `staff_users` — staff role permissions.

### Visibility keys

- Public manufacturer: `scope_type='manufacturer'`, `scope_key=<manufacturer>`.
- Public manufacturer branch: `scope_type='manufacturer_category'`, `scope_key=<manufacturer>||'::'||<canonical category>`.
- Public category-wide override: `scope_type='category'`, `scope_key=<canonical category>`.
- Public product: `scope_type='product'`, `scope_key=<catalog_product_id>`.
- Purchasing manufacturer branch: `<manufacturer>||'::'||<quote_catalog_products.category>`; this is deliberately based on the master catalogue's actual category because the purchasing control changes `quote_catalog_products.active`.

### Authoritative functions

- `canonical_storefront_category(...)` — stable retail category routing.
- `public_storefront_categories(...)` — public visible categories.
- `public_storefront_manufacturers(...)` — public visible manufacturers.
- `public_storefront_manufacturer_categories(...)` — categories available beneath one manufacturer.
- `public_storefront_category_manufacturers(...)` — manufacturers available within one category.
- `public_storefront_models(...)` — visible models for a manufacturer/category combination.
- `public_storefront_catalog(...)` — visible searchable catalogue.
- `public_storefront_stock(...)` — visible published WEBSITE stock.
- `staff_storefront_visibility_tree(...)` — Management tree data, now paginated with `p_limit`/`p_offset`.
- `staff_set_storefront_visibility(...)` — Management-only public storefront override writer.
- `staff_set_storefront_scope_mode(...)` — existing Management-only bulk manufacturer/category writer.
- `staff_set_purchasing_catalog_visibility(...)` — Purchasing/Management active/inactive writer for manufacturer, manufacturer/category branch or individual product.

## Public website filter rules

The Manufacturer and Category filters are dependent rather than independent:

- No filters → normal category browsing.
- Manufacturer selected → Category dropdown contains only categories available for that manufacturer.
- Category selected → Manufacturer dropdown contains only manufacturers available for that category.
- Manufacturer + Category selected → models are limited to that exact combination.
- Changing Manufacturer retains the category when that category exists for the selected manufacturer.
- Changing Category retains the manufacturer when that manufacturer exists for the selected category.
- Search passes both selected filters into `public_storefront_catalog(...)`, so a search cannot escape the active manufacturer/category restriction.

## Purchasing catalogue control rules

Purchasing now has its own catalogue activation control inside the Purchasing Dashboard:

**Manufacturer → Category/Branch → Product**

- Manufacturer `ACTIVE` activates all products under that manufacturer; `INACTIVE` deactivates them.
- Manufacturer/category `ACTIVE` activates only that manufacturer's products in that category; `INACTIVE` deactivates only that branch.
- Individual product `ACTIVE`/`INACTIVE` controls one exact catalogue product/package record.
- Mixed parent states are displayed as `MIXED` rather than being silently converted.
- Search finds manufacturers, categories and individual products.
- The controller loads the full catalogue in 1,000-row pages, so all 73 current manufacturers and all 3,845 current catalogue products are reachable rather than stopping at the first 1,000 rows.
- The purchasing writer requires an active Purchasing or Management staff account.

## Failure checkpoints

1. Manufacturer cannot be expanded → inspect `staff_storefront_visibility_tree()` and `admin-live-website.js` grouping/pagination.
2. Only the first manufacturers appear → inspect the 1,000-row paging loop in `admin-live-website.js` and the `p_limit`/`p_offset` parameters.
3. **Category expands but individual products do not appear** → inspect `admin-live-website.html` CSS for both `.tree-row.open>.tree-children` and `.tree-child.open>.tree-children`. The category nodes are `.tree-child`, so a selector targeting only `.tree-row.open` prevents the product controls from becoming visible even though `admin-live-website.js` renders them.
4. Branch toggle affects the same category under every manufacturer → inspect `manufacturer_category` key construction and the public functions; do not replace it with a global `category` scope.
5. Individual product remains visible → inspect product-level visibility and `public_storefront_catalog()` / `public_storefront_stock()`.
6. Hidden branch remains visible in public Shop → inspect `public_storefront_catalog()`, `public_storefront_models()` and `public_storefront_stock()` for the `manufacturer_category` condition.
7. Public filter shows manufacturers unrelated to the selected category → inspect `public_storefront_category_manufacturers()` and `shop.js`.
8. Selecting a manufacturer and category loses one of the filters → inspect `navigateAfterFilterChange()` and dependent option loading.
9. Purchasing product cannot be activated/deactivated → inspect `admin-purchasing-catalog-control.js`, `staff_set_purchasing_catalog_visibility()` and `staff_users.can_access_purchasing`.
10. Purchasing branch changes another manufacturer's products → inspect the `<manufacturer>::<category>` key and do not substitute a global category update.
11. Product disappears from valuations unexpectedly → inspect `quote_catalog_products.active` history before changing anything else; this is a purchasing/valuation control, not a public storefront control.
12. Sales/Purchasing can edit public storefront visibility → inspect `admin-live-website.js` and the Management-only database guard in `staff_set_storefront_visibility()`.
13. Visibility control fails to save → verify active Management staff and `sales_catalog_visibility` write RPC.

## Repair checkpoint — individual product controls not visible — 10 September 2026

### User action

Management opened the Live Website Control hierarchy and could see manufacturer/category rows and their `AUTO` controls, but opening a category did not reveal the individual products underneath it. This made the product-level LISTED / NOT LISTED / AUTO control unusable from the interface.

### First actual failure

`admin-live-website.js` correctly rendered each product as a `.tree-child` containing its own `.tree-control` select. The click handler also correctly toggled the category `.tree-child` between open and closed. The failure was the CSS selector in `admin-live-website.html`: it only displayed children for `.tree-row.open`, while category nodes are `.tree-child`. Therefore the generated product controls were present in the DOM but remained `display:none`.

### Minimal repair

Changed the category expansion selector from a manufacturer-only rule to:

` .tree-row.open>.tree-children,.tree-child.open>.tree-children `

and advanced the script cache-bust to `admin-live-website.js?v=20260910-hierarchy-2`.

No visibility records, catalogue products, inventory, listings, sales or valuations were modified.

### Verification performed

- Current GitHub `admin-live-website.js` inspected: product-level `control('product', p.product_id, pm)` rendering and change/save path already existed.
- Current GitHub `admin-live-website.html` inspected after repair: `.tree-child.open>.tree-children` selector is present.
- Supabase catalogue state inspected: 3,845 products across 73 manufacturers.
- The existing `staff_set_storefront_visibility()` path remains the product-level writer.
- Browser hard-refresh verification remains required: open a manufacturer, open a category such as DJI → Drones, confirm individual products and their controls appear, then test one product control without committing an unwanted visibility change.

## Current verified state

- `sales_storefronts.retail` is active.
- `sales_catalog_visibility` remains at zero overrides after this repair.
- The master catalogue currently contains 3,845 products across 73 manufacturers.
- Baseline live data includes DJI categories such as Drones, Action Cameras, Cameras, Drone Accessories and others.
- No inventory, listings, sales or valuation records were modified by this repair.
- Browser verification remains required after deployment.
