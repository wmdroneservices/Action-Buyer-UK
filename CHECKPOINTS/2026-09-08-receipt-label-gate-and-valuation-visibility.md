# Checkpoint — 8 September 2026: Receipt Label Gate and Valuation Visibility

## Faults addressed

1. **ITEM RECEIVED** was visible before a customer → GearCashOut shipping label had been created.
2. The authoritative receipt RPC could also be called from `collecting_items` / `ready_for_shipping` without verifying that any inbound label existed.
3. The customer account hid the original valuation once a linked sale existed, producing **No valuations currently in progress** even while the purchase was still active.

## First actual failure

The live function `staff_mark_item_received_and_sync_inventory(uuid)` allowed receipt from `collecting_items`, `ready_for_shipping` and `shipping`, then marked inbound shipments delivered without first requiring a valid label/QR record.

The browser used a separate broad `canReceive` status check, so the same business boundary was missing in both layers.

## Repair

### Database authority

The receipt RPC now requires an inbound shipment with:

- `shipment_type='inbound'`;
- status `label_created` or `in_transit`;
- `label_count > 0`;
- at least one `label_urls` or `qr_code_urls` entry.

### Staff UI

`admin-sales.js` now hides **ITEM RECEIVED** until the same inbound-label condition is true.

`admin-purchasing.html` cache version was updated.

### Customer UI

`account-page.js` now keeps a linked valuation visible as **in progress** while its sale remains active and displays:

- **1 valuation is currently in progress** for the current single active case;
- original valuation reference/product;
- the separate live valuation/purchase update.

`account.html` cache version was updated.

## Live state at repair

- one valuation: `WBA-2026-880356`;
- one item: DJI Osmo Action 6;
- one linked sale: `GCO-20260908222632-7777e2`;
- sale status: `inspection`;
- inbound shipment: `delivered`.

No duplicate valuation was found.

## Regression rules

- Never show or permit receipt before shipping-label evidence exists.
- The database RPC is authoritative; a hidden button alone is not a sufficient control.
- Keep active customer valuations visible while purchasing is still active.
- Do not reintroduce competing receipt click handlers.
