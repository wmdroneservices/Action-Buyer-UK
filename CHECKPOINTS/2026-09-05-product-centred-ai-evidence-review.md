# GearCashOut Checkpoint — Product-Centred AI Evidence Review

Date: 5 September 2026

## Problem corrected

The previous review UI was still organised around individual AI findings. This meant multiple evidence items linked to the same catalogue product appeared as separate cards and required repeated opening/comparison actions.

The required workflow is product-centred, not finding-centred.

## Current review layout

Pending findings are grouped by `quote_catalog_ai_candidates.catalog_product_id`.

Opening one matched catalogue product now shows one complete review workspace:

### Block 1 — NEW AI EVIDENCE — EDITABLE

All pending evidence linked to that catalogue product is displayed together.

Each evidence item includes:

- editable title;
- comparison price;
- condition;
- verified comparison bucket;
- availability;
- package/variant checks;
- match confidence;
- source/retailer;
- exact product URL;
- research notes;
- reviewed-field feedback;
- reason/correction notes for Gemma;
- submit-to-catalogue action;
- deny-with-reason action.

### Block 2 — CURRENT CATALOGUE EVIDENCE

The current live evidence for the same product is loaded automatically from:

`quote_catalog_retailer_prices`

The block displays retailer, type, condition, price, region, availability, exact source and check time.

## Behaviour removed from the normal review path

The reviewer no longer needs to:

- click a separate **COMPARE HERE WITH CATALOGUE** action;
- click **VIEW EVIDENCE** for the already linked catalogue product;
- open another page simply to see the matched catalogue evidence.

The product is opened once and the complete evidence context is displayed.

## Decision workflow preserved

For each individual evidence item:

1. Save any correction.
2. Record what was checked and the reason for changes.
3. **SUBMIT TO CATALOGUE EVIDENCE** records manual review feedback, accepts the candidate and calls `apply_accepted_ai_candidate(uuid)`.
4. **DENY WITH REASON** records the rejection for Gemma learning.

No schema change was required.

## Files changed

- `admin-ai-research.js`
- `admin-ai-research.html`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- this checkpoint

## Live database state checked before change

The current DJI Mini 3 Fly More Combo Plus catalogue product:

`9d84d1de-ba6a-4904-b7ef-dd05959eed23`

had multiple pending AI findings linked to it, confirming the need for grouped product review.

The current live evidence table and existing manual-review/apply functions were inspected before changing the UI.

## Verification required

1. Hard refresh the AI Research Centre.
2. Open the DJI Mini 3 grouped product review.
3. Confirm all pending new evidence for that product appears inside one NEW AI EVIDENCE block.
4. Confirm CURRENT CATALOGUE EVIDENCE loads automatically underneath.
5. Edit and save one test finding.
6. Confirm the product review remains open after save.
7. Test deny with a reason.
8. Test submit to catalogue evidence and confirm the existing manual-review/apply workflow still writes correctly.
