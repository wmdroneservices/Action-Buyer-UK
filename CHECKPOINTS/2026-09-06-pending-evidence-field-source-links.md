# Checkpoint — 6 September 2026 — Pending evidence field-level source verification links

## What changed

The Automatic Quote Catalogue pending AI evidence review now places direct source-page links beside the verification work that requires checking the live source.

## UI behaviour

For each pending evidence candidate with a valid source URL, the reviewer now sees **OPEN SOURCE PAGE** beside:

- FROM / TO PRICE RANGE;
- PRODUCT / MODEL / PACKAGE;
- EXACT PRODUCT PAGE URL.

The editable **Exact source URL** field also has an **OPEN / VERIFY PAGE** shortcut.

The existing bottom shortcut remains available and is renamed **OPEN / VERIFY SOURCE PAGE** so it works correctly for MPB and non-MPB sources.

## Data flow

`quote_catalog_ai_candidates.source_url`

or edited source URL

→ `admin-catalog-pending-ai-review.js`

→ field-level navigation shortcut

→ source opens in a new browser tab.

No database value is changed by opening a source page.

## Preserved behaviour

- pending evidence remains outside `quote_catalog_retailer_prices` until accepted;
- field outcomes remain NOT CHECKED / AI WAS RIGHT / AI WAS WRONG / ADJUSTED;
- save/edit logic is unchanged;
- accept still uses `record_ai_candidate_manual_review(...)` followed by `apply_accepted_ai_candidate(...)`;
- denial still leaves live catalogue evidence unchanged.

## Supabase

No schema, RPC, RLS or Edge Function change was required.

## Verification target

Open a pending MPB evidence card and confirm the source page can be opened directly from the price, product/package and exact-URL verification areas without scrolling to the bottom action row.
