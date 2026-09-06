# 6 September 2026 — Deep Source Audit live run controls

## Problem observed

A live MPB Deep Source Audit was visibly processing in the Research PC PowerShell window, but the dashboard still displayed **RUN DEEP SOURCE AUDIT**. The only obvious stop control required scrolling down to the global **STOP ALL RESEARCH & WORKER** button.

Database inspection confirmed the cause: the Deep Source run remained recorded as `queued` while its queue rows showed completed and processing states. The existing button only reflected request startup, not the persisted queue activity.

## Repair

### Dashboard
- Added live Deep Source run detection from `quote_catalog_ai_research_runs` plus `quote_catalog_ai_queue`.
- The run is considered active when the run is queued/running or any of its queue rows are queued, claimed or processing.
- **RUN DEEP SOURCE AUDIT** now becomes **DEEP AUDIT RUNNING · processed/total**.
- Added **CANCEL DEEP SOURCE AUDIT** beside the run button.
- Dashboard refreshes Deep Source state every five seconds.

### Targeted cancellation
Added Supabase function:

`ai_research_cancel_run(p_run_id uuid)`

It:
- checks active staff access;
- marks only that run as `cancelled`;
- marks its queued/claimed/processing items as `skipped`;
- leaves the Research PC, continuous research and unrelated runs running.

The queue completion RPC was hardened so a late worker completion cannot change a cancelled/skipped item back to completed or failed.

### Research PC worker
The local agent now:
- loads persisted run status;
- checks that the run is still active before processing/submitting candidates;
- recognises `RUN_CANCELLED`;
- stops the current queue item cleanly without submitting further evidence once cancellation is detected.

## Files changed

- `admin-ai-research.html`
- `admin-ai-research.js`
- `tools/gear-ai-local-agent/agent.mjs`
- `supabase/migrations/20260906130000_deep_source_run_controls.sql`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md`

## Live Supabase change

Migration applied successfully to project `npdpopaoazbpmwsgyosp`.

## Current MPB test state at investigation

Run `4554e39e-4e97-4a9e-b7d4-2f68fd0ffcb2`:
- Deep Source URL: MPB UK
- 5 products targeted
- queue showed completed products, one processing product and one queued product
- run record still said `queued`

This is the state that the new live-run detection is designed to represent correctly.

## Next verification

1. Refresh the dashboard.
2. Confirm the current MPB audit shows a running/progress state rather than RUN DEEP SOURCE AUDIT.
3. Confirm CANCEL DEEP SOURCE AUDIT is visible.
4. Let the current test complete, then start another short test.
5. Test targeted cancellation and confirm the Research PC remains online while only that audit stops.
6. Pull the latest repository changes onto the Research PC before relying on cancellation-aware worker checks.
