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

## Post-sale fulfilment and customer returns — 6 September 2026

### User action
Sold item → create/record shipping label → mark collected → mark delivered. If a buyer requests a return, open **Customer Return** from the Sold Item.

### Front-end
- `sold-items.html` + `sold-after-sales.js`
- `sales-customer-returns.html` → `sales-customer-returns.js`
- `staff-navigation.js`

### Supabase
- sold truth: `inventory_assets`, `resale_listings`, `staff_mark_resale_listing_sold`
- fulfilment: `sales_fulfillments`, `staff_create_sales_fulfillment`, `staff_update_sales_fulfillment`
- buyer returns: `sales_customer_returns`, `staff_open_sales_customer_return`, `staff_update_sales_customer_return`
- separate purchasing returns: `purchase_return_cases`

### Expected flow
`Sold → Label Created → Ready for Collection (optional) → Collected → Delivered`

`Buyer return → Requested → Approved → Label Created → Collected → Item Received → Returned asset for review → Resolved/Refused`

### Rules
- non-Sold assets cannot enter fulfilment;
- label before collection;
- collection before delivery;
- one open buyer return per asset;
- never merge buyer returns with Purchase Returns;
- preserve sold history when the returned item is received.

## Product Workbench — Sales handoff mode (6 September 2026)

### Trigger
`inventory_assets.status` is one of:

- `Sent to Sales`
- `Listed`
- `Reserved`
- `Sold`

### Front end
- Entry page: `inventory-detail.html`
- Existing workflow controller: `inventory-workbench.js`
- Post-handoff controller: `inventory-sales-handoff.js`

### Data flow
The normal inspection workflow is no longer presented as an active workflow after Sales handoff.

The handoff view loads:
- historical `inventory_testing` inspection/testing records;
- original customer photographs;
- staff `inventory_evidence` photographs;
- reusable catalogue content from `catalog_sales_content`;
- physical-item content from `inventory_sales_content`.

### Editing rules
- inspection history remains visible and is not restarted;
- factual inspection corrections remain controlled edits;
- customer supplied photographs remain separate evidence;
- staff photographs can be added, removed and selected as the individual-item hero;
- catalogue product description, catalogue hero, manufacturer image and attribution are editable;
- physical-item condition description, listing notes and hero image are editable.

### Failure checkpoints
1. Handoff page still shows active inspection workflow: verify the asset status and that `inventory-sales-handoff.js` is loaded after `inventory-workbench.js`.
2. Sales content will not save: verify active `staff_users` access and the existing ALL policies on both sales-content tables.
3. Catalogue content disabled: verify `inventory_assets.catalog_product_id`.
4. Hero selection fails: verify the selected `inventory_evidence.file_url` and storage access.
5. Customer photos must never be silently mixed with staff resale photographs.

### Expected rule
**Inspection facts are retained; sales presentation remains editable.**


## Post-sale shipping states and UK tax-year archive — 6 September 2026

### User decision

A completed marketplace sale is not the end of the operational workflow.

Required lifecycle:

`Listed / Reserved → Sold - Awaiting Shipping → Sold - Shipped → post-sale return hold → Archived`

### Front-end entry points

- `sold-items.html` → `sold-items.js` + `sold-after-sales.js`
- `sales-customer-returns.html` → buyer return workflow
- `sales-archive.html` → `sales-archive.js`
- Shared status presentation: `asset-state-machine.js`, `admin-sales-dashboard.js`, `live-task-board.js`

### Supabase objects

- `inventory_assets.status`
- `inventory_assets.return_window_ends_at`
- `inventory_assets.archived_at`
- `inventory_assets.archive_tax_year`
- `sales_fulfillments`
- `sales_customer_returns`
- `staff_mark_resale_listing_sold(...)`
- `staff_create_sales_fulfillment(...)`
- `staff_update_sales_fulfillment(...)`
- `staff_open_sales_customer_return(...)`
- `staff_archive_sales_asset(...)`

### Expected data flow

Sale recorded
→ asset becomes **Sold - Awaiting Shipping**
→ carrier/tracking label recorded
→ parcel collected
→ asset becomes **Sold - Shipped**
→ delivery recorded
→ 30-day operational return hold starts
→ if return requested: `sales_customer_returns`
→ otherwise, after hold expiry: archive RPC
→ asset becomes **Archived** with UK tax-year key.

### Failure checkpoints

1. Sale still becomes plain `Sold`: inspect live `staff_mark_resale_listing_sold(...)`.
2. Shipping form rejects the item: inspect `inventory_assets.status` and `staff_create_sales_fulfillment(...)`.
3. Mark Collected does not move to **Sold - Shipped**: inspect `staff_update_sales_fulfillment(...)` first.
4. Return request is offered before delivery: inspect fulfilment status and UI gating.
5. Archive fails: verify delivery, return-window expiry and no open `sales_customer_returns` case.
6. Wrong tax-year grouping: inspect `gco_uk_tax_year(...)` and the original `sold_at` timestamp.

### Accounting rule

Archive is a status and organisational view, not a destructive data move. Do not delete the original asset, expenses, evidence, inspections, listings or transaction history when archiving.


### Return closure compatibility

If a customer return is resolved or refused **before the item is physically received**, restore the linked `sales_fulfillments.status` to `Delivered`. Otherwise the closed return would leave a permanent `Return Open` fulfilment that blocks later archiving. This compatibility repair is implemented in `staff_update_sales_customer_return(...)`.
