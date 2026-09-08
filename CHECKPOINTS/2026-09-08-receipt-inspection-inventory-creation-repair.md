# Receipt → Inspection Inventory Creation Repair — 8 September 2026

## Incident

After **CLEAR ALL OPERATIONAL DATA**, a fresh test item was marked physically received and the workflow moved into inspection, but the Product Workbench/inspection path could not load correctly.

## First actual failure

Live Supabase was checked before changing the inspection UI.

The fresh operational state contained:

- 1 valuation;
- 1 quote item;
- 1 sale;
- **0 inventory assets**.

The sale was already in status `inspection`.

The authoritative receipt RPC, `staff_mark_item_received_and_sync_inventory(...)`, only updated an existing inventory asset where:

- `source_sale_id` matched;
- `source_quote_item_id` matched;
- status was `Awaiting Receipt`.

After the operational reset there was no inventory asset to update.

Worse, the old function incremented its reported item count inside the loop even when the update affected zero rows, creating a false appearance of successful inventory synchronisation.

## Repair

Live migration:

`repair_mark_received_create_missing_inventory`

Repository migration:

`supabase/migrations/20260908223000_repair_received_inventory_creation.sql`

The receipt RPC now:

1. validates active staff access;
2. locks the sale;
3. reads each `sale_items` / `quote_items` row;
4. looks for the linked inventory asset;
5. creates the asset at `Received` when none exists;
6. preserves customer condition, package, serial and catalogue linkage;
7. otherwise moves an existing `Awaiting Receipt` asset to `Received`;
8. returns separate created/updated/total counts.

The current fresh DJI Osmo Action 6 test sale was also reconciled after verification because its receipt had already occurred before the repaired function was installed.

## Product Workbench hardening

`inventory-workbench.js` now has an explicit load error boundary and a 20-second visible timeout. A failed dependency can no longer leave the user indefinitely staring at the loading message.

## Do not repeat

Do not diagnose a post-receipt inspection page as an inspection-form problem until the linked `inventory_assets` row exists.

Required first check:

`sale → sale_items → inventory_assets`

The receipt workflow and inspection workflow must share the same physical inventory asset as the authoritative handoff.
