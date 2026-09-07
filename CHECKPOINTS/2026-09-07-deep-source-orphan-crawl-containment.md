# 2026-09-07 — Deep Source orphan-crawl containment

## Incident

A five-product Sony Deep Source audit against MPB timed out at the per-product 180000ms watchdog. Supabase correctly marked queue items and runs terminal, but the Research PC terminal continued launching and collecting MPB browser fallback URLs. The continued crawl included unrelated manufacturers and later persisted raw discoveries into a failed run.

## Confirmed evidence

- Sony five-product run `feeab5d1-b156-446f-bac5-09d5ba4d9233` ended with five errors.
- Sony Alpha 1 II retry `40df6276-70c0-40b3-96be-8baace93d1a4` timed out after 180000ms.
- A later DJI Matrice 300 RTK run `98806990-8c0b-49cf-aca9-f9fd0bbddd8a` also timed out after 180000ms.
- Raw discoveries for that terminal DJI run were written after the queue/run had already become terminal and included Fujifilm, Nikon, Canon and other unrelated MPB URLs.
- The live Research PC heartbeat reported `1.5.8-worker`, proving the newer repository worker was not yet deployed locally.
- Continuous research was confirmed disabled, so the incident was not caused by continuous mode.

## First failure

The Research PC was running an older worker while GitHub contained the 1.5.9 crawl-isolation repair. The old local process lacked the required lifecycle containment. The browser crawl could therefore outlive the database job.

## 1.5.10 containment repair

- MPB browser fallback now receives the Deep Source abort signal.
- Abort immediately closes the active Playwright page, context and browser.
- Abort state is checked between browser stages.
- Deep Source refuses to persist raw discoveries unless the Supabase run is still active.
- Package, worker and supervisor release markers are aligned at 1.5.10 for deployment verification.

## Required verification sequence

1. Stop the currently running old local worker cleanly.
2. Update the Research PC working copy from GitHub main.
3. Restart through the persistent supervisor only.
4. Confirm the live heartbeat/version reports the new 1.5.10 release.
5. Run one controlled Sony Deep Source product.
6. Confirm only target-relevant exact MPB URLs are opened.
7. Confirm a timeout stops browser activity and does not write discoveries into a terminal run.
8. Only then restore a five-product Deep Source batch.

No further production batch should be started before this sequence passes.
