# Developer Diagnostic Roadmap — Live Stock & Sales Workflow

**Status:** Implemented from current GitHub and live Supabase inspection — 9 September 2026.

## User action

From the Sales Dashboard, staff click **OPEN LIVE STOCK & SALES**.

## Front-end entry points

- `admin-sales-dashboard.html` — Step 1 link.
- `sales-stock-workflow.html` — live unified view.
- `sales-stock-workflow.js` — data loading, stage calculation and collapsible product rendering.

## Expected data flow

Sales Dashboard
→ `sales-stock-workflow.html`
→ authenticated staff check through `auth.js` / `staff_users`
→ load `inventory_assets`
→ load `resale_listings`
→ load `sales_fulfillments`
→ group listings and fulfilments by physical `inventory_assets.id`
→ calculate one current stage per physical SKU
→ render one collapsible product record
→ refresh live data every 5 seconds while the page is visible.

## Authoritative database objects

### Physical stock

Table: `inventory_assets`

Relevant fields inspected:

- `id`
- `sku`
- `asset_reference`
- `manufacturer`
- `model`
- `status`
- `purchase_price`
- `approved_resale_price`
- `current_location`
- `transaction_number`
- `sent_to_sales_at`
- `sold_at`
- `sold_price`
- `sold_channel`
- `archived_at`

### Sales channels

Table: `resale_listings`

Relevant fields inspected:

- `id`
- `asset_id`
- `sales_channel`
- `listing_reference`
- `status`
- `asking_price`
- `published_at`
- `sold_at`
- `sold_price`
- `listing_url`

Active listing statuses are **Published** and **Reserved**.
Prepared/non-live listing statuses include **Draft**, **Ready For Listing** and **Delist Required**.

### Post-sale fulfilment

Table: `sales_fulfillments`

Relevant fields inspected:

- `asset_id`
- `status`
- `carrier`
- `tracking_number`
- `updated_at`

The page displays the latest fulfilment record for the physical asset.

## Stage rules

The unified page deliberately uses the central physical-SKU model rather than creating duplicate inventory records for individual channels.

Priority is:

1. `Returned` → **Returned**
2. sold asset/listing → **Sold / post-sale**
3. any `Published` or `Reserved` listing → **Live sale**
4. `Sent to Sales` with no active listing → **Sent to Sales — awaiting listing**
5. prepared listing (`Draft`, `Ready For Listing`, `Delist Required`) → **Sales queue**
6. inventory preparation status → **Stock in preparation**

This prevents the known contradiction where an asset remains physically `Sent to Sales` but already has a `Published` listing. The listing is authoritative for live sales presentation.

## UI behaviour

- One physical SKU is rendered once even when it has multiple channel listings.
- Each product is an independently collapsible `<details>` record.
- The closed header shows current stage, product, SKU/asset reference and live count or approved resale price.
- Expanding a product shows Stock, Sales and Post-sale information.
- Existing listing records are shown beneath the product, with **MANAGE LISTING** and, where available, **VIEW LISTING**.
- Existing product workbench remains available through **OPEN PRODUCT**.
- Archived assets are excluded from the live operational view.

## Failure checkpoints

1. **Page opens but is empty:** inspect authenticated staff access first, then the three Supabase queries.
2. **Live NEEWER listing is shown as queue:** inspect `resale_listings.status` for the SKU before changing `inventory_assets.status`.
3. **Duplicate product appears:** inspect grouping by `inventory_assets.id`; one physical asset must produce one product record.
4. **Listing missing:** query `resale_listings` by `asset_id` and check RLS.
5. **Post-sale status missing:** inspect `sales_fulfillments` by `asset_id` and the latest `updated_at` record.
6. **Dashboard link still opens `inventory.html`:** inspect the deployed `admin-sales-dashboard.html` version and browser cache.

## Known fault history

The previous Step 1 link opened `inventory.html`. That page intentionally showed only purchase-inventory statuses. When all products had already moved to Sales, it correctly showed no purchase inventory, but this made the Sales Dashboard link appear to do nothing.

The NEEWER GP-30 incident also established that `inventory_assets.status='Sent to Sales'` must not be treated as proof that the product is still waiting to be listed. `resale_listings.status='Published'` is the authoritative active-listing signal.

## Verification state

**Implemented:** Yes.

**Live database inspected:** Yes — current physical/listing/fulfilment schema and current stock/listing state inspected on 9 September 2026.

**Browser verification:** Required next. Confirm:

- Sales Dashboard Step 1 opens `sales-stock-workflow.html`.
- NEEWER GP-30 appears once and is labelled **Live sale** because its Website listing is `Published`.
- Any `Sent to Sales` item without a `Published`/`Reserved` listing is labelled **Sent to Sales — awaiting listing**.
- Expanding a product reveals its channel records.
- Refreshing the page does not create duplicate product records.
