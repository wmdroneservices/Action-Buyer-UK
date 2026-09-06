# Checkpoint — 7 September 2026 — MPB Deep Source discovery 403/404 repair

## Workstream
AI research / Gemma / Research PC / retailer training.

## First verified failure
The Sony MPB Deep Source run continued processing normally, but many completed products produced no candidates despite live MPB stock existing.

Verified examples:

- Sony PXW-Z190 — queue completed with no candidate, while MPB had a live exact page under a retailer-specific URL ending `-4k-camcorder`.
- Sony PXW-Z150 — queue completed with no candidate, while MPB had a live exact page ending `-camcorder`.
- Sony PMW-200 — queue completed with no candidate, while MPB had a live exact page ending `-camcorder`.
- Sony PXW-FS5, PXW-X200 and FX6 also had live MPB evidence that required reliable exact-page discovery.

## Root cause
The worker generated deterministic MPB slugs from the catalogue manufacturer/model. That works for simple URLs but fails when MPB adds retailer-specific suffixes.

The fallback discovery routes were also blocked by MPB HTTP 403 responses:

1. internal search;
2. landing/category crawl;
3. raw Node HTTP collection.

The previous browser fallback only ran after an exact product URL was already known. Therefore it could not discover the correct suffix when the guessed deterministic URL returned 404.

## Repair
Repository worker updated to version **1.5.6**.

- New generic MPB browser-aware fetch path handles HTTP 403 for discovery pages as well as exact pages.
- MPB internal search uses the browser fallback after HTTP 403.
- MPB landing/category/subcategory crawl uses the browser fallback after HTTP 403.
- Discovery pages remain discovery-only.
- Final evidence still requires a validated exact MPB `/en-uk/product/...` page.

This deliberately extends the existing working browser fallback rather than reverting to the earlier raw HTTP-only approach.

## Live Sony run state at investigation
Run: `df675131-c679-4c78-89a3-586458abad19`

At verification:

- 205 queue items completed;
- 14 failed;
- 1 processing;
- 434 queued;
- 30 evidence candidates created.

The dashboard run row did not yet reflect live partial progress because `products_checked` and final run status are updated when the run completes. Queue state is the authoritative live-progress indicator during the run.

## Separate failure found
14 Sony rows failed with `Invalid match status` earlier in the run. Current repository worker code canonicalises package/variant values before candidate submission; this historical failure must be checked after the 1.5.6 deployment rather than assuming it remains active.

## Important deployment rule
The GitHub repair does not automatically replace the code already running on the Research PC. Do not interrupt the active Sony run solely to deploy this change. After the run reaches a safe stopping point, update the local extracted repository/worker to the current GitHub revision, verify the heartbeat reports **1.5.6**, then run a targeted reconciliation for Sony products already completed without candidates.

Do not rerun the entire catalogue blindly. Use the completed Sony queue rows without candidates as the reconciliation target.

## Documentation updated
- `tools/gear-ai-local-agent/agent.mjs`
- `docs/MPB-UK-EVIDENCE-AUDIT-DIAGNOSTIC-ROADMAP.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
