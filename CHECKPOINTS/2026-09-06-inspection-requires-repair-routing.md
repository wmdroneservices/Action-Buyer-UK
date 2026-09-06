# Product Workbench — Inspection Requires Repair Routing

**Date:** 6 September 2026

## Workstream

Sales / Inventory

## User decision

A repairable inspection outcome must be explicit and operational:

**Requires Repair → Repair Required**

The old user-facing wording **Requires Attention** was too vague for an item that must be repaired before resale.

## Root cause

TEST-ASSET-006 / DJI Neo saved:

- inspection result: `Requires Attention`;
- technical row: `Passed`;
- asset status: `Inspection Required`.

The first failure was in `inventory-workbench.js`: only `Failed` inspection results entered the `Repair Required` transition branch.

## Implemented behaviour

The inspection selector now shows **Requires Repair**.

Saving **Requires Repair**:

1. records the inspection outcome;
2. changes the technical stage to `Requires Attention` rather than leaving a false pass;
3. routes the asset through the central state machine into `Repair Required`;
4. shows:

   **Inspection complete: REQUIRES REPAIR. The item has been moved to Repair Required.**

5. reloads the Product Workbench into the existing repair panel.

Legacy `Requires Attention` is recognised as equivalent to **Requires Repair** when old records are reopened.

## Sales gate compatibility

A repair-required inspection remains a valid completed inspection after an authorised repair record exists. The Sales RPC now accepts `Requires Repair`, legacy `Requires Attention`, or `Failed` only when a completed `inventory_repairs` record exists; technical testing and all other Sales gates remain required.

## Downstream flow

`Repair Required → COMPLETE REPAIR & MARK TESTED → Ready for Resale → existing Sales completion gate`

## Verification required

Use TEST-ASSET-006 / DJI Neo:

1. refresh the Product Workbench to load cache version 20260906-5;
2. save the inspection as **Requires Repair**;
3. confirm the notification appears;
4. confirm asset status becomes `Repair Required`;
5. confirm the Sales Dashboard Repair Required count increases;
6. complete the repair and confirm the direct `Ready for Resale` transition still works;
7. confirm the repaired inspection outcome no longer blocks the Sales RPC once all other Sales gates are complete.