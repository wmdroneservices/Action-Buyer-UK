# Change Note — Sales-channel direct listing links

**Date:** 10 September 2026

## User requirement

The Product Workbench must provide a direct link to the exact GearCashOut product when a WEBSITE listing is live. For eBay, Amazon and other external marketplace records, a URL entered by staff must become clickable and must open the actual listing.

## First actual failure

The database already contained `resale_listings.listing_url` and the existing UI already supported external VIEW ON <CHANNEL> links after a URL had been saved. The failure was that:

- the active WEBSITE outlet had no `public_base_url`, so the existing website URL derivation could not produce a destination;
- an external URL typed into the field did not become clickable until a saved listing record existed;
- URL values were not normalised before use, so a pasted address without a scheme could become an invalid relative link.

## Live database state inspected

Active WEBSITE outlet:

- `outlet_code = WEBSITE`
- `outlet_type = owned_storefront`
- configured base: `https://wmdroneservices.github.io/GearCashOut-Retail-Storefront`

Current Published WEBSITE listing:

- listing ID: `2d17f9fc-19fd-4c41-a259-08243e9340ac`
- title: DJI Osmo Action 6 Adventure Combo
- `listing_url` is null, so the authoritative website destination is derived from the listing ID.

The live `public_storefront_listing('retail', listing_id)` function was verified to resolve this listing.

## Repair

`inventory-sales-channels.js` now:

- validates HTTP/HTTPS URLs;
- automatically prefixes HTTPS when staff omit the scheme;
- shows **OPEN LIVE LISTING ↗** immediately when a valid external URL is entered;
- stores the normalised URL in `resale_listings.listing_url`;
- retains the existing WEBSITE direct-product URL derivation and external VIEW ON <CHANNEL> controls.

`inventory-detail.html` now cache-busts the repaired controller.

## Database impact

Only the existing WEBSITE outlet configuration was changed. No inventory, listing, sale or customer transaction records were modified.

## Verification status

- GitHub code repair: implemented.
- WEBSITE outlet configuration: applied.
- Live storefront RPC: verified against a current Published listing.
- Browser verification: pending hard refresh and click/input test.

## Regression protection

Do not replace the existing `resale_listings`/`sales_outlets` architecture with product-name slugs or guessed marketplace URLs. The WEBSITE listing UUID remains authoritative, while external marketplace URLs must be the actual URLs supplied by staff.
