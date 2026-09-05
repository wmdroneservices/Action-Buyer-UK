# Checkpoint — 5 September 2026 — Inline AI Evidence Comparison

## What changed

The AI Research Centre now supports an in-place side-by-side comparison between a proposed AI finding and the existing live catalogue evidence.

### Previous behaviour

`COMPARE WITH CATALOGUE PRODUCT` navigated away from the AI Research Centre to:

`admin-catalog.html?product=<catalog_product_id>`

This worked, but the reviewer lost the active AI finding from view and had to use browser Back to return.

### Current behaviour

`COMPARE HERE WITH CATALOGUE` keeps the finding open and loads:

- the proposed AI evidence from `quote_catalog_ai_candidates`; and
- current live evidence from `quote_catalog_retailer_prices` for the same `catalog_product_id`.

The reviewer can see both sides together.

## Available actions

- OPEN NEW EVIDENCE PAGE
- EDIT NEW FINDING
- ACCEPT & ADD TO LIVE EVIDENCE
- OPEN FULL CATALOGUE EDITOR (NEW TAB)
- CLOSE COMPARISON

## Direct apply path

The single-finding action:

1. marks the finding accepted if it is still pending;
2. calls `apply_accepted_ai_candidate(uuid)`;
3. writes the evidence through the existing database function;
4. records `applied_at` and `applied_evidence_id` on the candidate.

No buying-price calculation was changed.

## Files changed

- `admin-ai-research.js`
- `admin-ai-research.html`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`

## Verification

- JavaScript syntax check: passed.
- Existing live `apply_accepted_ai_candidate(uuid)` definition inspected and confirmed as the write path.
- Live browser verification: still required.

## Next test

1. Refresh AI Research Centre.
2. Open a finding.
3. Click COMPARE HERE WITH CATALOGUE.
4. Confirm new evidence and existing catalogue evidence appear side by side.
5. Confirm source links work.
6. Confirm EDIT NEW FINDING still works.
7. Use ACCEPT & ADD TO LIVE EVIDENCE on a suitable test finding and confirm it appears in the live evidence list.
8. Confirm the finding moves out of pending review.
