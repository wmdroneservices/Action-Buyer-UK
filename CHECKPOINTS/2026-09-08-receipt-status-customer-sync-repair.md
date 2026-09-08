# Checkpoint — 2026-09-08 Receipt Status Synchronisation Repair

## Fault
A customer purchase could remain shown as **PARCEL ON ITS WAY** on the customer dashboard after staff reported it as received.

## First failure identified
The live database record for the test sale `GCO-20260908220350-989e5a` still showed:

- `sales.status = shipping`
- inbound `shipments.status = in_transit`

So the customer page was not merely displaying stale wording: the authoritative receipt state had not been persisted.

## Root cause
The staff page had two competing receipt implementations:

1. legacy `admin-sales.js` invoked the `mark-item-received` Edge Function;
2. `admin-sales-receipt-sync.js` attempted to intercept the same click and invoke `staff_mark_item_received_and_sync_inventory`.

The layered interception was unnecessary and made the receipt path fragile.

## Repair
- `admin-sales.js` now directly owns the receipt action and calls the secured RPC.
- Customer notification remains a separate post-success step.
- Customer account renderers now prioritise `sales.status` after receipt over historical shipment state.
- Cache-busting versions were updated on both staff and customer pages.

## Required verification
1. Press ITEM RECEIVED once.
2. Confirm staff page changes from receipt button to ITEM RECEIVED.
3. Confirm Supabase sale status becomes `received`.
4. Confirm inbound shipment becomes `delivered`.
5. Refresh customer account and confirm ITEM RECEIVED.
6. Move into inspection and confirm customer sees UNDER INSPECTION.
