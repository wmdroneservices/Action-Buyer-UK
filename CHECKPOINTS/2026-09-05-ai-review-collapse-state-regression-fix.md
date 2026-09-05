# 2026-09-05 — AI Review Collapse-State Regression Fix

## Problem observed

Live browser testing found that grouped product review panels in **Review, edit and decide** could be opened but were no longer reliably collapsible. Opening two or three reviews made the page increasingly long because the reviewer could not close a completed panel and move cleanly to the next one.

## First failure identified

The grouped review uses native `<details>` controls. The existing opening path:

1. set `activeProductReviewId`;
2. immediately called `render()` while the browser was opening the native details control;
3. loaded current catalogue evidence asynchronously;
4. called `render()` again.

This allowed application re-renders to race the browser's native details state. A delayed render could recreate a review as open after the user had tried to close it.

## Repair

Updated `admin-ai-research.js`:

- `openProductReview(...)` no longer forces a synchronous render during the native opening transition;
- current catalogue evidence is loaded only when not already cached;
- the post-load render occurs only when the same review is still active;
- closing the details panel clears the active review state, so an in-flight load cannot reopen it.

Updated `admin-ai-research.html` to use a new cache-busted script version.

## Files changed

- `admin-ai-research.js`
- `admin-ai-research.html`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- this checkpoint

## Supabase impact

No schema, RPC, RLS or Edge Function change.

Verified relevant current backend state remains:

- current catalogue evidence source: `quote_catalog_retailer_prices`;
- manual review authority: `record_ai_candidate_manual_review(...)`;
- live evidence application authority: `apply_accepted_ai_candidate(uuid)`.

## Verification required

Live browser test:

1. Open one grouped product review and close it.
2. Open two or three different reviews and confirm each can collapse independently.
3. Close a review while catalogue evidence is still loading and confirm it stays closed.
4. Open another normal or Amazon review after closing the previous one.
5. Regression-test existing catalogue evidence editing.
6. Regression-test **SUBMIT TO CATALOGUE EVIDENCE**.
7. Regression-test **DENY WITH REASON**.

## Current state

**Implemented; awaiting live browser verification.**
