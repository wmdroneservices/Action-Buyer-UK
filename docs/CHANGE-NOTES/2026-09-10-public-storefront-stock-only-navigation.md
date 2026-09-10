# 2026-09-10 — Public Storefront Stock-Only Navigation

## Requirement

The public retail website should only expose manufacturers, categories, models and products when there is at least one actual item currently available for sale on the WEBSITE outlet.

## First failure

The public browsing functions were visibility-aware but catalogue-driven. They could return catalogue manufacturers/categories/products even when there was no published WEBSITE stock for the corresponding catalogue product. The stock view itself was already based on published WEBSITE listings.

## Repair

Updated the public storefront functions so they join against currently saleable WEBSITE stock before exposing catalogue hierarchy or search results:

- `public_storefront_categories`
- `public_storefront_manufacturers`
- `public_storefront_manufacturer_categories`
- `public_storefront_category_manufacturers`
- `public_storefront_models`
- `public_storefront_catalog`

Saleable stock requires a published `resale_listings` row for the WEBSITE outlet, a non-Sold/non-archived `inventory_assets` row with a catalogue product ID, and an active WEBSITE outlet.

Existing manufacturer, manufacturer/category, category and product visibility overrides are still applied after stock eligibility. This means an item must satisfy both conditions: it must be for sale and it must be permitted by website visibility controls.

## Result

A manufacturer with no saleable WEBSITE stock disappears from the public manufacturer browsing. A category with no saleable stock disappears from category browsing. A model/product with no current saleable unit is not returned by the public catalogue/search hierarchy.

The master catalogue is not changed. Purchasing/valuation catalogue availability is not changed. Existing public visibility overrides are not changed.

## Live verification

At the time of deployment the live database reported:

- 1 published saleable WEBSITE unit with a catalogue product ID.
- 1 public manufacturer with current stock.
- 1 public category with current stock.
- 1 public catalogue result in the first catalogue page.
- Existing `sales_catalog_visibility` overrides remain unchanged.

Browser verification remains required.

## Related roadmap

`docs/DIAGNOSTIC-ROADMAPS/LIVE-WEBSITE-VISIBILITY-CONTROL.md`
