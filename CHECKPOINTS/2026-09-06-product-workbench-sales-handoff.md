# Product Workbench — Sales Handoff Mode

**Date:** 6 September 2026

## Decision

Once an inventory asset is handed to Sales, the Product Workbench must no longer behave as though inspection/testing still needs to be completed.

Inspection facts remain available as the historical receiving and technical record. Sales presentation remains editable.

## Implemented

- Added `inventory-sales-handoff.js`.
- Loaded it after `inventory-workbench.js` from `inventory-detail.html`.
- Handoff mode applies to:
  - `Sent to Sales`
  - `Listed`
  - `Reserved`
  - `Sold`
- Added an explicit **INSPECTION COMPLETE · SENT TO SALES** state.
- Preserved inspection/testing summary instead of reopening the active workflow.
- Added editable catalogue content using existing `catalog_sales_content`:
  - product/manufacturer description;
  - catalogue hero image URL;
  - manufacturer image URL;
  - source attribution.
- Added editable physical-item content using existing `inventory_sales_content`:
  - condition description;
  - listing notes;
  - individual-item hero image.
- Kept customer supplied photographs separate as original evidence.
- Added staff-photo management in handoff mode:
  - upload;
  - remove;
  - select as individual-item hero.
- Added direct handoff to the existing Sales Workbench.

## Verified live state before change

- DJI Neo / TEST-ASSET-006 was live in `Sent to Sales`.
- It is linked to catalogue product `96961e1-eaac-4dee-b0de-8887ca3191bf`.
- Both `catalog_sales_content` and `inventory_sales_content` existed live but had no content rows.
- Both tables already have active-staff RLS policies allowing staff CRUD.
- No new description/image table was created.

## Important separation

`catalog_sales_content` is reusable product/catalogue content.

`inventory_sales_content` is presentation for the actual physical item.

Customer supplied photos remain evidence and must not be silently presented as staff resale photography.

## Known limitation

The **EDIT INSPECTION REPORT** control currently gives a controlled correction handoff rather than reopening the old active inspection workflow inside Sales handoff mode. The next refinement can provide a dedicated correction form that edits historical inspection fields without re-running workflow transitions.

## Verification

- JavaScript syntax checked successfully with `new Function(...)`.
- `inventory-detail.html` confirmed to load the handoff script.
- Current non-handoff Product Workbench remains untouched for inventory/repair/testing states.

