# Checkpoint — 5 September 2026 — Manual AI Review Feedback and Denial Learning

## User requirement implemented

The AI evidence review workflow now supports two distinct decision paths.

### 1. Bulk workflow

- Tick multiple findings.
- **ACCEPT SELECTED**
- **DENY SELECTED**
- No individual reason prompt.
- No invented reason is presented to Gemma as detailed feedback.

Bulk decisions remain available for speed.

### 2. Individual manual workflow

Inside an individual finding:

- tick the evidence areas reviewed;
- explain what was changed or why the evidence is being rejected;
- **ACCEPT WITH REVIEW NOTES**; or
- **DENY WITH REASON**.

When side-by-side catalogue comparison is open, the acceptance action is:

**ACCEPT & ADD TO LIVE EVIDENCE**

This records the manual review first and then uses the existing `apply_accepted_ai_candidate(uuid)` path.

## Structured review areas

The reviewer can tick:

- price;
- URL / exact product link;
- condition;
- product/model match;
- package/variant;
- evidence bucket;
- availability;
- source/retailer.

## Supabase implementation

New table:

`quote_catalog_ai_candidate_review_feedback`

It stores:

- candidate ID;
- accepted/rejected decision;
- review mode;
- human reason;
- explicitly reviewed fields;
- automatically detected changed fields;
- before values;
- effective after values;
- reviewer;
- timestamp.

New RPC:

`record_ai_candidate_manual_review(uuid,text,text,jsonb)`

Rules:

- manual denial requires a reason;
- if edited evidence differs from the original, manual acceptance requires a reason;
- changed fields are detected automatically;
- structured learning is written/upserted into `quote_catalog_ai_learning`.

## Important separation

Do not merge the feedback function into `apply_accepted_ai_candidate(uuid)`.

The first records the human review and Gemma learning. The second remains the existing authority for writing accepted evidence into `quote_catalog_retailer_prices`.

## Files changed

- `admin-ai-research.js`
- `admin-ai-research.html`
- `supabase/migrations/20260905174000_ai_candidate_manual_review_feedback.sql`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`

## Verification completed

- Supabase migration applied successfully.
- New table/function inspected after migration.
- JavaScript syntax parsed successfully.

## Browser verification still required

1. Refresh AI Research Centre.
2. Open a finding.
3. Tick review fields and add a reason.
4. Test manual acceptance without applying.
5. Test side-by-side direct accept/apply.
6. Test manual denial without a reason — it should block.
7. Test manual denial with a reason.
8. Test bulk deny — there should be no reason prompt.
9. Confirm review feedback and AI learning rows are created.
