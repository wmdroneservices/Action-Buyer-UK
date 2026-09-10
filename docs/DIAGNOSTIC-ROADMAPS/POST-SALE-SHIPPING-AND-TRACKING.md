# Developer Diagnostic Roadmap — Post-Sale Shipping & Tracking

**Status:** Added 10 September 2026 after live testing of the eBay sold workflow.

## User action

Staff mark a live marketplace listing as sold, then record the shipping method/service, carrier, tracking number and label/order URL before the item is collected.

## First verified failure — 10 September 2026

Test SKU `GCO-2026-100023` (DJI Osmo Action 6) was marked sold on eBay with no actual sold price entered. The browser converted the empty prompt to numeric zero and the previous sold RPC accepted `0`. The asset therefore became `Sold - Awaiting Shipping` with `sold_price = 0`.

The second failure was that the existing post-sale data model already contained `sales_fulfillments`, carrier, tracking and label URL fields, but there was no direct staff-facing fulfilment page connected to the **Arrange shipping** task for this retail-marketplace sale.

## Corrected design

`Published / Reserved listing`
→ `MARK SOLD`
→ **positive actual sold price required**
→ other active listings become `Delist Required`
→ winning listing becomes `Sold`
→ physical asset becomes `Sold - Awaiting Shipping`
→ **Shipping & Tracking page**
→ shipping method/service recorded
→ carrier and tracking recorded when issued
→ label/order URL optionally recorded
→ `Label Created`
→ `Ready for Collection`
→ `Collected`
→ asset becomes `Sold - Shipped`
→ `Delivered`
→ post-sale return window

## Front-end entry points

- `listing-readiness.html` / `sales-workbench.js` — marketplace sale recording.
- `sales-stock-workflow.html` / `sales-stock-workflow.js` — live stock view and direct **ARRANGE SHIPPING** action for `Sold - Awaiting Shipping`.
- `sales-fulfilment.html` / `sales-fulfilment.js` — shipping method, carrier, tracking and label/order URL record.
- `admin-sales-dashboard.html` / `live-task-board.js` — shared task source for `Arrange shipping`.
- `asset-state-machine.js` — authoritative status/action vocabulary.

## Supabase

### Tables

- `inventory_assets` — physical item and sold truth.
- `resale_listings` — per-channel sold truth.
- `sales_fulfillments` — post-sale shipping and tracking record.

### RPCs

- `staff_mark_resale_listing_sold(...)` — now rejects null/zero/negative sold prices.
- `staff_correct_sold_price(...)` — staff-only correction for an already-sold listing whose sold price was recorded incorrectly.
- `staff_create_sales_fulfillment(...)` — records/updates shipping method, carrier, tracking and label URL.
- `staff_update_sales_fulfillment(...)` — controls collection and delivery transitions.

## Shipping fields

`sales_fulfillments` now includes:

- `shipping_method` — the actual service/method, separately from the carrier;
- `carrier` — shipping carrier/provider;
- `tracking_number` — tracking identifier;
- `label_url` — optional label/order/download URL;
- `label_created_at` — recorded when a label/tracking reference is supplied.

## eBay-specific rule

eBay may provide or manage the shipping label. GearCashOut must still retain an internal post-sale fulfilment record against the physical SKU. The current implementation records the eBay shipping method, carrier, tracking and optional label/order URL; it does **not** claim to generate an eBay label through an API.

Current eBay documentation confirms that sellers can use eBay shipping labels or ship outside eBay, and that shipment tracking is tied to the order. eBay's Fulfillment API can create shipping fulfillments when an integration is authorised, but that integration is not currently part of GearCashOut. This distinction must remain explicit until an eBay integration is deliberately implemented.

## Failure checkpoints

1. **Sold with no price:** inspect browser sold-price validation and `staff_mark_resale_listing_sold(...)`.
2. **Sold price shows £0:** inspect `inventory_assets.sold_price` and `resale_listings.sold_price`; correct through `staff_correct_sold_price(...)` rather than direct table editing.
3. **Arrange shipping has nowhere to go:** inspect `sales-stock-workflow.js` and `sales-fulfilment.html`.
4. **Shipping method missing:** inspect `sales_fulfillments.shipping_method` and `staff_create_sales_fulfillment(...)`.
5. **Tracking saved without carrier:** the fulfilment RPC must reject that combination.
6. **Item moves to shipped too early:** `staff_update_sales_fulfillment(..., 'collected')` is the authoritative transition to `Sold - Shipped`.
7. **Delivery recorded before collection:** `staff_update_sales_fulfillment(..., 'delivered')` must reject it.

## Verification target

For the current test item `GCO-2026-100023`:

1. enter the actual eBay sold price on **Shipping & Tracking**;
2. enter the eBay shipping method/service;
3. enter carrier and tracking when available;
4. optionally record the eBay label/order URL;
5. verify the fulfilment shows `Label Created` when tracking/label is recorded;
6. verify collection moves the asset to `Sold - Shipped`;
7. verify delivery starts the post-sale return window.

## Previous failed approach

A previous browser-side `sales-sold-validation.js` overlay referenced RPC names that are not part of the authoritative live database (`staff_finalize_resale_sale` and `staff_correct_resale_sale_price`) and used the older fulfilment parameter shape. It has been removed from the Live Stock page. The authoritative repair is now enforced at the database RPC boundary, with a dedicated fulfilment page using the live RPCs.
