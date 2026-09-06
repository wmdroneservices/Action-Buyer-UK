# Sales Dashboard Stock Search — 6 September 2026

## Workstream

Sales / Inventory

## Implemented

A compact **Search Stock** control was added to the Sales Dashboard.

Staff can search by:

- SKU;
- transaction number;
- product (manufacturer + model);
- All identifiers.

Results show:

- product;
- SKU;
- transaction number;
- current status;
- direct Product Workbench handoff.

## Authoritative source

`public.inventory_assets`

No new search table, copied inventory index or workflow mutation was introduced.

## Files

- `admin-sales-dashboard.html`
- `admin-sales-dashboard.js`
- `style.css`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DIAGNOSTIC-ROADMAPS/PHASE2-RETAIL-STOREFRONT.md`

## Verification

- current live schema confirmed `sku`, `transaction_number`, `manufacturer`, `model` and `status` on `inventory_assets`;
- current controlled test inventory includes all search identities;
- JavaScript parsed successfully after the change;
- live database check confirmed DJI Neo / `GCO-2026-100015` / `TEST-TXN-006` resolves to the same asset.

## Known scaling note

The initial implementation reads the authoritative inventory set through the authenticated staff client and filters the requested identifiers in the dashboard. If inventory volume grows materially, replace the broad read with a controlled server-side search/RPC while preserving RLS and the single inventory truth.
