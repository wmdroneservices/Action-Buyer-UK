# Developer Diagnostic Roadmap — Sales-Channel Listing Links

**Status:** Audited against current GitHub and live Supabase on 10 September 2026.

## User action

Staff open a product in the Product Workbench after it has reached the Sales stage and either:

- open the published GearCashOut website product directly; or
- enter the live URL for an external listing such as eBay, Amazon or Facebook Marketplace.

## Expected result

- **Website:** the Product Workbench provides a direct **VIEW ON WEBSITE** destination for the exact published `resale_listings.id`.
- **External marketplace:** once a URL is entered, the page immediately offers **OPEN LIVE LISTING ↗**. After the channel record is saved, **VIEW ON <CHANNEL>** uses the same stored URL.
- URLs without `http://` or `https://` are normalised to HTTPS before being stored or opened.

## Front-end route

`inventory-detail.html`
→ `inventory-workbench.js`
→ `inventory-sales-channels.js`

The sales-channel controller reads the active `sales_outlets` and `resale_listings` rows for the selected `inventory_assets.id`.

## Supabase objects

### Tables

- `inventory_assets`
- `inventory_sales_content`
- `sales_outlets`
- `resale_listings`

### Website URL rule

The authoritative website URL is:

`sales_outlets.public_base_url + /product.html?listing=<resale_listings.id>`

unless an explicit `resale_listings.listing_url` exists.

The current live WEBSITE outlet is configured with:

`https://wmdroneservices.github.io/GearCashOut-Retail-Storefront`

The storefront `product.html` reads the `listing` query parameter and calls `public_storefront_listing('retail', listing_id)`.

## External URL rule

Staff enter the actual published marketplace destination into the **LIVE LISTING LINK** field.

The value is stored in:

`resale_listings.listing_url`

The Product Workbench now normalises a missing scheme to HTTPS and validates that the resulting URL is HTTP/HTTPS before opening or saving it.

## First failure identified — 10 September 2026

The existing implementation already had the correct database field and an existing **VIEW ON <CHANNEL>** button after a URL was saved. However:

1. the WEBSITE outlet had `public_base_url = NULL`, so the existing derived website URL could not be generated;
2. the external marketplace input was only converted into a clickable button after a saved `listing_url` existed;
3. typing/pasting a live URL into the field did not immediately provide a clickable destination;
4. an external URL without a scheme could be stored as a value that was not safe to use directly as an absolute link.

The first failures were therefore configuration/UI URL handling, not the `resale_listings` schema.

## Minimal repair

### Database configuration

Configured the existing active owned-storefront outlet:

- outlet code: `WEBSITE`
- outlet type: `owned_storefront`
- `public_base_url = https://wmdroneservices.github.io/GearCashOut-Retail-Storefront`

No listing, inventory or sales data was changed.

### Code

`inventory-sales-channels.js` now:

- normalises external URLs to HTTPS when no scheme is supplied;
- validates only HTTP/HTTPS destinations;
- displays **OPEN LIVE LISTING ↗** immediately while staff type/paste a valid URL;
- saves the normalised external URL into `resale_listings.listing_url`;
- keeps the existing **VIEW ON WEBSITE** derived-link behaviour;
- keeps the existing **VIEW ON <CHANNEL>** behaviour for saved external URLs.

`inventory-detail.html` cache-bust was advanced to ensure the repaired controller is loaded by the browser.

## Verification

Live Supabase confirmed:

- active WEBSITE outlet exists;
- WEBSITE `public_base_url` is now the verified Gear1 Outpost storefront base URL;
- a current Published WEBSITE listing exists with authoritative listing ID `2d17f9fc-19fd-4c41-a259-08243e9340ac`;
- `public_storefront_listing('retail', <listing id>)` resolves the published DJI Osmo Action 6 Adventure Combo.

The direct product destination for that listing is therefore:

`https://wmdroneservices.github.io/GearCashOut-Retail-Storefront/product.html?listing=2d17f9fc-19fd-4c41-a259-08243e9340ac`

### Browser test still required

Hard-refresh `inventory-detail.html` and verify:

1. the Website card shows **VIEW ON WEBSITE**;
2. clicking it opens the exact product, not the shop home page;
3. entering an eBay/Amazon/Facebook Marketplace URL immediately shows **OPEN LIVE LISTING ↗**;
4. clicking the preview opens the entered listing;
5. saving the channel record preserves the normalised URL;
6. after reload, **VIEW ON <CHANNEL>** opens the same destination.

Do not change marketplace API integrations as part of this repair. The system intentionally records manually published external URLs rather than pretending that an API connection exists.
