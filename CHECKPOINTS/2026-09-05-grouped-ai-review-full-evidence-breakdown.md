# 2026-09-05 — Grouped AI Review Full Evidence Breakdown

## Problem found

A grouped AI review could display a matched catalogue product as having no UK evidence even when the Quote Catalogue contained a valid evidence row.

The immediate example was DJI Mini 3 — Fly More Combo Plus (DJI RC-N1), with one existing DJI UK Store market evidence row. Its evidence_region was UK but its price_currency was NULL.

The grouped review summary previously required both UK region and GBP currency before counting a row as UK evidence. That made the summary misleading.

## Fix

Updated admin-ai-research.js so the grouped review snapshot now classifies every current catalogue evidence row into:

1. UK NEW pricing evidence
2. UK USED / OTHER evidence
3. OVERSEAS comparison evidence
4. Total current evidence records

Classification now uses the catalogue row's evidence/price region first and only falls back to GBP where no region is present.

The complete current evidence table remains visible underneath with retailer, evidence type, condition, sell price, buy price, availability, buy method, region, exact source, notes and checked time.

Automatic buying prices remain separate and correctly show a dash where the catalogue product has not yet been priced.

## Files changed

- admin-ai-research.js
- admin-ai-research.html
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md

## Data / workflow impact

No schema change.

No candidate decision, manual review, denial, acceptance or evidence-application workflow was changed.

## Verification

Database inspection confirmed the DJI Mini 3 Fly More Combo Plus (DJI RC-N1) row has one valid existing UK evidence record with a blank price currency, which explains the previous false no-UK-evidence summary.

The cache version was bumped so the browser loads the corrected review script.

## Next live test

Refresh the AI Research Centre and open the DJI Mini 3 Fly More Combo Plus (DJI RC-N1) grouped review.

Expected result:

- the current catalogue snapshot counts the existing UK evidence
- UK NEW, UK USED / OTHER and OVERSEAS categories are all represented when records exist
- the full evidence table still shows every row
- new AI findings remain grouped and editable above the current catalogue evidence
- save, deny and submit/apply behaviour remains unchanged
