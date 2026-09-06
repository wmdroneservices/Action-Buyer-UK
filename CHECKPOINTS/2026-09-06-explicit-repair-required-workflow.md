# Product Workbench — Explicit Repair Required Workflow

**Date:** 6 September 2026

## Implemented

- Added live `inventory_repairs` history table.
- Added secure `staff_complete_inventory_repair(...)` RPC.
- Added active-staff check and asset row lock.
- Added fault, repair description, provider, provider name, cost, date and evidence-path fields.
- Added optional linked `inventory_expenses` Repair cost entry.
- Added prominent Repair Required panel to the Product Workbench.
- Disabled normal inspection/testing save while repair is outstanding.
- Removed the previous automatic Repair Required escape.
- Repair completion moves the asset to `Testing`; passing post-repair tests are required for `Ready for Resale`.

## Workflow

`Inspection/Testing failure` → `Repair Required` → `Record repair` → `Testing` → `Post-repair tests pass` → `Ready for Resale` → `Send to Sales`.

## Security

No generic clear/bypass control exists. The RPC requires an active staff account and refuses any asset not currently in `Repair Required`.

## Known fix — repair cost category mismatch

During live testing, a £10 repair cost failed with `inventory_expenses_category_check` because the repair RPC wrote category `Repair` while the live database constraint did not permit it. The transaction rolled back, leaving no repair record.

Fixed by adding `Repair` to the live `inventory_expenses_category_check` constraint and by adding migration `20260906220000_add_repair_inventory_expense_category.sql`.

## Test required

Use TEST-ASSET-003 / GCO-2026-100012: open while Repair Required, confirm repair panel, record repair, confirm Testing, save passing post-repair tests, confirm Ready for Resale, then Send to Sales.

## Sales Dashboard visibility fix

Live testing showed that Repair Required stock was included inside the general Sales Pipeline Inventory total but had no dedicated pipeline category. The dashboard now shows **Repair Required** as its own red blocking card. General Inventory excludes Repair Required so the two counts do not overlap.

At the time of verification, live inventory contained 1 Repair Required item and 4 non-repair inventory items.
