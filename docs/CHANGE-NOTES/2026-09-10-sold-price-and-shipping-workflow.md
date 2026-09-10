# Change Note — Sold Price Validation and Post-Sale Shipping

**Date:** 10 September 2026

## Trigger

Live testing of an eBay sale exposed two workflow gaps:

1. the sold workflow allowed an empty eBay sold price to become numeric zero;
2. the item became `Sold - Awaiting Shipping` but there was no direct staff-facing screen to record the shipping method, carrier, tracking number and label/order URL.

## Investigation

The live DJI Osmo Action 6 test item `GCO-2026-100023` was verified in Supabase as:

- eBay listing: `Sold`;
- website listing: `Cancelled` after the duplicate-sale closure confirmation;
- inventory: `Sold - Awaiting Shipping`;
- sold channel: `eBay`;
- sold price: `0`;
- no `sales_fulfillments` record.

The existing post-sale schema already supported carrier, tracking and label URL, but `shipping_method` was not separately represented and the staff-facing workflow was incomplete.

## Repair

- `staff_mark_resale_listing_sold(...)` now rejects null, zero and negative sold prices at the database boundary.
- Added `staff_correct_sold_price(...)` for staff-controlled correction of an already-sold listing with a bad recorded price.
- Added `sales_fulfillments.shipping_method`.
- Updated `staff_create_sales_fulfillment(...)` to record shipping method separately from carrier and to reject tracking without a carrier.
- Added `sales-fulfilment.html` and `sales-fulfilment.js`.
- Updated `sales-stock-workflow.js` to show **ARRANGE SHIPPING** / **UPDATE SHIPPING / TRACKING** for `Sold - Awaiting Shipping` items.
- Removed the superseded `sales-sold-validation.js` overlay, which referenced non-authoritative RPC names and an outdated fulfilment signature.

## eBay boundary

eBay may provide and manage the shipping label. GearCashOut now records the operational shipping details internally. Actual eBay label generation/API integration is not claimed or introduced by this repair.

## Verification status

Database schema and RPC signatures verified live after migration. The existing DJI test record remains at sold price `0` deliberately until the actual eBay amount is entered through the new correction control; no guessed financial value was written.

## Relevant roadmap

`docs/DIAGNOSTIC-ROADMAPS/POST-SALE-SHIPPING-AND-TRACKING.md`
