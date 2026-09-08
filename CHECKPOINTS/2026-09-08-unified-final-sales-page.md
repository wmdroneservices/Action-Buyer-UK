# Unified Final Sales Page — 8 September 2026

## Restore context

Preserve restore branch restore/sales-flow-checkpoint-2026-09-08-1931 and base commit 9e1520baa0df3c9245e1b19c3b635e0eab950455.

## Implemented model

For Sent to Sales items, inventory-detail.html is the single operational listing page.

The listing editor uses:

- pre-filled manufacturer/product description;
- staff item description;
- staff condition description;
- missing parts;
- battery count;
- customer and staff photographs with explicit selection for sale;
- additional photographs;
- sale price;
- postage and packing.

Customer-declared condition remains historical reference only. Staff condition_grade remains authoritative for resale.

## Photograph storage

New field:

inventory_sales_content.listing_photo_paths jsonb

It records exactly which customer or staff Storage paths are approved for sale listings. Source customer photographs are not deleted when deselected.

## Channel behaviour

WEBSITE publishes directly from the shared listing data.

Other active sales outlets are available below the editor.

staff_mark_resale_listing_sold:

1. marks the successful listing Sold;
2. marks other open listings for the same asset Delist Required;
3. moves the asset to Sold - Awaiting Shipping.

WEBSITE disappears from public stock automatically because the public storefront RPC only returns Published WEBSITE records.

No external marketplace closure API was found in the inspected current system. Therefore external closures remain manual warnings until a real API/Edge Function integration exists.

## Regression guards

- Do not reintroduce a separate editable Sales Workbench.
- Do not use customer condition as resale condition.
- Do not delete customer source photographs merely because they are not selected for sale.
- Do not claim automatic marketplace closure without a verified integration.


### Item-specific manufacturer text safeguard
Manufacturer/product description can be pre-filled from catalog_sales_content, but saving an individual Product Workbench listing now stores the edited text only on inventory_sales_content. An item-level correction must not overwrite the shared catalogue description for every future item of that model.
