# Premature Sales Handoff Gate Repair — 8 September 2026

## Incident

A received test item completed inspection/testing and reached **Ready for Resale**. Staff could then use **SEND TO SALES** even though the linked customer purchase was still:

- `sales.status = 'inspection'`
- `sales.payment_status = 'awaiting_final_quote'`

This allowed an item to enter the resale stream before the seller transaction was finalised.

## First actual failure

The live authoritative RPC `staff_send_inventory_to_sales(p_asset_id)` checked only:

1. asset status = `Ready for Resale`;
2. inspection outcome;
3. repair exception;
4. technical testing;
5. missing-item resolution;
6. staff condition.

It did **not** inspect the linked `sales` record.

The front-end also treated `Ready for Resale` as sufficient to show the button.

## Repair

### Server-side authority

The Sales handoff RPC now locks and checks the linked customer purchase when `inventory_assets.source_sale_id` exists.

The item cannot enter Sales unless:

- `sales.status = 'completed'`; and
- `sales.payment_status = 'paid'`.

Assets without a source customer sale retain the existing manual/legacy path.

### UI

`inventory-detail-enhancements.js` now reads the linked sale and does not present **SEND TO SALES** until the same finalisation rule is satisfied.

The RPC remains authoritative so the rule cannot be bypassed by a stale page or direct RPC call.

## Existing invalid test state

The current Osmo Action 6 asset had already been moved prematurely to `Sent to Sales`, but had no channel listings. It was safely returned to `Ready for Resale` with an audit reason. The linked customer purchase remains in its purchasing workflow.

## Required sequence

Customer accepted initial offer
→ item received
→ Purchasing inspection/testing/repair if needed
→ final offer
→ customer accepts final offer
→ bank details confirmed
→ payment sent / purchase marked paid and completed
→ asset may pass **SEND TO SALES**
→ listing workflow.

## Regression rule

**Ready for Resale means physically ready, not commercially owned for resale.**

For customer-sourced inventory, both boundaries must be true:

- physical readiness is complete;
- customer purchase is finalised and paid.

Do not remove the server-side purchase-finalisation gate when changing Sales or inspection UI.
