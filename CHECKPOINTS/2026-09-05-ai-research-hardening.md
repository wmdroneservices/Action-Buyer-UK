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


## Root cause confirmed — 5 September 2026, Research PC start/stop regression

### What changed

The local PowerShell launcher was reduced to a one-shot:

`npm start`

instead of retaining the previously working restart loop. This removed the behaviour Gary had configured yesterday: when the worker exited, PowerShell stayed available and relaunched the worker after a delay.

### Why the dashboard START button could not work

The dashboard START button writes a `start_worker` command into Supabase. Commands are consumed by `agent.mjs`. Therefore, when the worker is genuinely offline there is no running process available to read the START command. The command remains queued indefinitely.

This explains the observed sequence exactly:

- dashboard reports the Research PC offline;
- Gary clicks OK to start it;
- a `start_worker` command is written;
- no worker is running to consume it;
- PowerShell never opens.

This was not a Windows or browser failure.

### Repairs

1. Restored the persistent PowerShell launcher loop in:
   `tools/gear-ai-local-agent/Start-GearCashOut-AI.ps1`
2. The launcher now:
   - starts the worker;
   - detects exit/crash;
   - waits 10 seconds;
   - starts it again automatically.
3. Dashboard command handling now refuses to pretend that an offline worker can receive a START command and gives an explicit explanation instead.
4. Stale queued remote-control commands from the incident were marked failed so they cannot execute unexpectedly when the worker returns.
5. Existing architecture remains unchanged:
   Windows startup / desktop launcher → Start-GearCashOut-AI.ps1 → npm start → agent.mjs.

### Local installation requirement

Because Gary's Research PC is a manually extracted repository copy, the repaired local launcher file must be replaced on that PC:

`Start-GearCashOut-AI.ps1`

No whole repository download is required for this specific repair.


## Latest repair — launcher running npm in the wrong folder

Live PowerShell output confirmed the desktop launcher was working, but npm was being launched from:

`C:\\GearCashOut-Config`

and therefore repeatedly failed because that configuration folder does not contain `package.json`.

### Exact cause

The PowerShell launcher used its own script directory as the Node working directory. That is wrong in the established installation because the script intentionally lives outside the repository in `C:\\GearCashOut-Config`.

### Repair committed

`tools/gear-ai-local-agent/Start-GearCashOut-AI.ps1` now explicitly uses:

`C:\\gearcashout\\Action-Buyer-UK-main\\tools\\gear-ai-local-agent`

as the default Node project directory, verifies `package.json` before running npm, preserves the 10-second restart loop, and allows a future override through `GEARCASHOUT_AGENT_DIR`.

### Required local action

Replace only:

`C:\\GearCashOut-Config\\Start-GearCashOut-AI.ps1`

with the repaired launcher. Keep the existing `C:\\GearCashOut-Config\\.env` unchanged.


## Remote START architecture repair

The dashboard START button was found to be intentionally blocked whenever the worker heartbeat was offline. That reflected a circular architecture: the stopped worker was the only process able to consume its own START command.

Repair committed:

- new `tools/gear-ai-local-agent/supervisor.mjs` persistent control process;
- `agent.mjs` no longer consumes lifecycle commands;
- `Start-GearCashOut-AI.ps1` launches the supervisor;
- dashboard distinguishes worker OFFLINE from supervisor READY;
- START is no longer blocked merely because the research worker is stopped.

The Windows launcher/supervisor remains alive after STOP, allowing START from the dashboard, including from another authorised staff computer.


## Root cause confirmed — Amazon UK Only manual research widening

### Symptom

Amazon UK Only was visibly selected and the run notes recorded `evidence=amazon_uk`, but recent live research-run rows still stored `evidence_scope = all`.

The Research PC therefore searched non-Amazon sources despite the worker hardening already being present.

### First failure

The live Edge Function `quote-catalog-ai-worker` correctly passed `p_evidence_scope='amazon_uk'` into `ai_research_create_run_filtered(...)`.

The database RPC was the failure point: its validation case only accepted `new_uk`, `used_uk` and `overseas`, silently converting Amazon UK Only to `all`.

### Repair

- Applied live Supabase migration: `fix_amazon_uk_manual_research_run_scope`.
- Added repository migration: `supabase/migrations/20260905162500_fix_amazon_uk_manual_research_run_scope.sql`.
- The repaired RPC now accepts `all`, `new_uk`, `used_uk`, `overseas` and `amazon_uk`.

### Current status

**Implemented and database definition verified.**

Next required test: start one fresh Amazon UK Only batch and confirm the new run row stores `amazon_uk` and the Research PC logs no non-Amazon source routes.
