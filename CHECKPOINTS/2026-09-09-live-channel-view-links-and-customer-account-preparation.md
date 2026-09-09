# Live Channel View Links and Unified Customer Account Preparation — 9 September 2026

## User requirement

Staff need to open the exact public listing after an item is sent to the GearCashOut website or an external marketplace.

- Website: automatic View on Website link.
- Marketplace: staff paste the live marketplace URL, then View on eBay / View on Marketplace etc.
- Next major phase: one customer account showing both items the customer sold to GearCashOut and items the customer bought from the retail website.

## Current-state audit

### Listing architecture

Authoritative chain:

`inventory_assets → resale_listings → sales_outlets`

Live database confirms:

- `resale_listings.listing_url` already exists.
- WEBSITE outlet exists and is active.
- a live Published WEBSITE listing exists for the current test asset.
- that listing currently has `listing_url = NULL`.
- WEBSITE outlet currently has `public_base_url = NULL`.

### First actual gap

The newer unified Product Workbench channel UI had no field for staff to store an external marketplace URL and no direct View action. Active Sales / Listings also did not expose the existing listing URL.

## Repair implemented

### Product Workbench

`inventory-sales-channels.js` now:

- loads `sales_outlets.public_base_url`;
- provides a LIVE LISTING LINK field for external marketplaces;
- saves that value into `resale_listings.listing_url`;
- shows VIEW ON <CHANNEL> when an external URL exists;
- derives a WEBSITE view URL from the configured outlet base URL plus `/product.html?listing=<listing_id>` when the WEBSITE outlet is configured.

### Active Sales / Listings

`active-sales-listings.js` now loads outlet configuration and exposes:

- VIEW ON WEBSITE for configured WEBSITE destinations;
- VIEW ON <CHANNEL> for external listings with a stored live URL.

### Cache refresh

Updated:

- `inventory-detail.html` channel script version;
- `active-sales-listings.html` script version.

## Important configuration dependency

Do not invent the public retail domain. The live WEBSITE outlet currently has no `public_base_url` configured. Once the real retail storefront URL is known/configured, the WEBSITE link generation is ready to use the authoritative listing ID.

## Customer dashboard preparation finding

The existing `account.html` already uses the authenticated customer profile and shows the sell-to-GearCashOut side: valuations, accepted/purchase progress and completed transactions.

Retail purchase history cannot yet be treated as the same authoritative customer-account stream because the current `resale_transactions` structure records `buyer_name` and `buyer_email` but has no authenticated `buyer_user_id` link.

Before building the combined customer dashboard, add an authenticated customer identity relationship for retail orders/transactions. Do not join sensitive account history purely by matching email text as the long-term authority.

## Documentation updated

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`

## Verification still required

1. Hard refresh Product Workbench and Active Sales / Listings.
2. Enter a real eBay/marketplace URL and confirm the View button opens the exact listing.
3. Configure the real WEBSITE `public_base_url`.
4. Confirm a Published WEBSITE listing opens the exact `product.html?listing=<listing_id>` page.
5. Then design the combined customer dashboard around authenticated customer identity for both selling and buying histories.
