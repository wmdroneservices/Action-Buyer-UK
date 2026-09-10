# 2026-09-10 — Live Website Control, Outlet Editing and Sales Cleanup

## User-reported requirements

1. Remove the Purchasing Dashboard link from the Product Workbench when an item has passed into Sales.
2. Allow the actual sold eBay price to be corrected after the item is Sold.
3. Make configured sales outlets editable.
4. Provide management control over live retail website manufacturers, categories and individual products.
5. Provide a read-only view containing only currently live website products.
6. Remove obsolete code that was still referenced by the Product Workbench.

## Investigation

Current GitHub, Supabase schema, storefront RPCs and the current project checkpoint were inspected before changes.

The Product Workbench still contained a static `PURCHASING DASHBOARD` link even for Sold/Sales-stage assets. `inventory-detail.html` also still referenced the previously removed `sales-sold-validation.js`, creating a stale script reference.

The current database already contained the correct storefront visibility architecture:

- `sales_storefronts`;
- `sales_catalog_visibility` with manufacturer/category/product scopes;
- public storefront RPCs that consume those visibility overrides.

However, there was no management UI for those controls, and the Gear1 Outpost homepage still contained a hard-coded category list.

The central outlet registry already existed, but its management page only allowed add/activate/deactivate; existing records were not editable.

The eBay Sold listing had `sold_price = 0` and the authoritative `staff_correct_sold_price(...)` RPC from the preceding repair was available but not exposed from the Product Workbench.

## Repair

### Sales / Product Workbench

- Removed the static Purchasing Dashboard button from `inventory-detail.html`. The Product Workbench remains the sales-stage product page rather than routing staff back to Purchasing.
- Removed the obsolete `sales-sold-validation.js` script reference from `inventory-detail.html`.
- Added an inline editable **ACTUAL SOLD PRICE** control to `inventory-sales-channels.js` for Sold listings.
- The control calls `staff_correct_sold_price(...)`, which updates the authoritative resale listing and inventory asset without reopening the sale.
- The MARK SOLD client validation now requires a positive sold price before calling the authoritative database RPC.

### Outlet Management

- `admin-outlet-management.html` now includes editable outlet forms.
- `admin-outlet-management.js` uses `staff_update_sales_outlet(...)` for existing outlet edits.
- Outlet management remains restricted to active management staff.
- Supabase RLS was corrected so active staff can read outlets but only management staff can write them.

### Live Website Control

Added management pages:

- `admin-live-website.html`
- `admin-live-website.js`
- `admin-live-website-products.html`
- `admin-live-website-products.js`

Management can now:

- show/hide manufacturers;
- show/hide categories;
- set individual products to AUTO/SHOW/HIDE;
- use SHOW ONLY SELECTED for manufacturers or categories;
- reset manufacturer/category overrides to AUTO;
- search individual catalogue products;
- open a read-only list containing only currently published WEBSITE products.

The control layer uses the existing storefront visibility tables and does not change `quote_catalog_products.active`.

### Supabase visibility/security

Added management RPCs:

- `staff_storefront_visibility_catalog(...)`
- `staff_set_storefront_visibility(...)`
- `staff_set_storefront_scope_mode(...)`
- `staff_update_sales_outlet(...)`
- `staff_live_storefront_products(...)`

Restored the intended policy split:

- active staff: read outlet/storefront/visibility configuration;
- management staff (`can_manage_staff=true`): write configuration.

### Public retail storefront

- Gear1 Outpost homepage category cards are now populated from `public_storefront_categories(...)` rather than a permanently hard-coded category list.
- The public manufacturer read model was tightened so manufacturer visibility also respects hidden category/product scopes.
- Existing `shop.js` already uses the public storefront visibility-aware RPC path and was not rewritten.

## Safety / preservation

- No catalogue products were deactivated.
- No existing visibility overrides were created; the current database has zero `sales_catalog_visibility` rows, so the current public catalogue remains unchanged.
- No inventory, resale listing, sold state or customer account data was changed.
- Existing multi-channel listing architecture remains intact.
- The Product Workbench purchasing link was removed rather than changing purchasing workflow data.
- The obsolete browser validation overlay was not recreated.

## Verification

Database verification completed:

- `sales_catalog_visibility` override count = 0 before first use.
- Retail storefront is active.
- Public storefront currently reports 14 canonical categories.
- Existing WEBSITE listings remain unchanged.
- RLS policies now distinguish staff read from management write.
- New management RPC identities were verified in PostgreSQL.

Browser verification is still required for:

1. Product Workbench sold DJI item — edit the eBay sold price and confirm it saves.
2. Product Workbench no longer shows Purchasing Dashboard for the sold item.
3. Outlet Management — edit an existing outlet and save.
4. Live Website Control — select DJI and Drones using SHOW ONLY controls, verify public homepage/Shop changes, then reset to AUTO to restore current state.
5. Individual product SHOW/HIDE — verify only the selected product changes.
6. Live Website Products — verify the read-only list contains only published WEBSITE stock.
7. Existing retail/public browsing remains intact.

## Diagnostic roadmap

`docs/DIAGNOSTIC-ROADMAPS/LIVE-WEBSITE-VISIBILITY-CONTROL.md`
