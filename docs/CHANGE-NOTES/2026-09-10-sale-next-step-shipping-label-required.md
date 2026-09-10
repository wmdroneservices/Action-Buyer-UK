# Change Note — Sale next-step must require shipping label before monitoring

**Date:** 10 September 2026
**Area:** Purchasing → accepted sale → inbound shipping
**Status:** Code repair committed; live browser verification pending

## Observed behaviour

The Purchasing Dashboard correctly showed:

**Create and send inbound shipping label**

for the live test sale `GCO-20260910173236-1003bd`.

Opening that task routed to `admin-sale.html`, but the persistent sale next-step panel incorrectly displayed:

> Monitor the inbound shipment. When the item is delivered, start the inspection.

That wording is premature because the live inbound shipment is still `awaiting_label`.

## Live state checked

Supabase currently shows:

- sale status: `collecting_items`;
- inbound shipment status: `awaiting_label`;
- `label_count = 1` is only the default/count field;
- `label_urls = []`;
- `qr_code_urls = []`;
- no tracking number;
- no shipment/delivery timestamps.

The label therefore has not been created/sent in the system's authoritative sense.

## First actual failure

The first failure is the sale-page presentation layer in `admin-sale-next-step.js`.

Its shipping branch uses only the sale status:

`shipping / collecting_items / ready_for_shipping`

and immediately renders the generic **Monitor the inbound shipment** message. It does not inspect the latest inbound shipment status before deciding whether the label has been created.

## Repair

A small `admin-sale-shipping-next-step-fix.js` overlay was added and loaded after `admin-sale-next-step.js`.

It checks the live sale and latest inbound shipment. When the shipment is `awaiting_label` or `label_required` and there is no label URL/QR or posted/delivered timestamp, it replaces the next-step panel with:

- **Create and send the customer → GearCashOut shipping label**;
- **SHIPPING LABEL REQUIRED**;
- **Create and send shipping label**;
- explicit instruction not to move to monitoring until the label has been sent;
- a link to the existing **Sales & Shipping** workflow.

When the shipment is `label_created`, `in_transit` or `delivered`, or has recorded label/posted/delivery evidence, the overlay does nothing and the existing next-step workflow remains authoritative.

No Supabase schema, RPC, RLS policy or business data was changed.

## Files

- `admin-sale-shipping-next-step-fix.js` — new corrective overlay.
- `admin-sale.html` — loads the corrective overlay with cache-busting version `20260910-shipping-label-required-1`.
- Existing `admin-sale-next-step.js` remains unchanged.
- Existing shipping creation/sending workflow remains unchanged.

## Commits

- `0cba2b720b63dbd637b7b952d9f6fbb00f3e834c` — add sale shipping next-step correction.
- `6d3180a665f11e5ebeb127f0af6a0e4e0e07756e` — load correction on sale page.

## Required browser verification

Hard-refresh the current sale page and confirm that `GCO-20260910173236-1003bd` now shows **Create and send shipping label**, not **Monitor the inbound shipment**.

After the label is actually created/sent and the shipment becomes `label_created`, return to the sale page and confirm the panel changes to the monitoring/receipt stage.

Then continue the purchase → receipt → inspection → testing/repair → Ready for Resale → Sales handoff test.
