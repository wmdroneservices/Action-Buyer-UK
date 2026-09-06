# Checkpoint — Post-Sale Status Reconciliation

**Date:** 6 September 2026

## Incident

TEST-ASSET-007 had:

- linked `sales_fulfillments.status = Collected`;
- linked `inventory_assets.status = Sold`.

This was inconsistent with the required lifecycle because a collected parcel must place the asset in **Sold - Shipped**.

## Investigation

- Current GitHub post-sale roadmap and checkpoint inspected.
- Current live Supabase asset and fulfilment rows inspected.
- Current live `staff_update_sales_fulfillment(uuid,text)` definition inspected.
- The live function already contains the required update from collection to `Sold - Shipped`.
- No duplicate RPC signature was found.
- Relevant table triggers were inspected.
- The original partial-state cause could not be proven from the current live system.

## Repair

The existing asset was reconciled only after confirming the fulfilment had genuinely been collected:

`TEST-ASSET-007 → Sold - Shipped`

The fulfilment remains **Collected**. No sold listing, transaction history or fulfilment history was deleted or rewritten.

## Current state

- Asset: **Sold - Shipped**
- Fulfilment: **Collected**
- Next legitimate action: **Mark Delivered**

## Future diagnostic rule

Do not overwrite the current fulfilment RPC based on this single historical mismatch. If the mismatch recurs:

1. capture the browser RPC/network result;
2. inspect the exact live RPC definition;
3. inspect fulfilment and asset rows immediately after the action;
4. inspect triggers and transaction timing;
5. only then introduce a structural invariant repair.

Relevant roadmap:

`docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`
