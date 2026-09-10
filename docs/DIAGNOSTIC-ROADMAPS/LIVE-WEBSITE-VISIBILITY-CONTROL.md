# Developer Diagnostic Roadmap — Live Website Visibility Control

## Purpose

Management must be able to control the public retail storefront without changing the master Quote Catalogue used by valuations and research.

The visibility hierarchy is:

**Manufacturer → canonical retail category → individual catalogue product → published WEBSITE stock**

## User actions

1. Open **LIVE WEBSITE** from management tools.
2. Select manufacturers to show or hide.
3. Select categories to show or hide.
4. Search and set individual catalogue products to `AUTO`, `SHOW` or `HIDE`.
5. Open **VIEW ONLY LIVE WEBSITE PRODUCTS** to inspect the current published website stock.

## Front-end entry points

- `admin-live-website.html` — management visibility controls.
- `admin-live-website.js` — authenticated management guard and visibility controls.
- `admin-live-website-products.html` — read-only live stock view.
- `admin-live-website-products.js` — current published WEBSITE listing view.
- `admin-outlet-management.html` — outlet configuration and live WEBSITE outlet URL.
- `admin-outlet-management.js` — editable outlet registry.
- Retail repository `index.html` — homepage category rendering.
- Retail repository `js/shop.js` — public category/manufacturer/model/product browsing.

## Supabase path

### Tables

- `sales_storefronts` — storefront identity/configuration.
- `sales_catalog_visibility` — manufacturer/category/product visibility overrides.
- `quote_catalog_products` — master catalogue; not deactivated by storefront visibility controls.
- `resale_listings` — authoritative published retail listing.
- `inventory_assets` — physical stock and catalogue-product linkage.
- `sales_outlets` — WEBSITE outlet and other sales channels.

### Authoritative functions

- `canonical_storefront_category(...)` — stable retail category routing.
- `public_storefront_categories(...)` — public visible category read model.
- `public_storefront_manufacturers(...)` — public visible manufacturer read model.
- `public_storefront_catalog(...)` — public visible catalogue read model.
- `public_storefront_stock(...)` — public published WEBSITE stock read model.
- `staff_storefront_visibility_catalog(...)` — management control data.
- `staff_set_storefront_visibility(...)` — individual override.
- `staff_set_storefront_scope_mode(...)` — deterministic show-only/reset for manufacturers or categories.
- `staff_live_storefront_products(...)` — read-only management view of currently live WEBSITE listings.
- `staff_update_sales_outlet(...)` — management-only outlet editing.

## Visibility rules

- `AUTO` means no override; the normal storefront rule applies.
- `SHOW` explicitly allows the scope unless a parent scope is hidden.
- `HIDE` removes the scope from public storefront queries.
- Manufacturer, category and product hides are cumulative.
- The control page's **SHOW ONLY SELECTED** operation writes `SHOW` for selected current keys and `HIDE` for other currently known keys in that scope.
- Reset removes overrides and returns the scope to `AUTO`.

## Important safety boundary

Do **not** use `quote_catalog_products.active` to control retail website visibility. That field is part of the master catalogue and can affect other systems. Retail storefront visibility is controlled only through `sales_catalog_visibility`.

## Outlet editing

The central outlet registry is also authoritative for Sales Workbench channel configuration. Active staff can read outlets; management users with `can_manage_staff=true` can create/edit/deactivate them.

## Failure checkpoints

1. Hidden manufacturer still appears → inspect `sales_catalog_visibility` manufacturer row and `public_storefront_manufacturers()`.
2. Hidden category still appears on homepage → inspect `public_storefront_categories()` and the retail `index.html` category rendering.
3. Hidden category still appears in Shop → inspect `public_storefront_categories()` / `public_storefront_catalog()` and `shop.js`.
4. Individual product remains visible → inspect product-level visibility row and `public_storefront_catalog()` / `public_storefront_stock()`.
5. Product disappears from valuations → stop; visibility must not be implemented by changing `quote_catalog_products.active`.
6. Live website control page cannot save → verify active management staff and the `sales_catalog_visibility` management policy/RPC.
7. Outlet edits fail → inspect `staff_update_sales_outlet()` and `sales_outlets` management policy.
8. Live-only view differs from public stock → compare `staff_live_storefront_products()` with `public_storefront_stock()`.

## Current verified state before first use

- `sales_storefronts.retail` is active.
- `sales_catalog_visibility` currently has zero overrides, so the current storefront remains unchanged by this repair.
- Existing public category data currently contains 14 canonical retail categories.
- Existing published WEBSITE stock remains authoritative and unchanged.
