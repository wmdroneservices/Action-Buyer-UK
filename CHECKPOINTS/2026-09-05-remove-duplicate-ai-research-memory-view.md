# GearCashOut Checkpoint — Remove Duplicate AI Research Memory View

Date: 5 September 2026

## User decision

The separate AI Research Centre section:

**RESEARCH MEMORY → Accepted and denied decisions**

was no longer needed because accepted and rejected evidence is already handled by the existing evidence review audit sections.

## Change implemented

Removed the duplicate visible dashboard section and its supporting front-end learning-table query/render path.

The following remain unchanged:

- accepted findings audit;
- rejected findings audit;
- applied evidence audit;
- individual manual review feedback;
- reasons and checked fields recorded for Gemma;
- Supabase structured learning in `quote_catalog_ai_learning`;
- research workflow use of that learning data.

## Files changed

- `admin-ai-research.html`
- `admin-ai-research.js`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`

## Supabase impact

No schema, RPC or data deletion was required.

This is a UI simplification. Existing structured learning records are preserved.

## Verification completed

- Current GitHub implementation inspected.
- Current Supabase checkpoint state inspected.
- The duplicate HTML section was removed.
- The unused `quote_catalog_ai_learning` front-end query/render path was removed from `load()`.

## Live verification required

1. Refresh the AI Research Centre.
2. Confirm the **Accepted and denied decisions** / **Research Memory** section is gone.
3. Confirm accepted, rejected and applied evidence sections still work.
4. Confirm individual manual review feedback still records decisions normally.
