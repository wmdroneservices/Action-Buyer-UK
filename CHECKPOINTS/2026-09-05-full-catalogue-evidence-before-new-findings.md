# Checkpoint — 2026-09-05 Full Catalogue Evidence Before New AI Findings

## What changed

The grouped AI product review was corrected so existing catalogue evidence is shown first and in full, rather than making the reviewer work from summary counters and then scroll past new findings to inspect current evidence.

### Review order

1. Matched catalogue product
2. Automatic buying prices and evidence summary
3. UK — NEW PRICING EVIDENCE
4. UK — USED / OTHER EVIDENCE
5. OVERSEAS COMPARISON (NON-GBP)
6. All new AI evidence grouped for that same product
7. Edit / review feedback
8. Submit to catalogue or deny

## Files changed

- admin-ai-research.js
  - Added full evidence row and bucket render helpers.
  - Split existing evidence into UK NEW, UK USED / OTHER and OVERSEAS.
  - Moved the complete current catalogue evidence block above new AI findings.
- admin-ai-research.html
  - Added styling for grouped current-evidence buckets.
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md

## Data source

No database schema or workflow change.

The review reads the existing catalogue evidence from:

quote_catalog_retailer_prices

using:

catalog_product_id

and displays all available fields needed for duplicate checking.

## Verification state

Implemented and JavaScript syntax checked.

Live browser verification is still required:

- confirm all current evidence rows appear individually;
- confirm UK NEW / USED / OVERSEAS grouping;
- confirm current evidence appears before new AI findings;
- regression-test save, deny and submit/apply.
