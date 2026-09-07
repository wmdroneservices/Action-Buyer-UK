# Deep Source dashboard completion-message repair

Date: 7 September 2026

## Symptom

A five-product Sony Deep Source audit against MPB completed in the database and the Research PC terminal, and the dashboard button returned to RUN DEEP SOURCE AUDIT. The message beneath the controls remained on the previous running state, showing 4/5 processed and 1 processing, until the page was manually refreshed.

## First actual failure

This was a dashboard presentation-state defect, not a queue, worker, Sony, DJI, MPB, or Gemma rule failure.

admin-ai-research.js correctly found no active Deep Source queue rows and called setDeepSourceAuditControls(null, []). That function reset the button and cancellation controls but deliberately left the existing message untouched. The stale live-progress text therefore remained visible.

## Repair

loadDeepSourceAuditState() now remembers the run ID observed as active in the current browser session. When that same run becomes terminal, the dashboard:

1. clears active controls;
2. displays completed, completed-with-errors, cancelled, or failed status;
3. keeps the Research PC state independent;
4. does not announce historical runs after a page refresh.

## Live evidence

Run 7dc6d17f-d140-4ff4-9e3a-a658baf7d410 completed with:

- products_targeted: 5
- products_checked: 5
- candidates_found: 10
- errors_count: 0

The stale message was therefore a UI-only transition defect.

## Files changed

- admin-ai-research.js
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
- docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md

## Next verification

Run another small Deep Source batch while leaving the browser open. Confirm that the final queue transition changes both the button and the message without a manual refresh.
