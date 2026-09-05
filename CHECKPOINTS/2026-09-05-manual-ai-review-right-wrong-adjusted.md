# Checkpoint — Manual AI Review Right / Wrong / Adjusted Outcomes

**Date:** 5 September 2026

## Purpose

Manual AI evidence review now tells Gemma whether each reviewed area was:

- AI WAS RIGHT;
- AI WAS WRONG;
- ADJUSTED.

This replaces the previous ambiguity where a checkbox only meant that the reviewer had looked at a field.

## UI

Updated:

- `admin-ai-research.js`
- `admin-ai-research.html`

Review areas:

1. Price
2. Product / model / package match
3. Exact URL / product page
4. Condition
5. Availability
6. Source / retailer
7. Evidence category

Default: **NOT CHECKED**.

## Data flow

`admin-ai-research.js` sends structured field outcomes to:

`record_ai_candidate_manual_review(...)`

Supabase stores:

- `reviewed_fields`
- `changed_fields`
- `before_values`
- `after_values`
- new `field_outcomes`
- review reason
- reviewer
- timestamp

Actual saved edits are compared against the original candidate. Changed values are automatically classified as **adjusted** for the relevant review area, so a corrected price, URL, retailer/source, category or product/package detail is not lost from Gemma's feedback.

## Gemma learning

`quote_catalog_ai_learning` now receives:

- decision;
- field;
- outcome: correct / wrong / adjusted;
- reason;
- exact before value;
- exact after value;
- candidate ID;
- feedback ID.

Learning keys include the outcome so correct and wrong lessons do not overwrite each other.

## Acceptance and denial

The structured outcome is recorded for both:

- accepted evidence submitted to live catalogue evidence;
- denied evidence.

The existing live-evidence authority remains unchanged:

`apply_accepted_ai_candidate(uuid)`

No buying-price automation was changed.

## Supabase

Applied live migration:

`ai_manual_review_field_outcomes`

Repository migration:

`supabase/migrations/20260905195000_ai_manual_review_field_outcomes.sql`

## Verification completed

- Current GitHub review UI inspected.
- Existing manual feedback RPC inspected before change.
- Live Supabase table and function inspected before change.
- Live Supabase migration applied successfully.
- `admin-ai-research.js` compiled with `new Function(...)` successfully before commit.
- Existing evidence-application workflow preserved.

## Live browser test still required

1. Mark PRICE as AI WAS RIGHT and deny a finding.
2. Mark URL as AI WAS WRONG and deny a finding.
3. Edit a price, save it, then submit — confirm feedback records `price: adjusted` and exact before/after values.
4. Edit exact URL and source/retailer, save, then submit — confirm both are recorded as adjusted.
5. Check `quote_catalog_ai_candidate_review_feedback.field_outcomes`.
6. Check the corresponding `quote_catalog_ai_learning` rows.
7. Confirm accepted evidence still reaches `apply_accepted_ai_candidate(uuid)`.
