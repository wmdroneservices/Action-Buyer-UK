# Developer Diagnostic Roadmap — Purchasing Shipping Label Next Step

**Status:** Added 10 September 2026 during live purchase-flow testing.

## User action

Staff open **What Needs Doing** on the Purchasing Dashboard and select **Create and send inbound shipping label** for an accepted customer purchase.

## Front-end entry points

`admin-purchasing.html`
→ `live-task-board.js`
→ `admin-sale.html?id=<sale_id>`
→ `admin-sale-next-step.js`
→ `admin-sale-shipping-next-step-fix.js`

## Relevant Supabase data

### Tables

- `sales`
- `shipments`

### Inbound shipment states

- `awaiting_label` / `label_required` → staff must create/send the customer label.
- `label_created` → label has been recorded; customer can use it.
- `in_transit` → customer has posted the item.
- `delivered` → item can proceed to receipt/inspection.

A label is considered ready by the sale-page correction only when the shipment has a ready state or recorded label URL/QR evidence. A default `label_count` value alone is not proof that a label exists.

## Expected data flow

Accepted purchase
→ `sales.status='collecting_items'`
→ inbound `shipments` row exists
→ shipment `awaiting_label` / `label_required`
→ Purchasing live task: **Create and send inbound shipping label**
→ sale page must say **Create and send shipping label**
→ staff uses the existing Sales & Shipping workflow
→ label/QR details are recorded and customer instructions are sent
→ shipment becomes `label_created`
→ sale page may then say **Monitor the inbound shipment**
→ customer posts item
→ shipment `in_transit`
→ delivery
→ receipt/inspection workflow.

## First failure found — 10 September 2026

The Purchasing Dashboard task itself was repaired earlier because `live-task-board.js` treated an existing `awaiting_label` shipment as a reason not to create the task.

During browser testing, the next failure appeared after opening that task. `admin-sale-next-step.js` used the sale status alone and rendered **Monitor the inbound shipment** for `collecting_items`, without checking whether the inbound label had actually been created.

Live Supabase for test sale `GCO-20260910173236-1003bd` confirmed:

- `sales.status = collecting_items`;
- latest inbound `shipments.status = awaiting_label`;
- `label_urls = []`;
- `qr_code_urls = []`;
- no tracking number;
- no shipped/delivered timestamp.

Therefore the first actual failure was the **sale-page next-step presentation condition**.

## Repair

Added `admin-sale-shipping-next-step-fix.js` after the existing next-step controller.

The overlay is deliberately narrow:

- only shipping-stage sales are considered;
- only the latest inbound shipment is checked;
- `awaiting_label` / `label_required` without label evidence changes the panel to the create/send instruction;
- `label_created`, `in_transit`, `delivered`, label URLs, QR URLs, shipped timestamps or delivered timestamps leave the existing workflow untouched.

The repair does not change shipment status, create duplicate shipments, modify the database schema, bypass RLS or replace the existing label-creation workflow.

## Security / backend boundary

The `shipments` table has a staff management policy for staff accounts. Customers have a narrower update policy that permits posting an existing inbound `label_created` shipment into `in_transit` with `shipped_at` set. The sale-page correction performs only authenticated reads and presentation changes.

Existing shipment normalisation trigger:

`trg_normalise_inbound_label_state`
→ `normalise_inbound_label_state()`.

## Verification sequence

1. Hard-refresh `admin-purchasing.html`.
2. Confirm **Create and send inbound shipping label** appears.
3. Open the task.
4. Confirm the sale page says **Create and send shipping label** while the shipment is `awaiting_label`.
5. Use the existing Sales & Shipping workflow to create/send the label.
6. Confirm the shipment becomes `label_created` and the sale page returns to monitoring/receipt wording.
7. Continue with customer posting, receipt, inspection, testing/repair, Ready for Resale and Sales handoff.
