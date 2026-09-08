# Existing Live Listing Continuity — 8 September 2026

## Restore protection

The dedicated restore branch `restore/sales-flow-checkpoint-2026-09-08-1931` remains untouched.

## First actual issue

`TEST-ASSET-003` is a genuine Published WEBSITE listing but has no populated `inventory_sales_content` row.

The new unified Product Workbench originally preferred item-level sales content only, with only limited asset fallbacks. That meant an older working listing could appear partly blank in the new editor even though `resale_listings` already contained the authoritative title and price.

## Minimal repair

`inventory-sales-handoff.js` now loads existing channel listings and uses the current Published listing as a fallback for:

- listing title;
- sale price;
- postage/shipping cost;
- listing description.

`inventory-sales-channels.js` uses the same existing listing fallback when updating a channel.

After staff save the unified workbench, `inventory_sales_content` becomes the preferred item-level source.

## End-to-end state verified

For `TEST-ASSET-003`:

Inventory asset
→ status `Sent to Sales`

Unified Product Workbench
→ can now inherit existing live listing values safely

WEBSITE resale listing
→ `Published`

Public storefront query
→ returns the DJI Mini 5 Pro with title, £749.99 price and staff condition `fair`.

## No destructive data changes

No live listing was deleted, unpublished or recreated.
No asset lifecycle status was rewritten.
