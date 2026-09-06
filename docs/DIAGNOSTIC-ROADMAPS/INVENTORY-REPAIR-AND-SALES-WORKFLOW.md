# Developer Diagnostic Roadmap — Inventory Repair, Testing and Sales Handoff

**Status:** Audited from current GitHub and live Supabase on 6 September 2026.

## User action

Staff open an inventory item in the Product Workbench and record a completed repair.

## Front-end entry point

- Page: `inventory-detail.html`
- Controller: `inventory-workbench.js`
- Repair form: `#repair-form`
- Sales handoff: `#send-sales`

## Relevant backend objects

### Tables

- `inventory_assets`
- `inventory_repairs`
- `inventory_testing`
- `inventory_expenses`
- `inventory_evidence`
- `staff_users`

### RPCs

- `staff_complete_inventory_repair(...)`
- `staff_send_inventory_to_sales(...)`

## Expected repair data flow

Staff completes repair form
→ browser checks authenticated session and staff access
→ optional repair evidence uploads to `quote-photos` storage
→ `staff_complete_inventory_repair(...)`
→ active staff validation
→ asset row locked with `FOR UPDATE`
→ asset status must be `Repair Required`
→ optional Repair expense inserted
→ repair history inserted
→ explicit `inventory_testing` row inserted with `stage='testing'` and `result='Passed'`
→ asset status set to `Ready for Resale`
→ Product Workbench reloads
→ existing Sales completion gate determines whether SEND TO SALES is enabled.

## Status transition

Current required transition:

`Repair Required → Record repair + mark tested → Ready for Resale`

The item does not automatically become `Sent to Sales`.

## Failure checkpoints

1. **No repair panel:** inspect current `inventory_assets.status` and `inventory-workbench.js`.
2. **RPC access error:** verify authenticated session and active `staff_users` row.
3. **“Asset must currently be Repair Required”:** inspect the live asset status before changing code.
4. **Repair cost failure:** inspect `inventory_expenses_category_check`; `Repair` must remain allowed.
5. **Repair succeeds but item not Ready for Resale:** inspect the live RPC definition and latest `inventory_testing` row.
6. **SEND TO SALES still disabled:** inspect condition, package/missing-item completion and latest testing row; Ready for Resale alone does not bypass the Sales completion gate.

## Known history

- Earlier repair workflow moved repaired stock to `Testing` and required staff to repeat testing.
- User decision on 6 September 2026: repair and post-repair testing are one step.
- Current implementation records the repair and creates an explicit passing testing record rather than using an untracked bypass.
- Repair costs continue to flow through `inventory_expenses` into Profit & Loss.

## Security

- No service-role credentials are exposed in browser code.
- The repair RPC remains `SECURITY DEFINER` with an explicit active-staff check.
- Public execute is revoked; authenticated execute remains required for staff workflow.
- The asset row is locked during the transaction.
- The RPC refuses non-Repair Required assets.
- Negative repair costs and invalid evidence payloads are rejected.

## Verification

- Current GitHub controller inspected.
- Live Supabase function inspected after migration.
- Live migration applied successfully.
- Existing TEST-ASSET-003 had already completed the previous path and is now Sent to Sales.
- Next fresh Repair Required browser test should verify the new direct transition.


## Inspection outcome → Repair Required routing — 6 September 2026

### User decision

The Product Workbench must not leave a repairable item labelled only **Requires Attention**.

The inspection outcome is now shown as **Requires Repair**.

### Required flow

`Inspection Required → Requires Repair → Repair Required → Complete Repair & Mark Tested → Ready for Resale`

When staff save an inspection with **Requires Repair**:

1. the inspection record is retained as the authoritative inspection outcome;
2. the workflow records the technical stage as requiring attention rather than a false pass;
3. the asset transitions through the central browser state machine into `Repair Required`;
4. the staff member receives the explicit notification:

   **Inspection complete: REQUIRES REPAIR. The item has been moved to Repair Required.**

5. the Product Workbench reloads into the red Repair Required panel with the recorded fault/details visible.

### Legacy compatibility

Existing `Requires Attention` inspection records are treated as equivalent to **Requires Repair** when the Product Workbench reloads or the record is resaved.

### First verified failure

TEST-ASSET-006 / DJI Neo saved an inspection result of `Requires Attention` and a technical row, but remained in `Inspection Required`.

The first failure was the front-end transition branch: only `Failed` inspections were routed to `Repair Required`. `Requires Attention` had no repair-routing branch.
### Sales handoff after repair-required inspection

A repair-required inspection is still a completed inspection. The Sales RPC may accept the latest inspection result `Requires Repair`, legacy `Requires Attention`, or `Failed` only when a completed `inventory_repairs` record exists for the asset. This does **not** bypass technical testing, condition, missing-item or status gates.

Repository migration: `supabase/migrations/20260906214500_allow_repaired_inspection_to_pass_sales_gate.sql`.