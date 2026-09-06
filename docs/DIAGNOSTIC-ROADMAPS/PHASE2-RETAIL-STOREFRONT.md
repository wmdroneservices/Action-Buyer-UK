# Phase 2 — Retail Storefront Developer Diagnostic Roadmap

**Status:** Initial infrastructure audited and implemented 6 September 2026.

## User action

Staff prepares a purchased inventory item for sale and publishes it to one or more sales channels, including the future branded retail website.

## Expected result

One central inventory asset remains authoritative while multiple resale listings/channels can operate simultaneously. If one channel records the item as sold, the existing central sold-state workflow protects the remaining channels.

## Diagnostic route

### Purchasing / inventory entry

1. Staff purchasing workflow creates or synchronises an inventory asset.
2. Current backend functions include:
   - `staff_create_inventory_from_paid_sale`
   - `staff_mark_item_received_and_sync_inventory`
   - `staff_mark_sale_paid_and_create_inventory`
   - `staff_send_inventory_to_sales`
3. Physical item record: `public.inventory_assets`.
4. Source links currently include `source_sale_id` and `source_quote_item_id`.
5. Phase 2 adds `catalog_product_id` for an explicit exact master-catalogue link.

### Catalogue and evidence

- Master product: `public.quote_catalog_products`.
- Market evidence: `public.quote_catalog_retailer_prices`.
- Sales read-only evidence route: `public.staff_sales_market_evidence(uuid)`.
- The RPC requires active staff with `can_access_sales=true`.
- Sales evidence is for pricing review only; it is not an editing or live-application route.

### Sales content

- Product-level reusable content: `public.catalog_sales_content`.
- Physical-item sales content and condition presentation: `public.inventory_sales_content`.
- Asset photographs/evidence already remain in `public.inventory_evidence`.

### Storefront configuration

- `public.sales_storefronts`: storefront identity/configuration.
- `public.sales_catalog_visibility`: manufacturer/category/product visibility override.
- Modes: `auto`, `show`, `hide`.
- Empty-category default is controlled per storefront.

### Multi-channel sales

- Channel/listing records: `public.resale_listings`.
- Listing readiness front-end: `listing-readiness.js`.
- Existing sold-state functions include:
  - `handle_resale_listing_sold`
  - `staff_mark_resale_listing_sold`
  - `sync_inventory_asset_when_resale_listing_sold`
- Do not create a separate website stock truth.

## Expected data path

Customer sale
→ purchasing workflow
→ `inventory_assets`
→ exact `catalog_product_id`
→ testing/preparation/evidence/pricing
→ `resale_listings` across one or more channels
→ future branded storefront as an additional channel
→ one channel sells
→ central inventory sold state
→ other channels follow existing close/delist protection.

## Failure checkpoints

1. Confirm inventory asset exists.
2. Confirm correct exact catalogue product link.
3. Confirm sales staff permission.
4. Confirm market evidence RPC returns expected rows.
5. Confirm condition/content is attached to the correct physical asset.
6. Confirm listing is connected to the central asset, not duplicated stock.
7. When sold, verify the central asset status changes first.
8. Verify remaining channel listings receive the existing delist/close action.

## Known implementation boundary

The public branded storefront repository and domain are intentionally not created yet because the retail brand/name is undecided. Backend infrastructure is brand-neutral and does not expose internal evidence, purchase costs or customer data publicly.


## Catalogue identity propagation — implemented 6 September 2026

### First traced creation point

The primary current inventory creation path is `staff_mark_sale_paid_and_create_inventory(p_sale_id,p_payment_reference)`. It reads `sale_items → quote_items` and creates `inventory_assets`.

### Current source limitation

`quote_items` currently carries manufacturer, model and package text rather than a direct catalogue UUID.

### Safe Phase 2 rule

`resolve_quote_item_catalog_product(uuid)` links only when the normalised manufacturer + model + package combination matches exactly one `quote_catalog_products` row.

- exactly one match → link automatically;
- zero matches → leave `catalog_product_id` NULL;
- multiple matches → leave `catalog_product_id` NULL.

No fuzzy matching, manufacturer-only matching or family-level matching is permitted.

### Backfill

`staff_backfill_inventory_catalog_links(limit)` can safely process existing unlinked inventory that has a source quote item. It applies the same exact-only rule.


## SKU and warehouse tracking — implemented 6 September 2026

### Identity model

Every physical `inventory_assets` row has a mandatory unique immutable SKU generated automatically:

`GCO-YYYY-######`

This is separate from `catalog_product_id`:

- catalogue ID = product type;
- SKU = one physical unit.

### Warehouse path

`inventory_locations` → approved storage locations

`inventory_location_movements` → movement audit trail

`staff_move_inventory_asset(asset, destination, movement type, notes)` → controlled movement operation.

### Creation routes

Both traced paid-sale inventory creation routes now use the SKU default, and the secondary `staff_create_inventory_from_paid_sale` route was also brought under the exact-only catalogue identity resolver.


## Central Outlet → Listing → SKU model — implemented 6 September 2026

### Data flow

`inventory_assets (one physical SKU) → resale_listings (many listings) → sales_outlets (where each listing belongs)`

### Outlet types

- `owned_storefront` — current/future retail or specialist websites;
- `marketplace` — eBay, Facebook Marketplace, Gumtree and similar;
- `auction` — reserved for the future auction platform;
- `other`.

### Critical existing protection preserved

`staff_mark_resale_listing_sold` remains the central sold operation. A sale marks the inventory asset Sold and competing listings Delist Required. The canonical `resale_listing_sold_warning` trigger remains; a duplicate insert warning trigger discovered during inspection was removed to avoid duplicate execution.

### Next investigation points

1. replace the hard-coded channel list in `sales-workbench.js` with the live `sales_outlets` registry;
2. add owned storefront/auction outlets only through the registry;
3. build the staff outlet-management view with active/inactive controls;
4. add stock-age and outlet-strategy reporting without changing sold-state truth;
5. keep public storefront repositories restricted to their own outlet's published inventory.


## Sales Workbench dynamic registry integration — implemented 6 September 2026

### Front-end entry point

`sales-workbench.js`

### Flow

Authenticated active staff → load inventory asset → load existing `resale_listings` → load active `sales_outlets` → render one block per active outlet → save listing with `asset_id + outlet_id`.

### Security controls

- active outlets filtered in database query;
- RLS enabled on `sales_outlets`, `resale_listings` and `inventory_assets`;
- staff authorization remains enforced server-side/database-side;
- sold state remains handled by the existing authoritative RPC/trigger path;
- no service-role secret is placed in browser code.

### Known next step

Build a management-only Outlet Registry interface rather than requiring direct database edits. It must use least privilege and must not allow ordinary sales staff to create arbitrary outlets.


## Management-only Outlet Registry — implemented 6 September 2026

### User action

Management staff → central Staff Dashboard → **OUTLET MANAGEMENT**.

### Front-end entry points

- `admin.html` — management-only navigation/card;
- `admin-outlet-management.html` — registry interface;
- `admin-outlet-management.js` — authenticated management guard and registry operations.

### Data/security path

Authenticated user → `staff_users` active + `can_manage_staff` check → `sales_outlets` RLS → permitted registry read/write.

### Preserved behaviour

Deactivation removes an outlet from the active Sales Workbench query without deleting historical outlet/listing relationships.

### Next investigation point

Add slow-moving stock and outlet-strategy reporting using inventory age and current listing/outlet coverage, without altering the authoritative sold/delist workflow.


## Slow-Moving Stock & Outlet Strategy — implemented 6 September 2026

### User action

Management → central Staff Dashboard → **SLOW-MOVING STOCK**.

### Front-end

- `admin-stock-strategy.html`
- `admin-stock-strategy.js`

### Database path

Management-authenticated user → `management_stock_strategy_report()` → `inventory_assets` + active `resale_listings` + `sales_outlets`.

### Strategy bands

- no active listing for sales-ready stock;
- 30+ days: review;
- 60+ days: expand outlets / price review;
- 90+ days: urgent strategy review;
- 120+ days: auction / exit review.

These are advisory only. No automatic stock movement, price change or listing closure occurs.

### Security/failure points

1. confirm authenticated management permission;
2. confirm RPC rejects non-management users;
3. confirm age uses `acquired_at` with `created_at` fallback;
4. confirm active listing counts use central listing statuses;
5. never use this report to create a second inventory truth.


## Outlet Coverage & Controlled Sales Handoff — implemented 6 September 2026

### User action

Management → Staff Dashboard → Slow-Moving Stock → inspect SKU coverage → **OPEN SALES WORKBENCH**.

### Data flow

`inventory_assets` SKU → active `resale_listings` → active `sales_outlets` comparison → coverage/missing-outlet report → existing `listing-readiness.html?id=<asset_id>`.

### Security boundary

The strategy RPC remains management-only. The Sales Workbench keeps its own authenticated staff checks and existing listing/sold-state workflow. The handoff carries only the asset ID in the URL; it does not grant extra permissions.

### Failure points

- outlet deactivation changes future coverage calculations but preserves history;
- listings without `outlet_id` remain visible through compatibility channel text but cannot satisfy a specific registry outlet match until associated;
- no automatic listing creation is permitted from this reporting layer.


## Sales Dashboard Management Attention — implemented 6 September 2026

### User action

Management → admin-sales-dashboard.html → **MANAGEMENT ATTENTION / Stock Strategy** → **OPEN STOCK STRATEGY**.

Ordinary sales staff continue to use the operational Sales Pipeline and What Needs Doing sections without receiving the management strategy panel.

### Front-end entry points

- admin-sales-dashboard.html
- admin-sales-dashboard.js
- style.css

### Database path

Authenticated active manager → management_stock_strategy_report() → inventory_assets + resale_listings + active sales_outlets.

### Expected data flow

Central inventory/listing/outlet truth → management-only strategy RPC → compact dashboard counts → explicit link to admin-stock-strategy.html → explicit management decision → existing controlled Sales Workbench.

### Security boundary

- dashboard panel is only requested/displayed for active management users;
- strategy RPC independently enforces active management permission;
- no service-role credential is used in browser code;
- hidden UI is not treated as the database security boundary.

### Failure points and test state

- live unsold inventory count was zero at implementation, so first real-stock verification remains required;
- active Outlet Registry currently exists independently of live inventory coverage testing;
- the panel must not be mistaken for an automatic workflow engine.


## Unified What Needs Doing Task Intelligence — implemented 6 September 2026

### User action

Staff → Main Dashboard / Purchasing Dashboard / Sales Dashboard → **What Needs Doing** → review priority → optionally filter work area → **FOCUS NEXT** or **VIEW** → existing workflow page.

### Shared front-end entry point

- live-task-board.js
- style.css

Loaded by:

- admin.html
- admin-purchasing.html
- admin-sales-dashboard.html

### Current authoritative data sources

The board reads existing records only:

- valuations
- sales
- shipments
- purchase_return_cases
- inventory_assets
- resale_listings
- customer_return_requests

### Priority logic

1. CRITICAL — forced immediate workflow risk.
2. PRIORITY — important operational action.
3. OVERDUE — age-based escalation.
4. CURRENT — recent workflow action.

The current forced CRITICAL rule is resale_listings.status = Delist Required.

### Expected data flow

Authoritative workflow tables → shared browser task collector → task identity/deduplication → priority ranking → summary counts → FOCUS NEXT → category filters → explicit existing workflow handoff.

No task-board action mutates the database.

### Known failure points

- a new workflow status must be deliberately added to the task map or it will not appear as an actionable task;
- broad client-side reads should be reviewed again as transaction volume grows;
- first real-world validation still depends on live purchases/inventory/listings entering each workflow branch;
- category filters are presentation-only and must never be mistaken for permission controls.


## Controlled Phase 2 Test Inventory — created 6 September 2026

### Purpose

Provide real-shaped Inventory and Sales records before genuine purchases begin flowing through the system.

### Current sample batch

**8 inventory assets**

- TEST-ASSET-001 — Ready for Resale
- TEST-ASSET-002 — Ready for Resale
- TEST-ASSET-003 — Repair Required
- TEST-ASSET-004 — Sent to Sales
- TEST-ASSET-005 — Sent to Sales / 120+ day slow-moving scenario
- TEST-ASSET-006 — Inspection Required
- TEST-ASSET-007 — Sent to Sales / multi-channel scenario
- TEST-ASSET-008 — Ready for Resale

**4 resale listings**

- Website Draft
- Website Published slow-moving scenario
- eBay Published
- Facebook Marketplace Delist Required

### Data flow under test

quote_catalog_products → controlled inventory_assets → production SKU generation → Inventory/Sales dashboards → resale_listings → What Needs Doing / Stock Strategy / future storefront testing.

### Cleanup path

Management → existing **Delete All Test Data** → reset_test_quote_data().

The verified function already deletes inventory_return_data → customer_return_requests → resale_transactions → resale_listings → inventory_assets → purchasing test workflow records.

### Safety rule

Do not run the destructive reset while genuine production data exists unless the reset architecture is first redesigned to target test records only. The current reset function is an environment-wide test reset, not a selective per-record test cleanup.


## Duplicate Listing Closure Control — repaired 6 September 2026

### User action

Sales Dashboard / What Needs Doing → **CLOSE OTHER MARKETPLACE LISTINGS NOW**.

### Front-end path

- `admin-sales-dashboard.js` → dedicated `delist-actions.html`;
- `live-task-board.js` → dedicated `delist-actions.html`;
- `delist-actions.js` renders the authoritative closure queue;
- `listing-readiness.html?id=<asset_id>` remains the explicit product handoff.

### Authoritative data flow

`resale_listings.status='Delist Required'`
→ affected `asset_id`
→ `inventory_assets` identity (SKU/product/asset reference)
→ all sibling `resale_listings` for that same asset
→ identify Sold sibling / all channel statuses
→ staff closes third-party listing manually
→ `staff_close_resale_listing(p_listing_id)`
→ listing becomes `Cancelled`.

### Repair history

The original handoff pointed to `sold-items.html#delist-actions`. That view was built around Sold/Returned inventory history and did not reliably provide context for every Delist Required row, particularly controlled test data. It also did not show sibling channels for the same SKU.

The repair introduces a dedicated closure page driven directly by the authoritative Delist Required queue and sibling listings.

### Controlled test state

TEST-ASSET-007 / GCO-2026-100016 is now configured as:

- eBay listing: Sold;
- inventory asset: Sold through eBay;
- Facebook Marketplace listing: Delist Required.

This gives the closure page a genuine multi-channel context test.

### Security

`staff_close_resale_listing` now requires an authenticated **active** staff user. Browser UI remains convenience only; the database RPC enforces the state transition.


## Product Workbench post-repair release — repaired 6 September 2026

### User action

Staff records a repair-required item, completes the repair, saves post-repair inspection/testing, then sends the item to Sales.

### Front-end

- `inventory-detail.html` → `inventory-workbench.js`;
- `asset-state-machine.js` defines legal transitions;
- `asset-state-actions.js` applies the controlled browser transition.

### First failure found

`inventory-workbench.js` only promoted `Testing` → `Ready for Resale` after passing tests.

When the asset remained `Repair Required`, passing post-repair tests were saved but no branch returned it to `Testing`, leaving the asset blocked.

### Repair

A passing post-repair save now performs `Repair Required` → `Testing` → `Ready for Resale` using the existing state-machine transitions, then the existing `staff_send_inventory_to_sales` RPC remains responsible for the final Sales handoff.

### Controlled test

TEST-ASSET-003 / GCO-2026-100012 exposed the fault: inspection and testing records passed, but the live asset remained `Repair Required`.


## Repair Required / post-repair testing workflow — implemented 6 September 2026

**User flow:** inspection or technical testing identifies a fault → asset enters `Repair Required` → staff sees the fault → staff records repair work/cost/provider/evidence → asset moves to `Testing` → post-repair testing → `Ready for Resale` → Sales.

**Front-end:** `inventory-detail.html` → `inventory-workbench.js`. The dedicated Repair Required panel renders only while the asset status is `Repair Required`; normal inspection/testing save is disabled while repair remains outstanding.

**Database:** `inventory_assets.status`, `inventory_testing`, new `inventory_repairs`, and linked `inventory_expenses` for repair cost. `staff_complete_inventory_repair(...)` checks active staff access, locks the asset, refuses any non-Repair Required state, records the repair and transitions to `Testing`.

**Failure prevention:** no generic Clear Repair Required control. The normal release path is recorded repair followed by post-repair testing.


## Repair workflow constraint alignment — 6 September 2026

**Known failure:** the Product Workbench repair form can correctly call `staff_complete_inventory_repair(...)`, but a non-zero repair cost previously failed at `inventory_expenses_category_check` because the database category list omitted `Repair`.

**First failure point:** `inventory_expenses` insert inside the secure repair RPC.

**Required contract:** keep `Repair` in `inventory_expenses.category` alongside Collection, Postage, Accessories, Replacement Parts, Cleaning, Testing, Preparation and Other. The repair RPC, expense UI and database constraint must remain aligned.
