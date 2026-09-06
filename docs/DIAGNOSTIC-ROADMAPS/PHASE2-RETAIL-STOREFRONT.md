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
