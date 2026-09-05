# GearCashOut Checkpoint — Full-Width AI Comparison Layout

Date: 5 September 2026

## User feedback

The AI Research Centre still looked column-based during live browser use. The user wanted a clear single-page comparison where the proposed AI evidence is a full-width block above the current catalogue evidence, rather than having to read information across multiple columns.

## First failure identified

The comparison panel itself had already been changed to a vertical stack.

However, `renderCandidateCard(...)` still rendered the normal expanded finding body before the comparison:

1. catalogue product column;
2. AI evidence column;
3. action column.

That meant comparison mode still visually started with a three-column layout before the vertical comparison.

## Repair

When `comparingCandidateId` matches the finding:

- the normal `.ai-finding-body` is not rendered;
- the comparison panel becomes the only expanded finding content;
- NEW AI FINDING — EDITABLE is the first full-width block;
- CURRENT CATALOGUE EVIDENCE is the next full-width block;
- manual review feedback remains underneath.

The normal multi-column finding view is retained when comparison mode is not active.

## Cache protection

The `admin-ai-research.js` version query string in `admin-ai-research.html` was updated so browsers load the corrected JavaScript instead of retaining the previous cached implementation.

## Files changed

- `admin-ai-research.js`
- `admin-ai-research.html`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`

## Supabase impact

None. This is a front-end rendering correction. Existing candidates, evidence, manual review feedback and Gemma learning remain unchanged.

## Live verification required

1. Refresh the AI Research Centre with the new script version.
2. Open one finding.
3. Click **COMPARE HERE WITH CATALOGUE**.
4. Confirm the old three-column body disappears.
5. Confirm NEW AI FINDING — EDITABLE spans the available page width.
6. Confirm editable price and URL fields are visible in that top block.
7. Confirm CURRENT CATALOGUE EVIDENCE spans the same width directly underneath.
8. Confirm manual accept and deny controls remain available.
