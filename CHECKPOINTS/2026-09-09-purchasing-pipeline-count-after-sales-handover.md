# Purchasing Pipeline Count After Sales Handover — 9 September 2026

## Symptom

After a customer item was successfully sent to Sales, **ACTIVE PURCHASES** correctly became empty, but the Purchasing Dashboard still showed **1 completed purchase** in the Purchase Pipeline and **1 COMPLETED** in Payment & Completion.

## Investigation

Checked current project checkpoint and Inventory Repair and Sales Workflow Diagnostic Roadmap before changing code.

Live Supabase state:

- sale `GCO-20260909180802-7c68c7`: `status='completed'`, `payment_status='paid'`;
- asset `GCO-A04570F4BD`: `status='Sent to Sales'`;
- `sent_to_sales_at` populated.

The database handover was correct.

## First actual failure

The previous repair fixed the Active Purchases list in `admin-sales.js`, but `admin-purchasing.js` independently calculated pipeline counters from every unarchived sale.

It therefore counted the completed purchase without checking the linked `inventory_assets` handover state.

## Repair

`admin-purchasing.js` now:

1. loads linked `inventory_assets` rows by `source_sale_id`;
2. identifies sales with `status='Sent to Sales'` or `sent_to_sales_at`;
3. derives `purchasingSales` excluding those handovers;
4. uses `purchasingSales` for all Purchasing shipping, receipt, inspection, final-offer, payment and completed counts.

This preserves a completed purchase in Purchasing before handover, but removes it after the actual Sales handover.

## Verification

- Current live asset is `Sent to Sales` with `sent_to_sales_at` populated.
- Current live query classifies the linked sale as excluded from Purchasing counts.
- Current GitHub code contains the inventory handover query and filtered `purchasingSales` set.
- The Purchasing script cache version was refreshed in `admin-purchasing.html`.

## Documentation

Updated:

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`