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
  - one independently collapsible record per customer return;
  - header retains product, status, return reference and SKU;
  - active cases are expanded by default; terminal history is collapsible.
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


### Live reconciliation incident — TEST-ASSET-007 (6 September 2026)

**Observed first failure:** carrier collection was recorded successfully in `sales_fulfillments` as **Collected**, but the linked asset remained plain **Sold**. This caused the dashboard to continue presenting the item as legacy Sold and prevented the expected post-sale presentation.

**Live inspection:** the current deployed `staff_update_sales_fulfillment(..., 'collected')` definition already contains the required update to `inventory_assets.status='Sold - Shipped'`. No duplicate function signature was present. The exact cause of the earlier partial state could not be proven from the current live system.

**Repair:** TEST-ASSET-007 was reconciled only after confirming the linked fulfilment was genuinely Collected. Its asset status is now **Sold - Shipped**; the fulfilment remains **Collected**.

**Rule:** do not overwrite the current fulfilment RPC based on this incident alone. If repeated, capture the browser RPC call and transaction timing first, then inspect for a reproducible database invariant failure.

## Customer return assessment, disposal and accounts capture — 7 September 2026

### User decision

A physically received buyer return must not be closed with a single **Mark Return Resolved** action.

Before resolution, staff must record:

- the return-label cost;
- what happened and the return assessment;
- damage or condition found;
- what happened to the returned item;
- whether it is returned to stock/resale, sent to auction, broken down for spares, sent for repair, sold as second-hand spares, written off/recycled or another documented outcome;
- how the customer was resolved;
- refund method, amount, provider/processor and transaction reference where applicable;
- replacement asset/reference and notes where a replacement was supplied.

### Front end

- `sales-customer-returns.html`
- `sales-customer-returns.js`

### Supabase

Table: `sales_customer_returns`

New closure/accounting fields include:

- `return_label_cost`
- `resolution_summary`
- `damage_assessment`
- `item_disposition`
- `customer_resolution_type`
- `refund_method`
- `refund_provider`
- `refund_amount`
- `refund_reference`
- `replacement_asset_id`
- `replacement_reference`

RPCs:

- `staff_record_sales_customer_return_label(...)`
- `staff_resolve_sales_customer_return(...)`

### Required closure rule

`Item Received → mandatory assessment + financial/customer resolution details → Resolved`

The legacy generic `resolve` action now refuses to close an Item Received return without the detailed closure record.

### Accounting principle

The customer-return record is now an operational accounting source record. It does not yet replace a future accounts ledger, but costs, refunds, payment method/provider and references are retained so that a later accounts system can consume them without reconstructing the event from notes.


## Live Task Board → Customer Return Assessment Routing — 7 September 2026

### User action

Staff see **CUSTOMER RETURNS** in the shared Live Task Board and click **VIEW**.

### Correct path

`live-task-board.js`
→ authoritative `sales_customer_returns`
→ status-specific task
→ `sales-customer-returns.html`
→ `sales-customer-returns.js`
→ for **Item Received**: assessment and accounting closure form.

### First verified failure

The task board was reading the legacy `customer_return_requests` table and routing to `returns.html`. The active post-sale return was stored in `sales_customer_returns`, producing a misleading **No customer return requests** destination.

### Failure checkpoints

1. Task count does not match customer-return records: query `sales_customer_returns` first.
2. Item Received task opens the wrong page: inspect `live-task-board.js`; destination must be `sales-customer-returns.html`.
3. Destination shows no records: compare the table queried by the task board with the table queried by the destination page.
4. Item Received has no closure form: inspect `sales-customer-returns.js` and the dedicated return-resolution RPC.

### Rule

The Live Task Board must point at the same authoritative workflow table as the page that performs the action.


### Duplicate returned-item task suppression — 7 September 2026

A physically received post-sale customer return sets the linked asset to `Returned`, while the authoritative return case remains open in `sales_customer_returns` with status **Item Received**.

The Live Task Board therefore has two possible sources for the same physical event. The generic asset map must **not** create a second `Review returned item` task for an asset that already has an open customer-return case. Otherwise one task can route to the generic Product Workbench instead of the dedicated return assessment.

Current rule:

- open `sales_customer_returns` case for the asset → only the authoritative **CUSTOMER RETURNS** task is shown;
- no open customer-return case → the generic `Returned` asset task may remain available for non-customer-return investigation.

**First verified failure:** TEST-ASSET-007 / CSR-E768FABB1E5B produced a correct customer-return task and a second generic asset task. The second CTA could route staff away from the mandatory assessment page.

Repair location: `live-task-board.js`.


## Customer Return Assessment — Transaction Context (7 September 2026)

For a physically received buyer return, the assessment screen must show the linked sale and return timeline before staff complete closure:

- date/time sold (`inventory_assets.sold_at`);
- customer sale price (`inventory_assets.sold_price`);
- sales channel (`inventory_assets.sold_channel`);
- return opened (`sales_customer_returns.created_at`);
- return collected (`collected_at`);
- item physically received back (`item_received_at`).

These are display-only transaction facts. They must not be re-entered manually during assessment. The existing mandatory closure fields remain the authoritative record of the return outcome and customer financial resolution.

## Follow-up repair — resolved customer-return links and stale actions

Browser testing after completing **CSR-E768FABB1E5B** exposed a second-stage routing problem.

Live state was verified as:

- `sales_customer_returns.status = 'Resolved'`;
- `inventory_assets.status = 'Returned'`;
- the return assessment and customer financial details were already completed.

Two stale routes remained:

1. the lower **OPEN RETURNS** CTA on the Sales Dashboard still linked to legacy `returns.html`;
2. the generic `Returned` asset workflow could still create **Review returned item** and route to the Product Workbench after the customer return was already resolved.

### Repair

- Sales Dashboard lower CTA now opens `sales-customer-returns.html` as **OPEN CUSTOMER RETURNS**.
- Sales Dashboard return attention counts now use `sales_customer_returns` for active customer-return cases and do not treat a resolved customer-return asset as a fresh generic return review.
- The generic `Returned` task is suppressed for any asset that has a post-sale `sales_customer_returns` record, preventing the Product Workbench route from reappearing after closure.

### Rule

A completed post-sale customer return must not continue to generate legacy return or generic Product Workbench actions. The authoritative record remains `sales_customer_returns`; once terminal, it is history rather than live work.


---

## Purchasing Dashboard task-board handoff boundary — 8 September 2026

### User action

Staff open **Purchasing Dashboard → What Needs Doing** after inventory has been sent to pre-sale.

### Front-end path

`admin-purchasing.html`
→ `live-task-board.js`
→ reads authoritative workflow records
→ maps `inventory_assets.status = 'Sent to Sales'` to category **SALES**
→ page-scoped presentation filter
→ Purchasing Dashboard task list.

### Relevant Supabase state

Authoritative item state remains in `public.inventory_assets`:

- `status`
- `previous_status`
- `status_changed_at`
- `sent_to_sales_at`

No trigger, RPC or RLS policy is required for this presentation repair because the verified database transition was already correct.

### First verified failure

Assets with `status = 'Sent to Sales'` were correctly in the Sales workflow but still appeared as **SALES** rows in the Purchasing Dashboard's shared task board. This made the Purchasing Dashboard appear to retain work after handoff.

### Minimal repair

`live-task-board.js` now scopes tasks on `admin-purchasing.html` to:

- **PURCHASING**
- **PURCHASE RETURNS**
- **INVENTORY**

The shared collector still builds Sales tasks for the Sales Dashboard and other contexts. **Ready for Resale** remains visible on Purchasing because the handoff has not yet happened. **Sent to Sales** and later Sales statuses are excluded from the Purchasing presentation only.

### Failure checkpoints

1. Sales item still appears on Purchasing: verify the asset status first.
2. Status is still `Ready for Resale`: this is not a task-board bug; the handoff has not completed.
3. Status is `Sent to Sales` but appears under Purchasing: inspect page-scoped filtering in `live-task-board.js` and browser cache identity in `admin-purchasing.html`.
4. Item disappears from Purchasing but not visible in Sales: inspect Sales Dashboard state queries separately; do not undo the Purchasing filter.

### Rule

**Inventory → Sales is a workflow ownership boundary.** Once an item is handed to Sales, Purchasing must not continue to present it as active purchasing work merely because the shared task collector can see it.


---

## Sales Dashboard task-board workspace boundary — 8 September 2026

### User action

Staff open **Sales Dashboard → What Needs Doing**.

### First verified failure

After the Purchasing boundary repair, browser verification showed the inverse problem on the Sales Dashboard:

- valid **SALES** tasks were present;
- a **PURCHASING** task, **Review valuation**, was also present;
- pre-handoff **INVENTORY** work was also present.

The authoritative Supabase state was not wrong. The failure was that `admin-sales-dashboard.html` had no presentation scope in the shared `live-task-board.js`.

### Minimal repair

The page scope map is now:

- `admin-purchasing.html` → `PURCHASING`, `PURCHASE RETURNS`, `INVENTORY`
- `admin-sales-dashboard.html` → `SALES`, `CUSTOMER RETURNS`

The shared collector continues to generate all valid workflow tasks. Each dashboard filters that shared set to its own operational workspace.

### Expected data flow

`inventory_assets.status = 'Ready for Resale'`
→ Purchasing / Inventory task

`inventory_assets.status = 'Sent to Sales'`
→ Sales task

`valuations.status = pending review`
→ Purchasing task only

`sales_customer_returns` active
→ Customer Returns task on Sales only

### Failure checkpoints

1. A Purchasing task appears on Sales: inspect `pageCategoryScopes` in `live-task-board.js`.
2. A Sales task appears on Purchasing: inspect the same map and current browser cache identity.
3. Task is missing from both dashboards: verify authoritative database state before changing filters.
4. Task appears on the wrong dashboard but has correct category: repair presentation scope, not Supabase state.

### Rule

**The shared task collector is global; dashboard ownership is page-scoped.**


## Unified Product Workbench and channel management — 8 September 2026

### User action
Staff open one inventory item and complete or edit the product, photographs, listing content and sales channels without moving to a separate per-item Sales Workbench.

### Front-end entry point
- inventory-detail.html
- inventory-workbench.js — receiving/inspection workflow and customer note display.
- inventory-sales-handoff.js — post-handoff product, catalogue, physical-item and photograph editing.
- inventory-sales-channels.js — core listing fields and active outlet controls.
- listing-readiness.html — compatibility redirect only.

### Supabase
- inventory_assets — core physical item and default listing details.
- inventory_testing — retained inspection/testing history.
- inventory_evidence — staff photographs.
- quote_items / valuations — original customer quote and condition/exception data.
- inventory_sales_content — physical-item sales presentation.
- catalog_sales_content — reusable catalogue presentation.
- sales_outlets — authoritative active outlet registry.
- resale_listings — authoritative channel listings.
- staff_mark_resale_listing_sold(p_listing_id,p_sold_price,p_selling_fees,p_shipping_cost) — central sold action.

### Expected data flow
Product Workbench
→ save core product/listing details to inventory_assets
→ save sales presentation to existing sales-content tables
→ manage staff photographs through inventory_evidence / quote-photos
→ load active outlets from sales_outlets
→ WEBSITE publish or marketplace submitted/live action
→ central resale_listings
→ public storefront / central sales state.

### Failure checkpoints
1. Customer condition note missing: inspect customer_exception_notes, item_data.exceptionNotes, and item_data.conditionNotes before changing display logic.
2. Channel list missing: verify active sales_outlets rows and staff access.
3. Website does not appear publicly: verify the WEBSITE resale_listings row is Published and then inspect the public storefront query/RPC.
4. Marketplace state appears wrong: inspect the single channel row in resale_listings; do not restore the old Draft/Ready workflow without a deliberate workflow decision.
5. Sold action fails: inspect the central sold RPC before altering channel state directly.
6. A legacy Sales Workbench link appears: verify listing-readiness.html remains only a compatibility redirect and the Product Workbench is the active per-item route.

### Known fix history
- The previous separate Sales Workbench duplicated the per-item workflow and required Draft → Ready to Upload steps.
- Direct WEBSITE publishing was already correctly repaired on 8 September 2026.
- The workflow was consolidated onto the Product Workbench while retaining the same sales_outlets and resale_listings backend truth.


---

## Unified Product Workbench correction — 8 September 2026

### User action

Staff click one product from Inventory or Sales and manage everything for that physical item from:

`inventory-detail.html?id=<asset_id>`

### Front-end route

1. `inventory-detail.html`
2. `inventory-workbench.js`
   - core product fields;
   - package;
   - condition;
   - serial;
   - default sale price;
   - master description;
   - inspection/testing.
3. `inventory-sales-handoff.js`
   - appends Product History;
   - purchase/acquisition information;
   - repair history;
   - sales presentation;
   - view/add/remove/select staff photographs;
   - catalogue content.
4. `inventory-sales-channels.js`
   - active outlets;
   - WEBSITE direct publishing;
   - external submitted/live confirmation;
   - central sold action.

### Supabase route

`inventory_assets`
→ `inventory_testing` / `inventory_repairs`
→ `inventory_evidence` + Storage `quote-photos`
→ `inventory_sales_content` / `catalog_sales_content`
→ `sales_outlets`
→ `resale_listings`
→ public storefront / central sales state.

### First failure corrected

The previous unified channel code attempted to update `inventory_assets.listing_title`.

**Live schema check:** that column does not exist.

The correct ownership is:

- master physical defaults: `inventory_assets`;
- per-channel title/description: `resale_listings.listing_title` and `resale_listings.listing_description`.

### Second failure corrected

The sales handoff script previously replaced the whole Product Workbench DOM, creating a de facto second workbench.

Current rule: append sales/history sections to the same product page; do not replace the root workbench.

### Failure checkpoints

1. Product page missing sales sections → check script load/cache identifiers and `#workbench-form`.
2. History missing → check sales-status gate and `inventory_assets`/repair rows.
3. Photograph failure → inspect the first Storage response against `quote-photos` before changing RLS or bucket configuration.
4. Channel save fails → inspect exact `resale_listings` response; do not write channel-only fields to `inventory_assets`.
5. WEBSITE not public → verify WEBSITE outlet row and Published `resale_listings` state.
6. Marketplace workflow shows Draft/Ready → inspect current channel script; those stages are not part of the intended normal action.


### Customer condition-note fallback

If a note is missing from the Product Workbench, inspect the matching item in `valuations.quote_data.quoteBasket` before changing the database. Older/multi-item submissions can retain the original note there even when `quote_items.item_data` is incomplete.


---

## Final listing stage on the unified Product Workbench — 8 September 2026

### User action

Staff open an item already handed to Sales and prepare the actual listing without opening a second Sales Workbench.

### Front-end route

`inventory-detail.html` → base `inventory-workbench.js` → Sales-status handoff `inventory-sales-handoff.js` → channel controls `inventory-sales-channels.js`.

### Expected page structure

1. Read-only history: original customer condition/note, inspected condition, inspection result, TESTED / INSPECTED, inspector, date and price paid for reference.

2. Master listing: manufacturer/product description, individual listing description, title, sale price and postage/packing.

3. Listing photographs: view/add/remove/select hero.

4. WEBSITE first: direct publish.

5. Marketplaces after: one click to record submitted/live.

### Supabase objects

`inventory_assets`; `inventory_testing`; `staff_users.display_name` / `profiles.full_name`; `inventory_sales_content`; `catalog_sales_content`; `inventory_evidence` + `quote-photos`; `sales_outlets`; `resale_listings`.

### Expected data flow

Save master listing → `inventory_sales_content` + compatibility update to `inventory_assets` → WEBSITE button → `resale_listings.status='Published'` → public storefront.

Marketplace path: save master listing → marketplace button → marketplace `resale_listings` row uses `Published` as the submitted/live state.

### Failure checkpoints

1. Editable inspection fields reappear: inspect `inventory-sales-handoff.js`; Sales handoff must remove the base inspection editor.

2. Inspector name missing: inspect `inventory_testing.created_by`, then `staff_users.display_name` and `profiles.full_name`.

3. Master title/price/postage missing: verify the `inventory_sales_content` columns and migration.

4. Website button fails: inspect the WEBSITE outlet and resulting `resale_listings` payload.

5. Marketplace fails: inspect the `sales_channel` constraint mapping; outlet names must map to an allowed central sales channel value.

6. Old Draft/Ready controls return: inspect `inventory-sales-channels.js`.

### Known fix history

Do not restore a second per-item Sales Workbench, do not replace the Product Workbench root, do not write listing fields to nonexistent `inventory_assets` columns, and do not make price paid or inspection history editable from the final listing stage.


## Condition separation rule — 8 September 2026

### Customer declaration
- `inventory_assets.customer_condition`
- `inventory_assets.customer_exception_notes`
- valuation / quote-item fallback data

These are historical valuation facts. They are reference-only and must not populate resale condition fields.

### Staff inspection condition
- `inventory_assets.condition_grade`
- supported by `inventory_testing.visual_condition` and inspection/testing history

This is the authoritative resale condition and is the only condition carried into `resale_listings.listing_data.condition`, the GearCashOut retail website and marketplace payloads.

### Failure checkpoint
If a resale listing shows the wrong condition, inspect `inventory_assets.condition_grade` first, then the channel payload construction. Do not repair the issue by copying customer valuation condition into sales data.


## Final listing-stage simplification — 8 September 2026

**Single editor:** inventory-detail.html + inventory-sales-handoff.js

Editable resale fields:
- pre-filled listing title;
- manufacturer/product description;
- item-specific description;
- detailed staff resale condition;
- battery quantity;
- missing items;
- final package contents;
- sale price;
- postage and packing;
- staff listing photographs.

**Sales actions:** inventory-sales-channels.js

- WEBSITE → Send to Website / update Website.
- External outlets → Add to Marketplace / update marketplace record, shown as submitted/live operationally.
- Sold event → staff_mark_resale_listing_sold marks all other channel rows Delist Required.
- WEBSITE is effectively removed automatically from public stock because public_storefront_stock filters for Published WEBSITE rows.
- External marketplace closure is manual until a verified outlet API is implemented; the workbench warns staff clearly.


## Unified final listing editor — 8 September 2026

### Operator action
Item reaches Sent to Sales → open Product Workbench → complete/edit minimal resale details → select customer/staff photographs → save → Send to Website → Add to Marketplace as required → mark sold on the successful outlet.

### Listing truth
- manufacturer description: inventory_sales_content.manufacturer_description
- staff item description: inventory_sales_content.listing_notes
- detailed staff condition: inventory_sales_content.condition_description
- staff condition grade: inventory_assets.condition_grade
- missing parts: inventory_assets.package_notes
- battery count: inventory_assets.actual_battery_count
- selected listing photographs: inventory_sales_content.listing_photo_paths
- price/postage: inventory_sales_content.asking_price / postage_packing

### Sale collision / closure path
staff_mark_resale_listing_sold marks the successful listing sold and changes other open records for the same asset to Delist Required.

- WEBSITE: effectively removed automatically because public storefront queries only Published WEBSITE records.
- External marketplaces: currently manual closure unless a verified integration is added. The workbench must show a closure warning rather than imply automatic API closure.


### Item-specific manufacturer text safeguard
Manufacturer/product description can be pre-filled from catalog_sales_content, but saving an individual Product Workbench listing now stores the edited text only on inventory_sales_content. An item-level correction must not overwrite the shared catalogue description for every future item of that model.


## 8 September 2026 — Published website status and duplicate workflow-strip repair

### First actual findings

The live Supabase record for TEST-ASSET-003 is a Published WEBSITE resale listing, and public_storefront_stock('retail', ...) returns it as live public stock. The backend publishing path was therefore not the failure.

The staff page could still leave the operator uncertain because the final listing stage did not place a prominent top-level live confirmation above the channel actions. The unified channel panel now explicitly shows **WEBSITE STATUS: LIVE ON GEARCASHOUT** when the authoritative resale_listings row is Published.

For sales-stage assets, the base Product Workbench's earlier inspection workflow strip was still left in the header while the final sales handoff owned the page. That produced two competing workflow guides. The obsolete inspection strip is now removed for sales handoff mode.

The customer valuation page's progress indicator also used forced horizontal scrolling on desktop, leaving a scrollbar/track that could look like a second progress tree. It now wraps normally into one progress guide.

### Regression rule

Do not change a live WEBSITE listing back to Draft merely to repair presentation. Verify resale_listings.status, then verify public_storefront_stock before touching the publishing backend.


## 8 September 2026 — Sales Dashboard active-listing truth repair

### First verified failure

A WEBSITE listing can be genuinely **Published** while its physical `inventory_assets.status` remains **Sent to Sales**. This is the current state of `TEST-ASSET-003`.

The public storefront and Active Sales / Listings page already read `resale_listings.status='Published'`, but the Sales Dashboard pipeline was incorrectly counting only physical assets with `status='Listed'` or `status='Reserved'`.

Result: a genuinely live website listing could appear as:

- 0 Listed;
- 0 Active Listings;
- still included in Ready for Pre-Sale.

### Repair

The Sales Dashboard now uses authoritative `resale_listings` state for the active pipeline:

- Published channel row → active/listed;
- Reserved channel row → reserved;
- Sent to Sales is excluded from Ready for Pre-Sale when that asset already has a Published or Reserved channel listing.

This deliberately avoids changing a working Published listing or forcing an unnecessary physical-asset status rewrite.

### Verification rule

When dashboard and storefront disagree:

1. inspect the asset status;
2. inspect `resale_listings` for Published/Reserved rows;
3. count active sales from channel rows;
4. only then consider changing the asset lifecycle state.

Do not "repair" the dashboard by changing a Published listing back to Draft or by blindly rewriting inventory status.


## 8 September 2026 — Single listing-workbench CTA

### Verified duplication

The Pre-Sale / Channels cards showed both:

- **OPEN SALES WORKBENCH** → `listing-readiness.html?id=<asset_id>` → compatibility redirect;
- **PRODUCT WORKBENCH** → `inventory-detail.html?id=<asset_id>`.

Both routes ultimately served the same unified Product Workbench responsibility.

### Repair

Pre-Sale / Channels now exposes one CTA only:

**OPEN PRODUCT WORKBENCH** → `inventory-detail.html?id=<asset_id>`.

The compatibility redirect remains available for old bookmarks and legacy links, but it is no longer presented as a second operational choice.

### Rule

One physical product has one operational listing editor and one visible listing-workbench action.


## 8 September 2026 — Existing live listing continuity repair

### First actual issue

A product can already have a valid Published WEBSITE row while having no `inventory_sales_content` row. This is the case for legacy/test stock such as `TEST-ASSET-003`.

Without a fallback, the unified Product Workbench could show blank listing fields and an update action could incorrectly require staff to recreate title/price information that already existed in `resale_listings`.

### Repair

The unified Product Workbench now treats the existing channel listing as a safe read-only fallback when item-level sales content has not yet been created:

- existing listing title pre-fills the workbench identity;
- existing asking price pre-fills the sale price;
- existing shipping cost pre-fills postage where available;
- existing listing description is retained as a fallback description;
- item-level `inventory_sales_content` still becomes the preferred source after the operator saves.

The same fallback is used when updating a channel listing.

### Rule

Do not make staff recreate a working live listing merely because it predates the unified Product Workbench. Preserve existing `resale_listings` data and allow the unified editor to adopt it safely.


## 8 September 2026 — Active Sales visibility RLS repair

### First actual failure

The Sales Dashboard JavaScript had already been corrected to count authoritative `resale_listings.status='Published'` rows.

However, `resale_listings` had Row Level Security enabled with no staff SELECT policy. The database therefore returned no listing rows to an authenticated staff browser, even though privileged database inspection and the public storefront could see the Published listing.

This explains why the dashboard could still show **0 Listed / No Active Listings** after the JavaScript counting repair.

### Minimal repair

Added the `resale_listings_sales_staff_select` RLS policy.

A row is visible to an authenticated user only when there is an active `staff_users` record and the user has either:

- `can_access_sales = true`; or
- `can_manage_staff = true`.

### Verified result

An authenticated eligible sales staff context can now read the two current Published resale rows. The dashboard's existing authoritative listing-count logic can therefore receive the live rows it was already designed to count.

No listing status, inventory status, storefront record or published item was changed.


---

## Unified sales stream placement — 8 September 2026

### User action
Staff move from the Sales Dashboard through **Ready to List**, **Active Listings**, **Sold Items** and returns without the same product appearing as normal work in more than one stage.

### Front-end route

- `admin-sales-dashboard.html` → `admin-sales-dashboard.js`
- `inventory-sales.html` → `inventory-sales.js`
- `active-sales-listings.html` → `active-sales-listings.js`
- `sold-items.html` → `sold-items.js`

### Supabase truth

- `inventory_assets` — physical lifecycle and post-sale state.
- `resale_listings` — authoritative per-channel listing state.
- `staff_mark_resale_listing_sold(...)` — controlled sold transition.
- `staff_close_resale_listing(...)` — closes a `Delist Required` external listing.

### Expected data flow

`Ready for Resale`
→ `staff_send_inventory_to_sales(...)`
→ `Sent to Sales`
→ **Ready to List only while no Published/Reserved channel row exists**
→ `resale_listings.status='Published'/'Reserved'`
→ **Active Listings**
→ `staff_mark_resale_listing_sold(...)`
→ successful row `Sold`, other open rows `Delist Required`, asset `Sold - Awaiting Shipping`
→ **Sold Items / post-sale**
→ shipping / returns / archive.

### Failure checkpoints

1. Item appears in Ready to List and Active Listings: inspect `resale_listings` first; a Published/Reserved row excludes it from Ready to List.
2. Dashboard shows zero active while storefront is live: inspect staff visibility/RLS on `resale_listings`, then dashboard query results.
3. Item appears sold but is still shown as ready to list: inspect the asset status, sold RPC result and any stale `Delist Required` exception separately.
4. Multiple pages disagree: do not rewrite the physical asset status first; reconcile the channel row and the page placement filter.

### Known fix history

The dashboard count was repaired first, then the remaining contradiction was found in `inventory-sales.js`, which still used all `Sent to Sales` assets as the pre-sale queue. The minimal repair changed only the presentation filter and wording; it did not alter working Published listings or inventory lifecycle records.


---

## Operational clean-start reset — 8 September 2026

### User action

Management deliberately chooses **Clear All Operational Data** to remove all current workflow history and restart valuation → purchasing → inventory → listing → sales from an empty operational state.

### Entry points

- `admin.html` management danger zone;
- `admin-reset.html` standalone reset page;
- `admin-test-reset.js`;
- Supabase RPC `reset_test_quote_data()` (legacy-compatible function name).

### Preserved reference/system data

- auth/customer/staff accounts;
- `quote_catalog_products` and research/pricing data;
- outlets;
- system configuration.

### Dependency order

`sales_customer_returns`
→ `sales_fulfillments`
→ inventory/customer return blockers
→ `resale_transactions`
→ `resale_listings`
→ `inventory_assets` and cascading dependent records
→ sales/quote workflow records.

Workflow photographs are removed through the Storage API, not SQL.

### Known fault history

The original reset omitted `sales_customer_returns` and `sales_fulfillments`. Both had restrictive foreign keys to `inventory_assets` and could prevent a clean reset when those rows existed. The reset was repaired before the destructive action was performed.


## Receipt → Inspection handoff repair — 8 September 2026

### Required path
Customer item physically received → `staff_mark_item_received_and_sync_inventory(...)` → `sale_items` / `quote_items` → linked `inventory_assets` row exists at **Received** → Product Workbench opens that asset → inspection/testing records use the same `asset_id`.

### First verified failure after operational reset
The receipt RPC previously updated only an existing `Awaiting Receipt` asset. After **CLEAR ALL OPERATIONAL DATA**, there was no asset to update, yet the function reported success because its counter increased regardless of affected rows. The sale could therefore reach inspection with **0 inventory assets**.

### Repair
Repository migration: `supabase/migrations/20260908223000_repair_received_inventory_creation.sql`.

The receipt RPC now creates the missing linked inventory asset when necessary and reports created/updated/total counts separately.

### First failure checkpoint
Before investigating the inspection form, query `sale → sale_items → inventory_assets`. If the asset does not exist, repair the receipt handoff first. Do not recreate old separate inspection routes.

### UI resilience
`inventory-workbench.js` now exposes load errors and replaces an indefinite loading state with a visible timeout after 20 seconds.

## Receipt → Purchasing inspection → read-only Sales decision boundary — 8 September 2026

### User action

Staff marks an accepted item received and begins inspection.

### Front-end route

`admin-sale-next-step.js`

**START INSPECTION** → `staff_start_sale_inspection(p_sale_id)` → locate the linked `inventory_assets` row → `inventory-detail.html?id=<asset_id>`

### Editable Purchasing workflow

`inventory-workbench.js` owns staff condition, serial/accessory verification, battery count and health, inspection result, flight/camera testing, damage notes, missing-item resolution, final package contents, staff photographs and Repair Required routing.

### Authoritative data

- `sales`
- `sale_items`
- `inventory_assets`
- `inventory_testing`
- `inventory_repairs`

Join boundary: `sales.id → sale_items.sale_id → quote_item_id → inventory_assets(source_sale_id, source_quote_item_id)`.

### Sales behaviour

While incomplete, Sales does **not** bypass inspection to the final-offer screen. It shows inspection progress as read-only and links back to Purchasing.

When `inventory_assets.status` is `Ready for Resale` (or a later sales state), the physical inspection is treated as complete for the Sales decision boundary. Sales then shows the recorded inspection/testing result as **read-only** and exposes final offer/refusal.

When status is `Repair Required`, Sales shows the inspection as read-only and routes editing to the controlled Purchasing repair workflow.

### Final-offer gate

`admin-quote-final-offer-fix.js` must not enable final-offer controls merely because `sales.status='inspection'`. It verifies the linked inventory asset has reached a completed status before restoring accepted-item final-offer controls.

### Failure checkpoints

1. **Start Inspection returns to final offer:** inspect `admin-sale-next-step.js`.
2. **No Product Workbench asset:** inspect `sale → sale_items → inventory_assets`.
3. **Sales shows editable inspection:** inspect the sale next-step presentation boundary; Sales must be read-only.
4. **Final offer enabled too early:** inspect `admin-quote-final-offer-fix.js` and linked asset status.
5. **Repair Required editable from Sales:** incorrect; route editing through Purchasing only.

## Duplicate inspection task checkpoint — 8 September 2026

### Symptom

Purchasing Dashboard showed two current actions for one received item:

- **PURCHASING — Inspect received item**
- **INVENTORY — Inspect item**

### First failure

The unified `live-task-board.js` generated one task from `sales.status in ('received','inspection')` and another from the linked `inventory_assets.status='Received'`. Its generic duplicate key could not collapse them because they had different categories, titles and URLs.

### Repair

`inventory_assets.source_sale_id` is now loaded by the task board. When a linked inventory asset exists in an active inspection state, the sale-side inspection task is suppressed and the Product Workbench inventory task is the single actionable record.

### Verification

Check separately:

1. valuation count;
2. sale count;
3. linked inventory asset count;
4. rendered task count.

Do not delete database records merely because the dashboard displays duplicate actions; establish whether the duplication is data or presentation first.


---

## Purchase-finalisation boundary before Sales — 8 September 2026

### Required gate

For customer-sourced inventory:

`Ready for Resale` + linked `sales.status='completed'` + linked `sales.payment_status='paid'`
→ `staff_send_inventory_to_sales(...)`
→ `Sent to Sales`.

### Investigation points

1. `inventory_assets.source_sale_id`
2. linked `sales.status`
3. linked `sales.payment_status`
4. current `inventory_assets.status`
5. latest inspection/testing records
6. `staff_send_inventory_to_sales(...)` live definition

### Known fault history

A test item reached `Ready for Resale` during inspection while the linked customer sale remained `inspection / awaiting_final_quote`. The old Sales RPC checked only physical readiness and allowed the item into Sales prematurely. The repair added the purchase-finalisation check to the RPC and mirrored it in `inventory-detail-enhancements.js`.

### Regression rule

Never use physical readiness alone as the commercial handoff condition for a customer purchase.


## Customer receipt-status synchronisation — 8 September 2026

### User action
Staff press **ITEM RECEIVED** in Purchasing / Sales & Shipping.

### Required flow

`admin-sales.js`
→ direct RPC `staff_mark_item_received_and_sync_inventory(p_sale_id)`
→ `sales.status='received'`
→ inbound `shipments.status='delivered'`
→ linked `inventory_assets` created/updated
→ customer account polls the same sale
→ customer sees **ITEM RECEIVED** or **UNDER INSPECTION**.

### Failure rule

If the customer still sees **PARCEL ON ITS WAY**, inspect `sales.status` and the inbound shipment row separately. After receipt, customer rendering must prioritise `sales.status` over shipment status. Do not repair this by changing only the display if the sale record itself was never updated.

### Known fix

The previous staff page had two competing receipt paths: the old `admin-sales.js` handler invoked the `mark-item-received` Edge Function, while a separate capture listener attempted to redirect the click to the secured RPC. The receipt action is now owned directly by `admin-sales.js`; customer account renderers were also changed to status-first logic.

## Receipt transaction rollback caused by catalogue UUID aggregate — 8 September 2026

### Symptom

A live receipt test left both dashboards unchanged. Supabase confirmed `shipping`, `in_transit`, and no inventory asset.

### First actual failure

A transactional test of `staff_mark_item_received_and_sync_inventory(p_sale_id)` reached `resolve_quote_item_catalog_product(p_quote_item_id)`, which executed `select count(*), min(id)` against UUID `id`. PostgreSQL has no `min(uuid)`, so the exception rolled back the whole receipt transaction.

### Repair

`supabase/migrations/20260908224500_fix_catalog_uuid_aggregate_receipt.sql` replaces `min(id)` with `(array_agg(id))[1]`; the resolver still returns a UUID only for exactly one catalogue match.

### Verified result

The receipt RPC dry run reported one inventory asset would be created. The affected live sale was then processed through the same authoritative RPC and verified as `received / delivered / Received asset`.

### Regression rule

A receipt action is not fixed because the button handler exists. Verify the full transaction through dependent database functions and confirm all three authoritative records after execution.
## Receipt gate and customer valuation continuity — 8 September 2026

### User action

Staff process an accepted customer purchase through **Sales & Shipping** and later mark the item physically received.

### Actual route

`admin-purchasing.html`
→ `admin-sales.js`
→ inbound `shipments` row
→ `staff_mark_item_received_and_sync_inventory(p_sale_id)`
→ `sales.status='received'`
→ linked `inventory_assets.status='Received'`
→ Purchasing/Product Workbench inspection.

### Mandatory receipt gate

**ITEM RECEIVED** must not appear, and the RPC must reject the action, until an inbound customer → GearCashOut shipment has:

- status `label_created` or `in_transit`;
- at least one label recorded;
- at least one label URL or QR URL recorded.

### Customer rendering

`account-page.js` keeps the original valuation visible as **in progress** while the linked sale remains active.

`account-sales.js` and `account-combined-transaction-authority.js` use `sales.status` as the operational authority after receipt.

### Failure checkpoints

1. **ITEM RECEIVED visible before label:** inspect `admin-sales.js` gate and cache version in `admin-purchasing.html`.
2. **Direct RPC bypass succeeds:** inspect `staff_mark_item_received_and_sync_inventory(uuid)` for the same inbound-label gate.
3. **Customer says no valuations while purchase is active:** inspect `account-page.js` linked `sale_items` query and terminal sale filtering.
4. **Customer still sees parcel on its way after receipt:** inspect `sales.status` first, then inbound `shipments.status`; do not repair only the text.


---

## Final-offer rendering and premature Sales-task regression — 8 September 2026

### Symptoms

A single customer item could briefly show the final offer, then revert to the generic inspection message; sometimes appear as duplicate valuation/update cards after refresh; and show **Send item to pre-sale** while the customer was still deciding the final offer.

### First failures

1. The customer account had two competing renderers for standalone final offers: `account-single-offer-visibility.js` and the generic `account-page.js` sale renderer. They polled independently and overwrote the same `#sales` container.
2. `account-shipping-links.js` could also manipulate the sale card after the main renderer and contained an inspection branch that referenced `action` before creation.
3. `inventory-workbench.js` and `live-task-board.js` treated `Ready for Resale` as immediately actionable even though the database handoff RPC correctly required the linked customer purchase to be `completed / paid`.

### Current authoritative route

Customer final offer:

`account.html` → `account-page.js` → `sales → sale_items → quote_items → quote_offers` → published `offer_type='final'` → customer accepts/refuses through the existing secured RPC.

There is now one standalone customer renderer for this state. A published final offer suppresses the generic **valuation in progress** card for that item and replaces the generic inspection update.

### Sales-handoff presentation rule

For customer-sourced assets, `Ready for Resale` means physical preparation is complete. It must not generate a **Send to Sales** button or Live Task Board handoff until the linked sale is `completed` and `paid`. The existing `staff_send_inventory_to_sales(...)` database gate remains authoritative.

### Regression checks

1. Publish one final offer for a single received/inspected item.
2. Customer refreshes repeatedly: exactly one final-offer card remains visible and does not revert.
3. No second generic valuation card is rendered for that same published final offer.
4. Product Workbench shows **WAITING FOR PURCHASE FINALISATION**, not **SEND TO SALES**, before completion/payment.
5. Purchasing Live Task Board suppresses the premature pre-sale task.
6. After final acceptance and payment completion, the existing Sales handoff path becomes eligible.


---

## Product Workbench navigation after completed inspection — 9 September 2026

### User action

Staff receive a customer item, complete the physical inspection and technical testing, and the asset reaches `Ready for Resale` while the linked customer purchase is still awaiting the final offer.

### Correct workflow boundary

`Received → Start Inspection → Product Workbench → Inspection/testing complete → Ready for Resale → Customer final offer/refusal → Customer acceptance → Payment → Send to Sales`

`Ready for Resale` is an inspection-complete state, not permission to enter the Sales workspace before the customer purchase is completed and paid.

### Front-end entry point

- `inventory-detail.html`
- `inventory-workbench.js`

### Relevant records

- `inventory_assets.status`
- `inventory_assets.source_sale_id`
- `sales.status`
- `sales.payment_status`
- `quote_items.valuation_id`
- `valuations.id`

### Navigation rule

The Product Workbench must not present generic Sales or Sold Items navigation while staff are completing a customer purchase inspection.

After inspection is complete:

- **PURCHASING DASHBOARD** remains the neutral return route.
- If the asset is `Ready for Resale`, the linked sale is not completed/paid, and the original valuation exists, show **OPEN CUSTOMER FINAL OFFER** → `admin-quote.html?id=<valuation_id>`.
- The progress label becomes **Final offer & payment** rather than **Send to Sales** until the customer purchase has completed.
- **SEND TO SALES** remains gated by the existing completed-and-paid backend and UI checks.

### First verified failure

The Product Workbench used generic Inventory/Sales/Sold Items navigation and continued to label the next stage as **Send to Sales** even when the live purchase was still in `inspection` with `payment_status='awaiting_final_quote'`.

### Do not regress

Do not treat `Ready for Resale` as a Sales handoff. It confirms physical inspection readiness only. The customer final-offer decision must happen before payment and before the existing Sales handoff gate.


### Payment-state follow-up

The final-offer CTA is shown only while the linked purchase is actually awaiting the final offer. A later state such as `payment_due` or `bank_details_received` must not reopen the final-offer action.

For `Ready for Resale` assets with an unfinished but already-accepted purchase, the Product Workbench shows **Complete customer purchase** as the next workflow stage and leaves payment handling to the existing Purchasing/Sale workflow.


### Customer acceptance popup: live migration parity failure — 9 September 2026

**Symptom:** customer account showed a final offer, but clicking acceptance returned **Offer is not available for acceptance**.

**First actual cause:** the offer had already been accepted, but production was still running the non-idempotent `accept_quote_offer` function. The intended idempotent migration existed in GitHub but was absent from Supabase migration history.

**Live state verified:**

- final offer status: `accepted`;
- quote item status: `accepted`;
- linked sale: completed/paid.

**Repair:** applied the idempotent acceptance function to Supabase and verified that repeated acceptance of an already accepted customer-owned offer returns `already_accepted=true`.

**Failure boundary:** do not weaken ownership or published-offer checks. Only a repeat request for the same customer-owned accepted offer is a harmless no-op.


## Completed purchase → Sales handoff boundary — 9 September 2026

**Live incident:** a DJI Mini 5 Pro had completed inspection, the customer had been paid, and the asset had been successfully moved to `Sent to Sales`, but the completed purchase still appeared under **ACTIVE PURCHASES** with **NO ACTION REQUIRED**.

**First actual failure:** `admin-purchasing.html` reuses `admin-sales.js`, and that shared controller loaded every unarchived sale. It did not distinguish a completed purchasing record from an active purchasing workflow record.

**Live state verified:**

- asset: `GCO-AEAA94E839`;
- asset status: `Sent to Sales`;
- previous status: `Ready for Resale`;
- `sent_to_sales_at` populated;
- linked purchase status: `completed`;
- payment status: `paid`.

The database handoff was already correct. The defect was presentation/query filtering.

**Repair:** on the Purchasing Dashboard, `admin-sales.js` now treats `paid`, `completed` and `cancelled` as terminal purchase states:

- **ACTIVE PURCHASES** shows only unfinished purchases;
- **PURCHASE ARCHIVE** shows terminal purchase history;
- terminal purchases are not given Sales archive/restore/delete controls from the Purchasing page;
- Purchasing navigation remains on Purchasing URLs rather than being rewritten to Sales URLs.

No database state, RPC, trigger or RLS policy was changed.


### Staff top-bar logo routing — corrected 9 September 2026

**Rule:** every staff top-bar GearCashOut logo returns to `admin.html`, the central permission-filtered Staff Dashboard.

The Staff Dashboard reads the signed-in staff member's authorised access from `staff_users`:

- `can_access_research`
- `can_access_purchasing`
- `can_access_sales`
- `can_access_customers`
- `can_manage_staff`
- `can_access_mail`

Do not infer the destination from the current workflow. The shared control point is `staff-navigation.js`; static pages without it must explicitly point their logo to `admin.html`.

**Failure checkpoint:** if every workflow logo appears to go to Sales, inspect the shared logo assignment and its cache version before changing individual page navigation.


### Purchasing inbound label → confirmation boundary — 9 September 2026

**User action:** save and email Customer → GearCashOut shipping label.

**Front-end:** `admin-purchasing.html` → shared `admin-sales.js` shipment handler.

**Expected flow:**

`Save inbound shipment`
→ shipment row recorded
→ `send-shipping-email`
→ customer receives label/QR
→ **Label sent to customer**
→ **Return to Purchasing Dashboard**
→ await delivery
→ **Item Received**.

**Do not route to Inventory immediately after sending a label.** The item is not yet physically received and must remain in the Purchasing/receipt workflow.

**Failure checkpoint:** if the email fails, do not show the success confirmation merely because the shipment row was saved.


### Final inspection → customer final offer — 9 September 2026

**User action:** staff complete the final inspection and technical testing in `inventory-detail.html`.

**Front-end:** `inventory-detail.html` → `inventory-workbench.js`.

**Expected flow:**

`Save final inspection/testing`
→ inspection/testing records saved
→ asset state reaches **Ready for Resale**
→ submit state becomes **INSPECTION COMPLETE**
→ linked purchase checked
→ if awaiting final offer: **MAKE FINAL OFFER**
→ `admin-quote.html?id=<valuation>`
→ customer acceptance/payment
→ purchase completion gate
→ only then **SEND TO SALES**.

**Failure checkpoint:** a physical Ready for Resale state does not itself authorise Sales handoff when the customer purchase is still awaiting its final offer.


---

## Purchasing pipeline count after actual Sales handover — 9 September 2026

### Symptom

**ACTIVE PURCHASES** was empty after an item was sent to Sales, but the Purchasing pipeline still showed **1 completed purchase** and the Payment & Completion notice showed **1 COMPLETED**.

### First actual failure

The earlier Active Purchases repair corrected the list in `admin-sales.js`, but `admin-purchasing.js` had a separate pipeline-count query that loaded all unarchived sales and counted terminal purchases without checking whether the linked inventory asset had already been handed over.

### Required data flow

`sales`
→ `inventory_assets.source_sale_id`
→ `inventory_assets.status='Sent to Sales'` or `sent_to_sales_at`
→ exclude the sale from **all Purchasing pipeline counts**.

### Repair

`admin-purchasing.js` now loads linked inventory handover state and derives `purchasingSales` by excluding any sale whose linked asset is already:

- `Sent to Sales`, or
- has `sent_to_sales_at`.

All Purchasing shipping, receipt, inspection, final-offer, payment and completed counters now use that filtered set.

### Regression rule

The Purchasing list and Purchasing pipeline counters are separate presentation paths. Test both after every handover change.

A completed purchase may remain in Purchasing before the physical Sales handover. After `Sent to Sales`, it must disappear from both the active list and all Purchasing counts.


---

## Payment completed → explicit Sales handover navigation — 9 September 2026

### User action

Staff confirms **PAYMENT SENT TO CUSTOMER**.

### Current data state

The payment RPC completes the customer purchase and creates/retains the linked inventory asset.

Typical state after payment:

- `sales.status = completed`
- `sales.payment_status = paid`
- `inventory_assets.status = Ready for Resale`

This does **not** mean the asset has already entered Sales.

### Page path

`admin-sale.html?id=<sale>`
→ `admin-sale-next-step.js`
→ lookup `inventory_assets` using `source_sale_id`
→ completed-purchase action panel.

### Visible options

1. **VIEW & SEND TO SALES** → `inventory-detail.html?id=<asset>`
2. **RETURN TO PURCHASING DASHBOARD** → `admin-purchasing.html`

### Boundary rule

Payment completion and Sales handover are separate events. The asset enters Sales only after the explicit Inventory handover updates its status to **Sent to Sales** and records `sent_to_sales_at`.

### Known fix history

The previous completed-sale panel only said that payment was complete and left unrelated Sales navigation in the page header. On 9 September 2026 this was simplified to the two workflow-relevant choices above.
