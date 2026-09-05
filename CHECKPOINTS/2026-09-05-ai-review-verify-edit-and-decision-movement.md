# AI Evidence Review — Verify, Edit and Move Decisions

Date: 5 September 2026

## User requirement

The AI Research Centre must let the reviewer stay on one grouped product review page, see all existing evidence, open the source website to verify it, correct any objective saved information, then compare every new AI finding.

Manual actions must not appear to do nothing.

## First failure identified

The previous manual workflow waited for the optional live-evidence apply step before the reviewer could see the queue move. If that step was slow or failed, the finding could remain visibly in Requires Attention even though the review decision had already been saved.

The existing evidence editor also did not expose every objective field returned by the current evidence query, and overseas prices were displayed with the generic GBP formatter.

## Repair

### admin-ai-research.js

- Added direct OPEN / VERIFY source links for current catalogue evidence.
- Added visible exact source URL links.
- Added currency-aware evidence price display.
- Expanded inline editing to include currency, original selling price, VAT basis, VAT rate and checked timestamp in addition to the existing evidence fields.
- Changed manual submit/deny flow so the review decision is saved and the queue reloads immediately.
- Accepted evidence moves out of Requires Attention before optional live application.
- Apply failure is reported separately and does not silently undo the accepted decision.
- Added visible inline manual-review status text.

### admin-ai-research.html

- Added styling for manual review status and long source URLs.
- Updated Evidence Review guidance to state that current evidence appears first and can be opened, verified and edited.
- Bumped the JavaScript cache version.

## Data flow

Current catalogue evidence:

quote_catalog_retailer_prices → grouped AI review → OPEN / VERIFY → inline EDIT → save → refresh comparison cache.

New AI evidence:

quote_catalog_ai_candidates → record_ai_candidate_manual_review(...) → Accepted or Denied → optional apply_accepted_ai_candidate(...) → quote_catalog_retailer_prices.

## Protected behaviour

- No Supabase schema change.
- No automatic buying-price logic changed.
- Existing apply_accepted_ai_candidate(...) remains the authority for creating live evidence.

## Verification

- Current GitHub code inspected.
- Current Supabase functions inspected.
- JavaScript syntax check passed after the repair.
- Live browser verification remains required for:
  1. source links opening the correct website;
  2. editing an existing evidence row and seeing the refresh;
  3. deny moving immediately to Denied;
  4. submit moving immediately out of Requires Attention and applying to live evidence.
