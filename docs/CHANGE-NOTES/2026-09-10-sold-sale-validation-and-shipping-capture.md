# Change Note — Sold Sale Validation and Shipping Capture

**Date:** 10 September 2026  
**Area:** Sales / marketplace post-sale fulfilment  
**Affected test item:** DJI Osmo Action 6 — `GCO-2026-100023`

## First actual failure

Live Supabase inspection showed that the eBay sale had been recorded as:

- `resale_listings` eBay row: `Sold`;
- website row: `Cancelled` after the duplicate-sale closure step;
- `inventory_assets.status`: `Sold - Awaiting Shipping`;
- `inventory_assets.sold_channel`: `eBay`;
- `inventory_assets.sold_price`: `0`;
- no `sales_fulfillments` row existed.

The front end appeared to validate a sold price, but the old path converted an empty/non-numeric prompt result to zero and the database RPC explicitly allowed zero. The sale transition also did not create a fulfilment record.

## Repair

### Supabase

Migration `20260910143000_strict_resale_sale_and_shipping_capture`:

- `staff_mark_resale_listing_sold(...)` now requires a sold price greater than £0;
- selling fees and shipping cost cannot be negative;
- legacy invalid zero-value Sold records can be corrected with `staff_correct_resale_sale_price(...)`;
- valid existing Sold records are not silently overwritten.

Migration `20260910150000_atomic_resale_sale_fulfillment`:

- added `staff_finalize_resale_sale(...)`;
- the final sale transition now requires a shipping method/carrier;
- sale and initial `sales_fulfillments` record are created in one database transaction;
- tracking number and label URL are optional at the point of sale because eBay may issue them after the sale;
- existing `staff_create_sales_fulfillment(...)` remains the update path for later tracking/label details.

### Front end

`inventory-detail.html` now loads `sales-sold-validation.js`.

`sales-sold-validation.js`:

- intercepts the legacy MARK SOLD handler;
- requires an actual sold price greater than £0;
- requires shipping method/carrier before finalization;
- captures optional tracking number, label/order URL and notes;
- uses the atomic `staff_finalize_resale_sale(...)` RPC;
- adds a post-sale fulfilment editor for Sold / Sold - Awaiting Shipping records;
- provides a legacy correction path for an invalid zero-value Sold record.

`sales-stock-workflow.html` now loads the same control layer so staff can correct the current test record and maintain shipping details from the live stock/sales view.

## eBay workflow alignment

The system does not attempt to replace eBay's own label platform. eBay Seller Hub provides order management, postage-label printing and tracking upload. GearCashOut records the operational shipping method, tracking number and label/order reference so the internal sale remains auditable. eBay documentation confirms that sellers can obtain postage labels from Orders/Seller Hub and upload tracking with the carrier name. 

## Verification state

- Current GitHub code inspected before repair.
- Current Supabase tables and live RPC definitions inspected.
- Database migrations applied successfully.
- Project-memory checkpoint and event updated.
- Browser verification of the new controls remains pending.
- The DJI test record deliberately remains at sold price £0 until the real eBay sale price is entered; no price has been invented.

## Next test

1. Open the DJI Osmo Action 6 in Live Stock & Sales.
2. Correct the actual eBay sold price.
3. Enter the eBay shipping method/carrier.
4. Add tracking/label information when available.
5. Confirm fulfilment status becomes `Label Created` when tracking or label information is saved.
6. Test `Ready for Collection`, `Collected`, `Delivered` and the subsequent return-window behaviour.
