# Active Sales RLS Visibility Repair — 8 September 2026

## Restore protection

The dedicated restore branch `restore/sales-flow-checkpoint-2026-09-08-1931` remains untouched.

## Symptom

A genuinely Published DJI Mini 5 Pro listing was visible on the GearCashOut public storefront, but the Sales Dashboard still showed:

- 0 Listed;
- No Active Listings.

## First actual failure

The JavaScript dashboard logic was already querying and counting `resale_listings.status='Published'`.

The database table `public.resale_listings` had RLS enabled but no authenticated staff SELECT policy. As a result, the browser received an empty listing set.

## Repair

Added:

`resale_listings_sales_staff_select`

Visibility requires an active staff account with either Sales access or staff-management access.

## Verification

A simulated authenticated eligible staff context can now read the current Published rows and returns:

- 2 Published listing rows;
- 2 distinct Published assets.

`TEST-ASSET-003` remains:

- Inventory status: `Sent to Sales`;
- WEBSITE listing status: `Published`;
- public storefront: live.

No listing or inventory record was rewritten.

## Important count note

The dashboard counts products, while an individual Active Sales item can show how many sales channels it is listed on. `TEST-ASSET-003` currently has one Published WEBSITE channel row.

A separate Published test asset (`TEST-ASSET-005`) also exists and was deliberately not changed by this repair.
