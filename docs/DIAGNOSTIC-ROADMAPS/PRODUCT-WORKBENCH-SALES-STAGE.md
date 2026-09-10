# Developer Diagnostic Roadmap — Product Workbench Sales Stage

**Status:** Added 10 September 2026 after live browser verification exposed a remaining Purchasing Dashboard control in the generated Product Workbench header.

## User action

Staff open a Sales-stage inventory asset in **Product Workbench**.

For an item that has already reached Sales, Product Workbench is the Sales-stage product record. It must not provide a route back to the Purchasing Dashboard.

## Front-end path

`inventory-detail.html`
→ `inventory-workbench.js`
→ generated Product Workbench header
→ `inventory-sales-channels.js`

### Current files

- `inventory-detail.html` — page entry and script loading.
- `inventory-workbench.js` — builds the Product Workbench product header and workflow presentation.
- `inventory-sales-channels.js` — Sales-channel panel and post-sale sold-price correction; also contains the defensive runtime removal of any legacy Purchasing Dashboard anchor.
- `inventory-sales-handoff.js` — Sales-stage handoff presentation.

## First verified failure — 10 September 2026

The earlier repair removed the static Purchasing Dashboard link from `inventory-detail.html`, but the live screenshot still showed the button.

Inspection of the current `inventory-workbench.js` identified the actual remaining source: the Product Workbench header was generating its own `admin-purchasing.html` anchor at runtime.

Therefore the first actual failure was **generated front-end markup in `inventory-workbench.js`**, not the static HTML page.

## Repair

The smallest safe repair was made without changing inventory or purchasing data:

1. `inventory-sales-channels.js` now defensively removes any `a[href="admin-purchasing.html"]` inside `#asset-detail` and observes later DOM insertions, so the generated legacy link cannot remain visible.
2. `inventory-detail.html` now uses a new Sales Channels script cache version: `v=20260910-sold-price-edit-2`.
3. The Product Workbench's existing Sales channel, sold-price correction, inspection history and Sales handoff behaviour are otherwise unchanged.

The static `inventory-detail.html` itself contains no Purchasing Dashboard anchor.

## Supabase path

No database change is required for this UI-only routing repair. The affected Product Workbench continues to read:

- `inventory_assets` for authoritative asset status;
- `resale_listings` for Sales-channel records;
- `sales_outlets` for configured outlets;
- `staff_users` for active staff access.

## Expected rule

Once an item has passed to Sales, Product Workbench must not route staff back to Purchasing. Purchasing Dashboard remains available through the appropriate Purchasing workflow pages where it is still required.

## Failure checkpoints

1. Purchasing Dashboard still appears → inspect `inventory-workbench.js` for generated `admin-purchasing.html` markup and confirm the Sales Channels cleanup script is loaded.
2. Static HTML contains the link → inspect `inventory-detail.html`; the page entry must not contain the Purchasing Dashboard anchor.
3. Sales channel panel fails after cleanup → inspect `inventory-sales-channels.js` for syntax/load errors before changing database logic.
4. Sold price correction fails → inspect `staff_correct_sold_price(...)`; this is independent of the navigation cleanup.

## Verification state

- Current GitHub `inventory-detail.html` no longer contains the static Purchasing Dashboard link.
- Current GitHub `inventory-sales-channels.js` contains the runtime cleanup and refreshed cache target.
- Browser screenshot before this repair showed the remaining generated link.
- A fresh browser/cache verification is still required after GitHub Pages deployment; no database state was changed by this repair.
