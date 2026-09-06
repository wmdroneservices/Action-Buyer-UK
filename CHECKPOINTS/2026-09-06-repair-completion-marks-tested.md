# Product Workbench — Repair Completion Marks Tested

**Date:** 6 September 2026

## User decision

Repair and post-repair testing are now one controlled workflow step.

When an authorised active staff member records a completed repair:

1. the repair history record is created;
2. any repair cost is written to `inventory_expenses` as `Repair`;
3. an explicit `inventory_testing` record is created with stage `testing` and result `Passed`;
4. the inventory asset moves directly from `Repair Required` to `Ready for Resale`.

The item is **not** automatically sent to Sales. The existing Sales completion gate remains in place for package, condition and other required information.

## Backend

Live Supabase migration:

`repair_completion_marks_tested_ready_for_resale`

Repository migration:

`supabase/migrations/20260906223000_repair_completion_marks_tested_ready_for_resale.sql`

The secure RPC remains:

`staff_complete_inventory_repair(...)`

Security is preserved:

- active staff account required;
- asset row locked with `FOR UPDATE`;
- asset must currently be `Repair Required`;
- repair fault and work descriptions remain mandatory;
- negative costs remain rejected;
- repair evidence must remain a JSON array;
- no generic bypass or direct clear control was restored.

## Front end

`inventory-workbench.js` now shows:

- **COMPLETE REPAIR & MARK TESTED**
- progress text explaining that repair completion also marks the post-repair test as passed;
- success text confirming **Ready for Resale**.

## Previous workflow superseded

Old:

`Repair Required → Record repair → Testing → save post-repair tests → Ready for Resale`

Current:

`Repair Required → Record repair + controlled post-repair test pass → Ready for Resale → Send to Sales`

## Verification status

- Live database migration: applied successfully.
- Live function definition: verified after migration.
- Existing test asset `TEST-ASSET-003` had already completed the old workflow and is now `Sent to Sales`, so the new direct path requires the next fresh Repair Required test to be verified in the browser.
