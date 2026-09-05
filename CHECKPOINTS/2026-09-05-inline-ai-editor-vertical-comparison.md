# Checkpoint — Inline AI Editor and Vertical Catalogue Comparison

**Date:** 5 September 2026  
**Status:** Implemented and syntax-verified; live browser verification pending.

## Problem found

The AI Research Centre comparison was previously laid out in two columns:

- New AI finding on the left.
- Current catalogue evidence on the right.

The editable finding form was rendered separately after the comparison. With a long comparison panel, clicking **EDIT NEW FINDING** could make the editor appear not to open because it was rendered further down the expanded finding.

## Fix applied

The comparison is now a single vertical workflow:

1. **NEW AI FINDING — EDITABLE** appears first.
2. The full editable finding form is embedded directly inside this section.
3. The reviewer can edit price, exact product URL, condition, comparison bucket, availability, package/variant match, confidence, source and notes.
4. **CURRENT CATALOGUE EVIDENCE** appears underneath.
5. Manual Gemma review feedback and accept/deny controls remain below the comparison.
6. **OPEN FULL CATALOGUE EDITOR (NEW TAB)** remains available for deeper catalogue work.

## Code changes

### `admin-ai-research.js`

- Replaced the two-column comparison markup with `ai-comparison-stack`.
- Embedded `editorMarkup(c)` directly inside the compared new finding.
- Prevented the same editor being rendered again below the comparison.
- Kept save behaviour unchanged: edits write to the candidate and applied findings continue to use `sync_applied_ai_candidate`.

### `admin-ai-research.html`

- Replaced the two-column comparison CSS with a one-column vertical stack.
- Added inline editor spacing within the new-finding comparison card.

### Documentation

Updated:

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`

## Verification completed

- Current GitHub code inspected before change.
- Current Supabase project and project-memory checkpoint inspected.
- Existing manual review and Gemma feedback workflow preserved.
- No Supabase schema change required.
- `admin-ai-research.js` parsed successfully with JavaScript syntax verification.

## Next live test

1. Refresh the AI Research Centre.
2. Open a finding and click **COMPARE HERE WITH CATALOGUE**.
3. Confirm the new AI finding appears at the top.
4. Confirm the editable price and URL fields are immediately visible.
5. Edit a price or URL and click **SAVE FINDING**.
6. Confirm the comparison remains open with the updated values.
7. Confirm current catalogue evidence remains underneath.
8. Confirm manual accept and deny with Gemma feedback still work.
