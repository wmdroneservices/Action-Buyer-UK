# Developer Diagnostic Roadmap Addendum — Sold Sale Validation and Shipping Capture

**Date:** 10 September 2026  
**Parent roadmap:** `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`

## User action

Staff open a live sales listing and choose **MARK SOLD** after an external marketplace sale.

## First failure identified

The DJI Osmo Action 6 test item (`GCO-2026-100023`) was successfully marked Sold on eBay, but the GearCashOut record contained:

- `resale_listings.status = 'Sold'`;
- `inventory_assets.status = 'Sold - Awaiting Shipping'`;
- `inventory_assets.sold_channel = 'eBay'`;
- `inventory_assets.sold_price = 0`;
- no `sales_fulfillments` row.

The website listing was correctly cancelled after the cross-channel sale.

## Expected path

`Published / Reserved listing`
→ staff records actual sold price and sales costs
→ staff records shipping method/carrier
→ sale and initial fulfilment record are committed atomically
→ `inventory_assets = Sold - Awaiting Shipping`
→ tracking / label details can be added or amended
→ `sales_fulfillments = Label Created`
→ Ready for Collection
→ Collected
→ `inventory_assets = Sold - Shipped`
→ Delivered
→ return window
→ Archive after return hold.

## Front-end path

### Sale finalization

- `inventory-detail.html`
- `inventory-sales-channels.js` — existing channel/listing UI
- `sales-sold-validation.js` — strict MARK SOLD interception and shipping capture

### Post-sale maintenance

- `sales-stock-workflow.html`
- `sales-stock-workflow.js`
- `sales-sold-validation.js`

## Supabase path

### Tables

- `inventory_assets`
- `resale_listings`
- `sales_fulfillments`

### RPCs

- `staff_mark_resale_listing_sold(...)` — legacy/general sold transition, now rejects zero/missing sold prices;
- `staff_finalize_resale_sale(...)` — authoritative atomic sale + initial fulfilment transition;
- `staff_correct_resale_sale_price(...)` — repairs legacy invalid zero-value Sold records;
- `staff_create_sales_fulfillment(...)` — creates/updates the shipping record after the sale;
- `staff_update_sales_fulfillment(...)` — advances collection/delivery states.

## Validation rules

1. Sold price must be greater than £0.
2. Selling fees cannot be negative.
3. Shipping cost cannot be negative.
4. Shipping method/carrier is required before a new sale can be finalized.
5. Tracking number may be absent initially because an external marketplace may issue it after the sale.
6. Label/order URL may be recorded when available.
7. Existing valid Sold records cannot be silently overwritten by another MARK SOLD action.
8. Legacy zero-value Sold records must be explicitly corrected before being treated as valid completed sale records.

## eBay-specific operational boundary

GearCashOut records the internal shipping method, carrier, tracking number and label/order reference. It does not claim to generate an eBay postage label itself. eBay Seller Hub remains the external order/label system.

## Failure checkpoints

1. MARK SOLD accepts £0 → inspect `sales-sold-validation.js` and `staff_mark_resale_listing_sold(...)`.
2. Sale finalizes without shipping method → inspect `staff_finalize_resale_sale(...)`.
3. Sale is Sold but no fulfilment exists → inspect the atomic RPC and `sales_fulfillments` row.
4. Tracking cannot be recorded → inspect `staff_create_sales_fulfillment(...)` and staff RLS.
5. Label/Tracking saves but status remains Awaiting Shipping → inspect the RPC's `Label Created` condition.
6. Collected does not produce Sold - Shipped → inspect `staff_update_sales_fulfillment(...)` before changing UI code.
7. Delivered/return window is wrong → inspect the post-sale status migration and `return_window_ends_at`.

## Verification status

- Database repair applied.
- GitHub repair committed.
- Browser/live verification pending.
- Current DJI test record remains intentionally invalid at £0 until the real eBay sale price is entered.
