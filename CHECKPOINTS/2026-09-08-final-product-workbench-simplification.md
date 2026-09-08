# 2026-09-08 Final Product Workbench Simplification

## Restore safety

Base restore remains:

- branch: restore/sales-flow-checkpoint-2026-09-08-1931
- commit: 9e1520baa0df3c9245e1b19c3b635e0eab950455

## Final operational flow

Inventory asset
→ Product Workbench final listing editor
→ Save resale information and photographs
→ Send to Website
→ Add to Marketplace for each additional outlet
→ Mark Sold through the actual outlet
→ other channel rows become Delist Required

## Listing-stage fields

- Listing title, pre-filled from manufacturer + model + package.
- Manufacturer/product description where available.
- Item-specific resale description.
- Detailed staff condition description.
- Battery count.
- Missing items.
- Exact buyer package contents.
- Sale price.
- Postage and packing.
- Listing photographs.

Customer valuation condition remains historical reference only. Staff condition remains the resale condition.

## Closure behaviour

The existing staff_mark_resale_listing_sold RPC marks every other active channel listing Delist Required.

- WEBSITE: automatically disappears from public GearCashOut stock because the public storefront only returns Published WEBSITE listings.
- External marketplaces: manual closure warning until a real verified API integration exists. No false claim of automatic closure.

## Regression guard

Do not recreate a second product editor or Draft/Ready-to-Upload workflow.
