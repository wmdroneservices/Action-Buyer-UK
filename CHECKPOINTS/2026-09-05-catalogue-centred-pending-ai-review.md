# 2026-09-05 — Catalogue-Centred Pending AI Evidence Review

## User requirement

AI research findings should not arrive as a large separate evidence dump. Each finding should appear on its relevant catalogue product, in the correct evidence area, clearly marked pending, while remaining out of live pricing until approved.

The main catalogue must also show a top-level warning and product/manufacturer dropdown for anything requiring review.

## Implementation

### Front-end

Added:

- `admin-catalog-pending-ai-review.js`
- cache-busted script reference in `admin-catalog.html`
- pending review styles in `admin-catalog.html`

### Main catalogue warning

The catalogue now loads pending rows from:

`quote_catalog_ai_candidates`

where:

- `decision = 'pending'`
- `applied_at is null`

It shows:

- total pending evidence;
- total affected products;
- manufacturer grouping;
- product dropdown;
- direct open of the affected catalogue product.

Products in the scrolling catalogue list receive a red **P PENDING** badge.

### Product review workspace

When an affected product is opened, pending AI evidence is inserted directly beside the existing live evidence table.

It is grouped into:

1. UK — NEW
2. UK — USED / OTHER
3. OVERSEAS

Each candidate has:

- red P marker;
- exact product title;
- price;
- condition;
- source;
- editable evidence fields;
- exact URL;
- package and variant checks;
- field-by-field review dropdowns;
- review/correction reason;
- open exact source;
- accept and add to catalogue;
- deny and keep catalogue as is.

### Safety boundary

No pending candidate is written directly into:

`quote_catalog_retailer_prices`

Acceptance path:

`save candidate edits`
→ `record_ai_candidate_manual_review`
→ `apply_accepted_ai_candidate`
→ live catalogue evidence.

Denial path:

`record_ai_candidate_manual_review(... rejected ...)`

The existing live catalogue remains unchanged.

## Existing architecture preserved

- AI candidate history preserved.
- Review feedback and Gemma learning preserved.
- Current live evidence editor preserved.
- Automatic pricing remains insulated from unapproved findings.
- No new Supabase table was required.

## MPB audit readiness

The catalogue-side pending review workflow is now in place.

Deep Source MPB results should therefore enter as pending candidates and appear on the relevant product with the red P marker, rather than being treated as live evidence automatically.

## Verification note

The queue had previously been cleared, so there may currently be no pending candidate to render until the first new research run produces findings.
