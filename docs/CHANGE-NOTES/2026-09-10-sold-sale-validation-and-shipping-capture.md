# Change Note — Sold Sale Validation and Shipping Capture

**Date:** 10 September 2026  
**Area:** Sales / marketplace post-sale fulfilment  
**Status:** Superseded by the authoritative sold-price and post-sale fulfilment workflow documented in `docs/CHANGE-NOTES/2026-09-10-sold-price-and-shipping-workflow.md`.

## Historical record

This note records the earlier repair attempt for the DJI Osmo Action 6 test item (`GCO-2026-100023`). It is retained for audit history but its browser-side implementation is no longer current.

The original failure was:

- eBay listing marked `Sold`;
- website listing cancelled;
- inventory moved to `Sold - Awaiting Shipping`;
- sold price stored as `0` when the prompt was blank;
- no `sales_fulfillments` row existed.

## Superseded implementation

The earlier implementation introduced `sales-sold-validation.js` and referenced RPC names including `staff_finalize_resale_sale(...)` and `staff_correct_resale_sale_price(...)`.

That browser overlay was subsequently identified as non-authoritative and incompatible with the deployed database function signatures. It has been removed from the repository and must not be restored.

## Current authoritative implementation

Use:

- `inventory-sales-channels.js` for the Product Workbench MARK SOLD action and editable Sold price control;
- `staff_mark_resale_listing_sold(...)` for the database-enforced positive sold-price guard;
- `staff_correct_sold_price(...)` for correcting an already Sold listing;
- `sales-stock-workflow.js` for the shipping action;
- `sales-fulfilment.html` / `sales-fulfilment.js` for shipping method, carrier, tracking and label/order URL;
- `staff_create_sales_fulfillment(...)` for the post-sale fulfilment record.

See `docs/DIAGNOSTIC-ROADMAPS/POST-SALE-SHIPPING-AND-TRACKING.md` and the current sold-price/shipping change note for the live workflow.

## Verification

The database and current GitHub implementation have been inspected. Browser verification remains required for the final post-sale flow.
