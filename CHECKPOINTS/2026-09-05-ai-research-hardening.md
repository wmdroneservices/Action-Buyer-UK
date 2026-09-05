# Checkpoint — 5 September 2026 — AI Research Hardening

## State at checkpoint

The local GearCashOut Research PC is running the Node/Ollama worker from the manually downloaded and extracted repository installation on the Windows desktop environment.

Important operational setup:

- GitHub is the source-controlled repository, but the Research PC is **not** working from a live Git connection.
- Repository updates are being applied to the extracted local copy manually when needed.
- The worker entry point is `tools/gear-ai-local-agent/agent.mjs`.
- Permanent secrets/configuration remain outside the repository at `C:\GearCashOut-Config\.env`.
- The PowerShell launcher is `C:\GearCashOut-Config\Start-GearCashOut-AI.ps1`.
- The desktop launcher is the reliable manual start route; dashboard start/restart/stop controls have been tested as part of the Research PC control work.

## Latest problem addressed

Testing showed that source filtering and product relevance needed additional hardening.

The worker was updated to:

1. require exact model identity for discovery;
2. require manufacturer identity when applicable;
3. reject common accessory/spare-part results for main-product research;
4. preserve recognised bundles/combos/kits;
5. enforce Amazon UK Only as a hard boundary;
6. reject non-`amazon.co.uk` results in Amazon-only mode;
7. disable approved-source/direct probes in Amazon-only mode;
8. add a defensive source-registry rule so Amazon-only cannot silently widen to other sources.

## Documentation updated

- `tools/gear-ai-local-agent/README.md`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`

## Next practical verification

Run a fresh **Amazon UK Only** batch after ensuring there is no previous product still processing from an All Sources run.

Expected worker log characteristics:

- `Research evidence scope: amazon_uk`
- `Amazon-only enforcement: ON`
- only Amazon-targeted search queries;
- `Amazon-only: approved-source fallback disabled.`
- no Bright Tangerine, DJI Retail, DuckDuckGo source probes or other non-Amazon retailer probes for that run.

A zero-result Amazon-only run is acceptable and should not trigger a fallback to general sources.

## Repository commits for this checkpoint

- `0504b8afe6df73e80107054624b50481fa41279c` — worker hardening
- `3d5c0b7b06235872c9a552879fd901d5332dc7b6` — local worker manual update
- `3a2c7c8cce40d08e6ad61eddd9ad8b86a0ba1f87` — system handbook update


## Latest fix — Research PC emergency stop

A live test showed that **STOP ALL RESEARCH & WORKER** could complete its database command while the local worker continued running, and the dashboard button could remain permanently disabled as **STOPPING ALL RESEARCH…**.

### Cause

The PowerShell stop helper used $pid, which collides with PowerShell's read-only automatic $PID variable because variable names are case-insensitive. The helper could therefore fail before the process tree was terminated.

### Fixes now in place

- tools/gear-ai-local-agent/agent.mjs
  - uses $currentPid instead of $pid;
  - falls back to the Node PID if no launcher shell is found;
  - invokes the database emergency stop defensively before shutdown.
- admin-ai-research.js
  - immediately applies the database emergency stop;
  - tracks the returned command ID;
  - waits for command completion and an offline heartbeat;
  - never leaves the button permanently disabled on **STOPPING**.
- Supabase migration:
  - supabase/migrations/20260905142100_fix_research_pc_emergency_stop.sql
  - adds ai_research_emergency_stop();
  - disables Continuous mode and stops queued/claimed/processing work;
  - adds start_worker to the supported command list.

### Important local installation note

The Research PC is **not a live Git checkout**. The updated agent.mjs must be downloaded and manually replaced in the extracted local repository before the PowerShell process-tree shutdown fix can be tested.

The database emergency stop has already been applied to production, and the active queue was stopped during the incident.
