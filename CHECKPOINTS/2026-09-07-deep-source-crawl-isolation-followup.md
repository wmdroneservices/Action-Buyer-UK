# GearCashOut Checkpoint — Deep Source Crawl Isolation Follow-up

Date: 7 September 2026

## User-visible symptom

A Sony-only MPB Deep Source audit was visibly opening Fujifilm, Nikon and other unrelated MPB product URLs in the Research PC terminal. At the same time, the Deep Source dashboard no longer displayed the audit as active.

## Authoritative state checked first

Supabase run:

- Run: `40df6276-70c0-40b3-96be-8baace93d1a4`
- Notes: manufacturer=Sony
- Evidence scope: deep_source
- Targeted products: 1
- Terminal status: completed_with_errors

Queue row:

- Product: Sony Alpha 1 II
- Status: failed
- Error: Deep Source collection timed out after 180000ms

Research PC heartbeat remained online and reported `1.5.8-worker` before repository deployment of this follow-up.

## Actual root cause

The previous repair tightened final candidate admission but did not close two crawl paths:

1. low-scoring exact MPB product URLs could still fall through into the breadth-first discovery queue;
2. the watchdog set AbortController state, but the discovery loops did not consistently cooperate with that signal, allowing the rejected collector promise to continue fetching URLs after Supabase had already marked the queue item failed.

This explains both visible symptoms:

- unrelated manufacturers appeared in the terminal because exact product pages were incorrectly crawled as discovery nodes;
- the dashboard correctly removed active status because the database run was already terminal while the orphaned local collector continued.

## Repair

GitHub:

- `f4ef98528fa57e1f5b63789c26e9e7f53724a1e3` — exact product pages below target threshold are rejected rather than queued; abort checks added throughout discovery/crawl/final-validation loops.
- `59ebdbc70f2699d2c8b72f274b3d633429db4ab7` — worker version bumped to `1.5.9-worker`.

## Documentation updated

- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
- docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md

## Required next verification

1. Update the Research PC working copy to current GitHub main.
2. Restart the supervisor cleanly and ensure only one worker runs.
3. Confirm Supabase heartbeat reports `1.5.9-worker`.
4. Run a small Sony MPB Deep Source batch.
5. Confirm unrelated exact manufacturer product pages are not opened.
6. Confirm dashboard active state matches queued/processing database state.
7. If the watchdog fires, confirm background MPB requests stop promptly rather than continuing after the queue row becomes failed.
