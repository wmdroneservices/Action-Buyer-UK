# Developer Diagnostic Roadmap — Live Website Visibility Control

## Purpose

Management must be able to control the public retail storefront without changing the master Quote Catalogue used by valuations and research. Sales and Purchasing staff can inspect the current storefront visibility from the main staff dashboard, but cannot change it.

The visibility hierarchy is:

**Manufacturer → canonical retail category → individual catalogue product → published WEBSITE stock**

## User actions

1. Open **LIVE WEBSITE** from the main staff dashboard.
2. Management selects manufacturers to show or hide.
3. Management selects categories to show or hide.
4. Management searches and sets individual catalogue products to `AUTO`, `SHOW` or `HIDE`.
5. Sales/Purchasing staff can inspect these states read-only.
6. Open **VIEW ONLY LIVE WEBSITE PRODUCTS** to inspect the current published website stock.

## Front-end entry points

- `admin.html` — main staff dashboard; LIVE WEBSITE card is available to active Management, Sales and Purchasing staff.
- `admin-dashboard.js` — maps Sales/Purchasing/Management permissions to the storefront card.
- `admin-live-website.html` — storefront visibility controls/read-only view.
- `admin-live-website.js` — staff access guard, read-only state and management controls.
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
- `staff_users` — role permissions used by the staff access guard.

### Authoritative functions

- `canonical_storefront_category(...)` — stable retail category routing.
- `public_storefront_categories(...)` — public visible category read model.
- `public_storefront_manufacturers(...)` — public visible manufacturer read model.
- `public_storefront_catalog(...)` — public visible catalogue read model.
- `public_storefront_stock(...)` — public published WEBSITE stock read model.
- `staff_storefront_visibility_catalog(...)` — management control/read data.
- `staff_set_storefront_visibility(...)` — individual management override.
- `staff_set_storefront_scope_mode(...)` — deterministic management show-only/reset for manufacturers or categories.
- `staff_live_storefront_products(...)` — read-only management view of currently live WEBSITE listings.
- `staff_update_sales_outlet(...)` — management-only outlet editing.

## Staff access rules

- Active Management (`can_manage_staff=true`) — full visibility control.
- Active Sales (`can_access_sales=true`) — read-only visibility inspection.
- Active Purchasing (`can_access_purchasing=true`) — read-only visibility inspection.
- Other active staff — no LIVE WEBSITE dashboard entry unless one of the above permissions applies.
- Database write RPCs remain Management-only; the staff UI does not weaken that security boundary.

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

1. LIVE WEBSITE card missing for Sales/Purchasing → inspect `admin-dashboard.js` staff permission mapping and `staff_users` flags.
2. Sales/Purchasing can edit controls → inspect `admin-live-website.js` and immediately verify the management-only database RPC guards; do not weaken those guards.
3. Hidden manufacturer still appears → inspect `sales_catalog_visibility` manufacturer row and `public_storefront_manufacturers()`.
4. Hidden category still appears on homepage → inspect `public_storefront_categories()` and the retail `index.html` category rendering.
5. Hidden category still appears in Shop → inspect `public_storefront_categories()` / `public_storefront_catalog()` and `shop.js`.
6. Individual product remains visible → inspect product-level visibility row and `public_storefront_catalog()` / `public_storefront_stock()`.
7. Product disappears from valuations → stop; visibility must not be implemented by changing `quote_catalog_products.active`.
8. Live website control page cannot save → verify active management staff and the `sales_catalog_visibility` management policy/RPC.
9. Outlet edits fail → inspect `staff_update_sales_outlet()` and `sales_outlets` management policy.
10. Live-only view differs from public stock → compare `staff_live_storefront_products()` with `public_storefront_stock()`.

## Current verified state

- `sales_storefronts.retail` is active.
- `sales_catalog_visibility` currently has zero overrides, so the current storefront remains unchanged.
- Existing public category data currently contains 14 canonical retail categories.
- Existing published WEBSITE stock remains authoritative and unchanged.
- Management-only write policies/RPC guards remain in force.
- Browser verification of the new main-dashboard entry and role-specific read-only behaviour remains required.
