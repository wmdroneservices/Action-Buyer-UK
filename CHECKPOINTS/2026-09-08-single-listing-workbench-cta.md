# Single Listing-Workbench CTA — 8 September 2026

## Restore protection

The dedicated restore branch `restore/sales-flow-checkpoint-2026-09-08-1931` remains untouched.

## First actual issue

The Pre-Sale / Channels page displayed two buttons for each sales item:

1. OPEN SALES WORKBENCH → `listing-readiness.html?id=<asset_id>`
2. PRODUCT WORKBENCH → `inventory-detail.html?id=<asset_id>`

The first route is now a compatibility redirect into the second route. They were therefore duplicate operational choices.

## Minimal repair

Removed the visible OPEN SALES WORKBENCH button.

The single visible action is now:

OPEN PRODUCT WORKBENCH → `inventory-detail.html?id=<asset_id>`

`listing-readiness.html` remains available for compatibility with old links/bookmarks, but must not be presented as a competing workbench.

## Verification

- no OPEN SALES WORKBENCH CTA remains in `inventory-sales.js`;
- no Pre-Sale card links to `listing-readiness.html`;
- one OPEN PRODUCT WORKBENCH CTA remains;
- cache version for `inventory-sales.js` was updated.
