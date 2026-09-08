# 2026-09-08 Final Product Workbench Listing Stage

## Decision

The final Sales handoff must remain one Product Workbench page. Inspection history and purchase facts are not editable at this stage; listing preparation is.

## Implemented

### Read-only history

The Sales handoff now displays:

- original customer condition;
- original customer condition / exception note where available;
- condition after inspection;
- inspection result;
- TESTED / INSPECTED when an inspection/testing record exists;
- inspector identity from the recorded staff/profile audit identity;
- inspection date;
- price paid as reference only.

The base editable inspection/testing section is removed for Sales handoff statuses.

### Master listing

One editable shared listing area now contains:

- manufacturer / product description where catalogue content is linked;
- individual listing description;
- listing title;
- sale price;
- postage and packing.

New live fields on `inventory_sales_content`:

- `listing_title`
- `asking_price`
- `postage_packing`

Existing `inventory_assets.description` and `approved_resale_price` are synchronised for compatibility.

### Photographs

Staff can view, add, remove and select the individual-item hero photograph from the same final listing page.

### Sales channels

- WEBSITE is first and publishes directly through `resale_listings.status='Published'`.
- Marketplaces follow underneath.
- Each marketplace uses one `ADD TO MARKETPLACE` action and is recorded as submitted/live through the same central Published listing state.
- Draft and Ready to Upload are not normal operating stages.

## Files changed

- `inventory-detail.html`
- `inventory-sales-handoff.js`
- `inventory-sales-channels.js`
- `supabase/migrations/20260908190000_add_unified_product_listing_master_fields.sql`
- both system manuals
- Inventory Repair and Sales Workflow Diagnostic Roadmap

## Database

Live Supabase migration applied:

`add_unified_product_listing_master_fields`

## Verification

- JavaScript syntax checked successfully after the updates.
- Live Supabase confirmed all three new columns.
- Existing inspector identity data confirmed for current Sent to Sales test assets.
- Real browser end-to-end verification remains the next step.

## Important regression guards

1. Do not restore a separate per-item Sales Workbench.
2. Do not make final-stage inspection or purchase-price history editable.
3. Do not write listing title to `inventory_assets`.
4. Do not restore Draft / Ready to Upload as the normal marketplace flow.
5. Keep WEBSITE first and use the shared master listing for every channel.
