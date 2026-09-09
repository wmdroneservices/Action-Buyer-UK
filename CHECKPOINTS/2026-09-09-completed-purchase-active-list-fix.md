# Completed Purchase Still Showing in Active Purchasing — 9 September 2026

## Symptom

A product had:

- completed receipt and inspection;
- completed final offer and customer payment;
- successfully moved to Sales;
- asset status `Sent to Sales`.

Despite that, the linked purchase still appeared under **ACTIVE PURCHASES** with **NO ACTION REQUIRED**.

## Investigation order

Project history/checkpoints → Inventory Repair and Sales Workflow Diagnostic Roadmap → current GitHub controller → live Supabase asset and purchase state.

## Live state

Asset `GCO-AEAA94E839`:

- asset status: `Sent to Sales`;
- previous status: `Ready for Resale`;
- `sent_to_sales_at`: populated;
- linked purchase status: `completed`;
- linked payment status: `paid`.

The backend handoff was correct.

## First actual failure

`admin-purchasing.html` loads the shared `admin-sales.js` controller.

That controller previously treated every unarchived `sales` row as active. Therefore a completed purchasing transaction remained visible in **ACTIVE PURCHASES** simply because `archived_at` was null.

The Sales archive field is not the authority for whether a purchase is still active.

## Repair

`admin-sales.js` now detects when it is running on `admin-purchasing.html`.

For Purchasing:

- terminal statuses are `paid`, `completed`, `cancelled`;
- **ACTIVE PURCHASES** shows only non-terminal purchases;
- **PURCHASE ARCHIVE** shows terminal purchase history;
- terminal purchase history is not given Sales archive/restore/delete controls;
- Purchasing navigation remains on Purchasing URLs.

The Sales Dashboard retains its existing archive behaviour.

## Verification

- Current GitHub confirms the page-context branch.
- Current GitHub confirms terminal filtering for Purchasing.
- Current GitHub confirms Purchasing navigation URLs.
- Cache version on `admin-purchasing.html` was updated.
- Live Supabase confirms the affected asset was already correctly `Sent to Sales` and the purchase `completed / paid`.

## Documentation updated

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`
