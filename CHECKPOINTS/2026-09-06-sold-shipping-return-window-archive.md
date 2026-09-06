# Checkpoint — Sold Shipping, Return Window and Archive

**Date:** 6 September 2026

## User decision

Replace the single operational **Sold** state with:

`Sold - Awaiting Shipping → Sold - Shipped → post-sale return hold → Archived`

The archive is grouped by UK tax year and remains non-destructive for accounting and research.

## Implemented

- Live Supabase migration `sold_shipping_return_window_archive` applied.
- Added inventory fields: `return_window_ends_at`, `archived_at`, `archive_tax_year`.
- Added `gco_uk_tax_year(...)` and `staff_archive_sales_asset(...)`.
- Sale now enters **Sold - Awaiting Shipping**.
- Carrier collection moves the asset to **Sold - Shipped**.
- Delivery starts a 30-day operational return hold.
- Customer returns require a delivered shipped item.
- Archive requires completed hold and no open customer return.
- Added Post-Sale UI and separate `sales-archive.html` grouped by UK tax year.
- Updated state machine, dashboard, live tasks and staff navigation.

## Current verification required

1. Browser-test a new sale through **Sold - Awaiting Shipping**.
2. Record carrier/tracking.
3. Mark collected and verify **Sold - Shipped**.
4. Mark delivered and verify return-window date.
5. Test customer return request.
6. Test archive path after an eligible test window or controlled test data.

## Relevant roadmap

`docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`
