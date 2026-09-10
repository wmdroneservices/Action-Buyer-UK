# 2026-09-10 — Product Workbench Purchasing Dashboard Runtime Fix

## User-reported fault

The Product Workbench still displayed **PURCHASING DASHBOARD** for a DJI Osmo Action 6 that had already reached Sales.

## Investigation

The previous repair had already removed the static Purchasing Dashboard anchor from `inventory-detail.html`.

Current GitHub inspection then found the remaining source in `inventory-workbench.js`: the Product Workbench header was generating an `admin-purchasing.html` link dynamically.

This was the first actual point of failure.

## Repair

- Added defensive runtime removal of any `a[href="admin-purchasing.html"]` inside the Product Workbench root in `inventory-sales-channels.js`.
- Added a `MutationObserver` so the generated legacy link is removed even when `inventory-workbench.js` inserts its markup after page load.
- Bumped the Product Workbench Sales Channels script cache version to `v=20260910-sold-price-edit-2` in `inventory-detail.html`.
- No Supabase tables, RPCs, inventory states, purchasing records or sales records were changed.

## Preservation

The Sales-channel panel, sold-price correction, Sales handoff and existing Product Workbench behaviour remain unchanged apart from the removal of the obsolete Purchasing route.

## Verification

GitHub verification confirms:

- `inventory-detail.html` contains no static Purchasing Dashboard link.
- `inventory-sales-channels.js` contains the runtime removal and DOM observer.

Browser verification after deployment/cache refresh remains required.

## Diagnostic roadmap

`docs/DIAGNOSTIC-ROADMAPS/PRODUCT-WORKBENCH-SALES-STAGE.md`
