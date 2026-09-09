# Completed Purchase Navigation and Explicit Sales Handover — 9 September 2026

## User report

After confirming payment sent, the staff member landed on the completed sale page showing:

- BACK TO PURCHASING
- SALES DASHBOARD
- BACK TO SALES & SHIPPING

and a completion message, rather than the two actual next workflow choices.

## Current-state inspection

Live sale:

- `GCO-20260909183333-542b16`
- `sales.status = completed`
- `sales.payment_status = paid`

Linked inventory asset:

- `72fcf2d5-9fb5-4683-9af7-bed3b646edc3`
- `status = Ready for Resale`
- `sent_to_sales_at = null`

Therefore payment completion was correct, but the asset had **not yet been handed to Sales**.

## First actual failure

`admin-sale-next-step.js` rendered a passive “Sale completed” panel and `admin-sale.html` retained generic Sales navigation in the header.

That blurred the boundary between:

1. customer payment completion; and
2. explicit Inventory → Sales handover.

## Repair

### `admin-sale-next-step.js`

The completed branch now:

1. looks up the linked `inventory_assets` row by `source_sale_id`;
2. shows **VIEW & SEND TO SALES** while the asset remains pre-Sales;
3. always shows **RETURN TO PURCHASING DASHBOARD**.

### `admin-sale.html`

Removed:

- SALES DASHBOARD
- BACK TO SALES & SHIPPING

The header now contains only:

- RETURN TO PURCHASING DASHBOARD

The next-step script cache reference was bumped.

## Verification

Current GitHub confirms:

- linked asset lookup by `source_sale_id`;
- completed panel contains both required actions;
- generic Sales header links are removed;
- new script cache version is referenced.

Live Supabase confirms the tested sale is completed/paid while its asset remains Ready for Resale, so **VIEW & SEND TO SALES** is the correct next action.

## Documentation

Updated:

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`
