# Change Note — Purchasing Live Task Shipping Label Detection

**Date:** 10 September 2026
**Area:** Purchasing Dashboard / Live Tasks
**Status:** Implemented; browser verification pending

## Observed failure

The Purchasing Dashboard displayed:

> NO LIVE TASKS CURRENTLY REQUIRE STAFF ACTION

while the active purchase had a linked inbound shipment with `status = awaiting_label`.

## Current live state inspected

Sale:

- Reference: `GCO-20260910172353-18ec14`
- `sales.status = collecting_items`
- `archived_at = null`

Inbound shipment:

- `shipment_type = inbound`
- `status = awaiting_label`
- no delivery recorded

The database state correctly represented an outstanding customer shipping-label action.

## First failure

The separate Purchasing pipeline counter already recognised `awaiting_label` and `label_required` as **Shipping label required**.

The failure was in `live-task-board.js`.

Its shipping task condition only created **Create and send inbound shipping label** when the sale was in a shipping-stage state and **no inbound shipment existed**. The existence of the `awaiting_label` shipment therefore suppressed the task instead of confirming that the task was still required.

## Repair

`live-task-board.js` now explicitly creates the existing Purchasing task when the latest inbound shipment status is:

- `awaiting_label`
- `label_required`

Terminal sale states remain excluded.

The task continues to open the existing `admin-sale.html?id=<sale_id>` shipping workflow. No database data was altered.

## Verification

A live SQL check against the current transaction evaluates the repaired condition as:

`should_show_shipping_task = true`

GitHub commit:

`458a8938f0a6d5b4f40784ceb625219046eb23ef`

## Browser test still required

Hard-refresh the Purchasing Dashboard so the updated `live-task-board.js` is loaded. Confirm:

1. **What Needs Doing** no longer says the workflow is clear.
2. The task **Create and send inbound shipping label** appears.
3. Opening the task reaches the correct sale.
4. The existing shipping-label workflow is unchanged.
5. After the label is created, the task disappears and the appropriate next shipping state appears.
