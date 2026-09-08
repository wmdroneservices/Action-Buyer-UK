# Duplicate Inspection Task Deduplication — 8 September 2026

## Reported symptom

The Purchasing Dashboard showed two current actions for the same received DJI Osmo Action 6 test item:

- Purchasing: **Inspect received item**
- Inventory: **Inspect item**

This looked like two valuations/workflow records.

## Database audit

The live database contained:

- one active valuation;
- one matching valuation for the test quote reference;
- one sale;
- one inventory asset linked to that sale.

Therefore the duplication was **not database duplication**.

## First failure

`live-task-board.js` independently generated:

1. a Purchasing task from `sales.status in ('received','inspection')`;
2. an Inventory task from `inventory_assets.status='Received'`.

The existing generic duplicate key could not merge them because the tasks had different categories, titles, references and URLs.

## Repair

The task board now loads `inventory_assets.source_sale_id` and builds the set of sales already represented by an active linked inventory inspection.

When such an asset exists:

- the sale-side inspection task is suppressed;
- the Inventory Product Workbench task remains as the single actionable inspection;
- no valuation, sale or inventory data is deleted.

## Regression rule

Always distinguish:

**duplicate database records** from **duplicate dashboard actions**.

For receipt/inspection, one physical item must produce one actionable inspection task.

## Verification

Static verification confirmed:

- task board loads `source_sale_id`;
- linked sales suppress the duplicate sale task;
- the Inventory inspection task remains;
- the Purchasing page cache version was refreshed.

Relevant files:

- `live-task-board.js`
- `admin.html`
- `admin-purchasing.html`
- `admin-sales-dashboard.html`
