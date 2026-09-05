# 2026-09-05 — AI Review Decision Movement and Inline Existing Evidence Editing

## Problem observed

During live testing, **SUBMIT TO CATALOGUE EVIDENCE** and **DENY WITH REASON** could appear to do nothing. The user could not tell whether processing had started, and a successful review/apply sequence could leave the visual state unclear.

A second requirement was identified: current catalogue evidence shown above the new AI findings must itself be correctable in place. Existing saved evidence can be wrong, and forcing the reviewer to leave the grouped comparison makes duplicate checking and correction unnecessarily slow.

## Repair

### Manual decision flow

Updated `admin-ai-research.js` so individual manual actions now:

1. disable the clicked action and show a processing label;
2. save structured Gemma review feedback;
3. for acceptance, attempt the existing `apply_accepted_ai_candidate(uuid)` workflow;
4. reload the review queue immediately after the review decision;
5. move the finding out of **Requires Attention** as soon as the decision is saved;
6. clearly report a partial failure when review saving succeeded but live application failed.

The existing review RPC and live-application function remain authoritative.

### Existing evidence editing

Added inline editing for rows loaded from `quote_catalog_retailer_prices`.

Each current evidence row now has **EDIT**, with an in-place editor for:

- retailer;
- type;
- condition;
- sell price;
- buy price;
- availability;
- buy method;
- evidence region;
- exact source URL;
- notes.

Saving updates the existing row, refreshes the cached product evidence and redraws the grouped comparison.

## Files changed

- `admin-ai-research.js`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`

## Supabase impact

No schema change was required.

Verified current database state:

- `quote_catalog_retailer_prices` has a staff UPDATE RLS policy;
- `record_ai_candidate_manual_review(...)` remains the manual review authority;
- `apply_accepted_ai_candidate(uuid)` remains the live evidence application authority.

## Verification required

Live browser test:

1. Deny one finding with a reason and confirm it immediately leaves Requires Attention and appears in Denied.
2. Submit one valid finding and confirm the button visibly processes and the finding leaves Requires Attention.
3. If live application succeeds, confirm the evidence appears in the catalogue comparison.
4. Edit an existing UK NEW, UK USED / OTHER or OVERSEAS evidence row.
5. Save it and confirm the row refreshes in place without leaving the grouped review.
6. Confirm the corrected row can then be compared against the pending AI findings.
