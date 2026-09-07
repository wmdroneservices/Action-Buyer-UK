# 2026-09-07 — Public Retail Storefront Stage 1

## Starting state inspected

- latest shared project memory/checkpoint;
- current `wmdroneservices/Action-Buyer-UK` repository;
- Phase 2 Retail Storefront Diagnostic Roadmap;
- live Supabase sales/catalogue schema;
- current sales outlets and listing statuses.

AI Research/Gemma work was confirmed to be in the separate research/evidence workflow and was not modified.

## Decision

Create a separate public website repository while keeping one central Supabase platform.

New repository:

`wmdroneservices/GearCashOut-Retail-Storefront`

The website is a second public channel over the existing catalogue, inventory and sales backend.

## Implemented

### Public website repository

Created Stage 1 foundation:

- `index.html`;
- `shop.html`;
- responsive `style.css`;
- Supabase publishable-key client;
- complete catalogue browsing;
- manufacturer selection;
- category selection;
- product search;
- pagination;
- temporary development branding;
- public storefront diagnostic roadmap.

### Central catalogue

Verified current source catalogue:

- **3,845 products**;
- **73 manufacturers**.

The source remains:

`public.quote_catalog_products`

No duplicate product database was created.

### Manufacturer visibility

Existing:

`sales_catalog_visibility`

continues to control manufacturer/category/product visibility.

Modes:

- `auto`;
- `show`;
- `hide`.

All manufacturers are enabled by default through `auto`. A management hide decision removes the manufacturer from the public storefront without deleting catalogue data.

### Safe public read model

Added:

- `public_storefront_manufacturers(text)`;
- `public_storefront_catalog(text,text,text,text,integer,integer)`.

These expose safe catalogue presentation data only.

They do not expose:

- purchase prices;
- internal notes;
- customer data;
- staff data;
- market evidence.

### Availability

Public availability is derived from:

`Published resale_listings`
→ `WEBSITE sales_outlet`
→ linked unsold `inventory_assets.catalog_product_id`.

The public website does not create a second stock truth.

## Verification

Live Supabase checks confirmed:

- 73 manufacturers in the source catalogue;
- 3,845 products in the source catalogue;
- public manufacturer RPC returns the complete manufacturer set;
- catalogue RPC paginates safely with a maximum page size of 500;
- final catalogue page remains reachable.

## Documentation

Updated:

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`;
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`;
- `docs/DIAGNOSTIC-ROADMAPS/PHASE2-RETAIL-STOREFRONT.md`.

## Next steps

1. deploy/preview the separate storefront repository;
2. add a management UI for manufacturer/category/product visibility;
3. add product detail pages;
4. add shared customer authentication UI;
5. connect live purchasable inventory;
6. build basket/checkout/order workflow;
7. choose final brand and domain without changing the central backend architecture.
