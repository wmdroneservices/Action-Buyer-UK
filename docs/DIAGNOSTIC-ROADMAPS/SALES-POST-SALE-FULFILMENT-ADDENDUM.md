# Developer Diagnostic Roadmap Addendum — Sold Sale Validation and Shipping Capture

**Date:** 10 September 2026  
**Area:** Sales / marketplace post-sale fulfilment  
**Status:** Current roadmap corrected; obsolete browser validation overlay removed.

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
→ `staff_mark_resale_listing_sold(...)` accepts only a positive sold price
→ `inventory_assets = Sold - Awaiting Shipping`
→ staff opens the dedicated fulfilment page
→ shipping method is recorded; carrier is recorded when tracking is supplied
→ tracking / label/order URL can be added or amended
→ `sales_fulfillments = Label Created` when label/tracking information exists
→ Ready for Collection
→ Collected
→ `inventory_assets = Sold - Shipped`
→ Delivered
→ return window
→ Archive after return hold.

## Front-end path

### Sale finalization

- `inventory-detail.html`
- `inventory-sales-channels.js` — authoritative Product Workbench sales-channel UI and MARK SOLD action.

### Post-sale maintenance

- `sales-stock-workflow.html`
- `sales-stock-workflow.js` — live stock view and shipping action.
- `sales-fulfilment.html`
- `sales-fulfilment.js` — sold-price correction plus shipping method, carrier, tracking, label/order URL and notes.

The previous `sales-sold-validation.js` browser overlay has been removed. It referenced non-authoritative RPC names and an obsolete fulfilment signature and must not be restored.

## Supabase path

### Tables

- `inventory_assets`
- `resale_listings`
- `sales_fulfillments`

### RPCs

- `staff_mark_resale_listing_sold(p_listing_id,p_sold_price,p_selling_fees,p_shipping_cost)` — authoritative sold transition; requires a positive sold price.
- `staff_correct_sold_price(p_listing_id,p_sold_price)` — staff-only correction for an already Sold listing; updates the resale listing and inventory asset.
- `staff_create_sales_fulfillment(...)` — creates/updates the post-sale shipping record.
- `staff_update_sales_fulfillment(...)` — advances collection/delivery states where deployed.

## Validation rules

1. Sold price must be greater than £0.
2. Selling fees cannot be negative.
3. Shipping cost cannot be negative.
4. Shipping method is required before a fulfilment record is saved.
5. Tracking number requires a carrier.
6. Label/order URL may be recorded when available.
7. Existing valid Sold records cannot be silently overwritten by another MARK SOLD action.
8. Legacy zero-value Sold records must be explicitly corrected before being treated as valid completed sale records.

## eBay-specific operational boundary

GearCashOut records the internal shipping method, carrier, tracking number and label/order reference. It does not claim to generate an eBay postage label itself. eBay Seller Hub remains the external order/label system.

## Failure checkpoints

1. MARK SOLD accepts £0 → inspect `inventory-sales-channels.js` and `staff_mark_resale_listing_sold(...)`.
2. Sold price cannot be corrected → inspect `staff_correct_sold_price(...)` and the Product Workbench sold-price editor.
3. Shipping method cannot be recorded → inspect `sales-fulfilment.js` and `staff_create_sales_fulfillment(...)`.
4. Tracking cannot be recorded → inspect carrier/tracking validation and staff RLS.
5. Label/tracking saves but status remains Awaiting Shipping → inspect the fulfilment RPC's `Label Created` condition.
6. Collected does not produce Sold - Shipped → inspect `staff_update_sales_fulfillment(...)` before changing UI code.
7. Delivered/return window is wrong → inspect the post-sale status migration and `return_window_ends_at`.

## Verification status

- Database repair applied.
- GitHub repair committed.
- Obsolete browser validation overlay removed.
- Product Workbench now exposes an editable sold-price control for Sold listings.
- Browser/live verification remains required.
- Current DJI test record remains intentionally invalid at £0 until the real eBay sale price is entered.
