# GearCashOut Checkpoint — MPB Deep Source Candidate Timeout Repair

Date: 7 September 2026

## Starting evidence

Current GitHub worker and Deep Source roadmap were inspected before change.

Live Research PC log showed:

- successful MPB Chromium fallback launches and collections;
- a Sony Deep Source product opening multiple unrelated Fujifilm exact product URLs;
- the Sony queue row failing at the 180-second Deep Source product watchdog;
- the worker immediately continuing to claim the next product.

Supabase inspection confirmed the timeout errors were stored against the affected Sony queue rows while other queue rows remained active.

## First failure

The first failure was candidate admission, not Gemma/Ollama.

The Deep Source link score gave an exact MPB product path enough points to meet the candidate threshold even without target identity. Pages containing many MPB product links therefore admitted unrelated exact pages into sequential validation.

## Repair committed

GitHub commit: 3fc7781481b00306fb606ee7b81ab598d6d069c6

Changed:

- exact-path status is now only a ranking bonus;
- ordinary discovered candidates require sufficient target identity;
- explicit deterministic MPB slugs remain permitted as source-specific fast paths;
- the Deep Source watchdog aborts the collector context and the candidate loop checks for cancellation before continuing.

## Expected behaviour after Research PC update

For a Sony target, the log should show only target-relevant MPB candidate pages, rather than a long sequence of unrelated Fujifilm pages.

A timeout should fail the current queue row without allowing the timed-out collector to continue iterating through further candidates.

## Next verification

1. Update the Research PC working copy from the current GitHub main branch.
2. Restart the supervisor/worker cleanly.
3. Run one controlled MPB Deep Source batch.
4. Confirm the candidate URLs belong to the selected catalogue target.
5. Confirm the dashboard queue and worker heartbeat remain consistent.
6. If another timeout occurs, inspect the first repeated URL and stage before changing Gemma/Ollama.

## Documentation

Updated:

- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
- docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md
