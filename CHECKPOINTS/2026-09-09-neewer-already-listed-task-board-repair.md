# NEEWER Already Listed — Sales Task Board Repair — 9 September 2026

## Reported behaviour

The Sales Dashboard showed NEEWER GP-30 as **Prepare and list for sale** / Ready to List even though the same physical SKU was already present in Active Listings.

## First failure identified

Live Supabase state was checked before changing anything:

- SKU: `GCO-2026-100024`
- Product: NEEWER GP-30
- `inventory_assets.status = 'Sent to Sales'`
- `resale_listings.status = 'Published'`
- `resale_listings.sales_channel = 'Website'`

The physical inventory status was not the fault. The listing was genuinely live.

`live-task-board.js` generated the **Prepare and list for sale** task from `inventory_assets.status = 'Sent to Sales'` without first checking whether the physical asset already had a Published or Reserved `resale_listings` row.

## Minimal repair

`live-task-board.js` now builds `activeListingAssetIds` from Published/Reserved resale listings and suppresses the Sent to Sales preparation task when the same physical asset already has an active listing.

The inventory asset remains `Sent to Sales`. This preserves the central multi-channel model:

`inventory_assets → resale_listings → sales_outlets`

The listing record is authoritative for whether the item has been listed; the inventory record remains authoritative for the physical SKU/lifecycle state.

## Browser cache repair

`admin-sales-dashboard.html` now loads the task board as:

`live-task-board.js?v=20260909-listing-aware-1`

so the browser receives the repaired implementation rather than retaining the previous cached task logic.

## Expected result

For NEEWER GP-30:

- **Active Listings:** 1
- **Prepare and list for sale:** 0
- **What Needs Doing:** no Prepare and list for sale task for this SKU

## Regression rule

Never change `inventory_assets.status` simply to hide a duplicate dashboard task. When an asset is already live, inspect `resale_listings` first and make the task board respect the authoritative channel state.

## Related files

- `live-task-board.js`
- `admin-sales-dashboard.html`
- `admin-sales-dashboard.js`
- `active-sales-listings.js`
- `inventory-sales-channels.js`
- `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`
- `docs/DIAGNOSTIC-ROADMAPS/PHASE2-RETAIL-STOREFRONT.md`

## Verification status

Repository repair committed. Live Supabase state verified before repair. Browser hard-refresh verification remains the next test: reload Sales Dashboard and confirm the NEEWER preparation task disappears while Active Listings remains 1.
