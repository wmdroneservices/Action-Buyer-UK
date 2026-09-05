# 2026-09-06 — MPB Reference-Only From → To Evidence Model

## Decision

MPB UK is not an automatic-pricing source. It is **Used / Other Evidence — Reference Only**.

A single exact MPB product page can aggregate several live used units. The system now stores that page as one pending evidence finding rather than creating one candidate per SKU.

## Data flow

Catalogue product
→ Deep Source MPB exact-page discovery
→ exact `/en-uk/product/...` page
→ extract all visible live unit prices and cosmetic conditions
→ calculate minimum and maximum
→ one pending `quote_catalog_ai_candidates` record

Stored pending facts:

- `reference_price_min`
- `reference_price_max`
- `observed_conditions`
- `observed_units_count`
- `reference_only = true`
- canonical direct MPB product URL

## Review

The main catalogue Pending Evidence section shows:

- red **P** pending marker;
- **From → To** range;
- conditions represented;
- units observed;
- direct **VERIFY LATEST MPB PRICES** link;
- editable From and To values before approval.

Approval:

`record_ai_candidate_manual_review`
→ `apply_accepted_ai_candidate`
→ one `quote_catalog_retailer_prices` reference-only row.

Denial leaves existing catalogue evidence unchanged.

## Live evidence fields

`quote_catalog_retailer_prices` now supports:

- `reference_price_min`
- `reference_price_max`
- `reference_conditions`
- `reference_units_observed`
- `reference_only`

The catalogue evidence editor exposes **From / selling price** and **To price (range)**.

## Protected rule

MPB evidence is informational market reference evidence only. It must never automatically alter:

- factory sealed price;
- opened-unused price;
- excellent price;
- good price;
- fair price;
- automatic pricing rules.

## Worker

Research worker version: **1.5.1**

The existing 1.5.0 MPB browser fallback remains in place for HTTP 403 exact-page collection.

## Verification completed

- GitHub worker syntax check: passed.
- Pending catalogue review JavaScript syntax check: passed.
- Catalogue editor JavaScript syntax check: passed.
- Supabase range/reference columns confirmed.
- Supabase `ai_research_submit_candidate` signature confirmed with range parameters.

## Next step

Update the Research PC working copy, run `npm install` if required by the previous 1.5.0 browser dependency update, restart the worker, then run **one controlled MPB product test** before starting the wider MPB audit.
