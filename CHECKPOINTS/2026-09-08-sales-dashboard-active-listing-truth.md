# Sales Dashboard Active Listing Truth Repair — 8 September 2026

## Restore protection

The restore branch `restore/sales-flow-checkpoint-2026-09-08-1931` and base commit `9e1520baa0df3c9245e1b19c3b635e0eab950455` remain untouched.

## First actual failure

`TEST-ASSET-003` has:

- `inventory_assets.status = 'Sent to Sales'`
- authoritative WEBSITE `resale_listings.status = 'Published'`

The public storefront and `active-sales-listings.js` correctly use `resale_listings`.

`admin-sales-dashboard.js` did not. It counted only physical assets whose status was `Listed` or `Reserved`, producing a false 0 Active Listings result and leaving the live asset in the Pre-Sale count.

## Repair

Sales Dashboard now:

1. loads `resale_listings` once;
2. treats Published rows as active/listed;
3. treats Reserved rows as reserved;
4. counts unique assets rather than duplicated outlet rows;
5. excludes assets with Published/Reserved channel listings from the Sent to Sales / Ready for Pre-Sale count.

## Existing behaviour preserved

- No Published listing was changed.
- No public storefront logic was changed.
- No asset lifecycle status was rewritten.
- Active Sales / Listings continues to use authoritative channel records.

## Current data note

Live database inspection found two Published WEBSITE test listings: `TEST-ASSET-003` and `TEST-ASSET-005`. The dashboard will therefore reflect authoritative live channel records rather than inventing a count of one. If only one should remain live, the second listing must be reviewed as a separate data-cleanup decision, not silently deleted by this dashboard repair.

## Browser verification

Hard reload the Sales Dashboard and verify:

- Published assets appear in Listed / Active Listings;
- Published assets no longer inflate Ready for Pre-Sale;
- TEST-ASSET-003 remains Published and visible on the retail storefront.
