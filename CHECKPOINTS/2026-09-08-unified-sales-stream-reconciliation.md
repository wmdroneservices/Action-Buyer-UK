# Unified Sales Stream Reconciliation — 8 September 2026

## First verified failure

The Sales Dashboard had already been repaired to count active products from authoritative `resale_listings.status`, but the separate `inventory-sales.js` queue still treated every `inventory_assets.status='Sent to Sales'` asset as ready-to-list work.

This allowed one product to appear in both:

- Ready to List / Pre-Sale queue; and
- Active Listings.

## Live regression case

Current Supabase state for:

- SKU: `GCO-2026-100012`
- Product: DJI Mini 5 Pro
- Asset status: `Sent to Sales`
- WEBSITE listing: `Published`

This is valid under the existing physical lifecycle model, but the UI must classify it by channel state:

- Published/Reserved → Active Listings
- Sent to Sales with no Published/Reserved row → Ready to List

## Repair

Updated:

- `inventory-sales.js`
- `inventory-sales.html`
- `admin-sales-dashboard.html`
- `admin-sales-dashboard.js`

The Ready to List queue now excludes any Sent to Sales asset with a Published or Reserved `resale_listings` row.

Published/reserved products therefore remain in Active Listings only.

Sold products remain in the post-sale workflow. A `Delist Required` record is treated as an urgent closure exception, not as a normal ready-to-list state.

## Database

No database rows or working listing statuses were rewritten.

The existing central truth remains:

- `inventory_assets` — physical lifecycle;
- `resale_listings` — per-channel sales state;
- `staff_mark_resale_listing_sold(...)` — central sold transition;
- `staff_close_resale_listing(...)` — external closure completion.

## Documentation updated

- Human/Developer System Handbook
- AI Operating Manual
- Inventory Repair and Sales Workflow Diagnostic Roadmap
- Supabase project-memory event/checkpoint layer

## Browser verification required

Hard refresh the Sales Dashboard and Ready to List page.

Expected:

1. DJI Mini 5 Pro appears in Active Listings.
2. It does not appear in Ready to List.
3. Mavic 3 Pro / DJI Neo remain in Ready to List only while they have no Published/Reserved channel row.
4. A sold item follows Sold Items/post-sale and does not return to the normal ready-to-list queue.
