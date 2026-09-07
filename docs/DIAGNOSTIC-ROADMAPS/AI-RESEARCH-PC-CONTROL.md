# AI Research PC Control — Developer Diagnostic Roadmap

## Purpose

Map the Research PC lifecycle control path without duplicating source code. Use this before changing startup, STOP/START, dashboard controls, local worker deployment or Supabase command handling.

## User action

AI Research Centre Remote Controls:

- CHECK RESEARCH PC STATUS
- CHECK OLLAMA
- START RESEARCH PC WORKER
- RESTART RESEARCH PC WORKER
- STOP ALL RESEARCH & WORKER

## Front-end entry point

- `admin-ai-research.js`
  - resolves the live `quote_catalog_ai_agents.agent_id`
  - calls `ai_agent_request_command(...)`

## Supabase command path

Tables:

- `quote_catalog_ai_agents`
- `quote_catalog_ai_agent_commands`

Relevant functions/RPCs:

- `ai_agent_request_command(...)`
- `ai_research_emergency_stop()`

Expected command lifecycle:

`queued → claimed → completed/failed`

Commands are transient. They are not a permanent backlog. The supervisor expires queued commands older than 10 minutes when it starts.

## Research PC process chain

`Windows launcher → Start-GearCashOut-AI.ps1 → npm start → supervisor.mjs → agent.mjs`

Files:

- `tools/gear-ai-local-agent/package.json`
- `tools/gear-ai-local-agent/supervisor.mjs`
- `tools/gear-ai-local-agent/agent.mjs`
- `tools/gear-ai-local-agent/Start-GearCashOut-AI.ps1`
- external Windows launcher/config path: `C:\\GearCashOut-Config\\Start-GearCashOut-AI.ps1`

### Responsibilities

**supervisor.mjs**

- remains alive when the research worker is stopped;
- polls Supabase lifecycle commands;
- starts/stops/restarts `agent.mjs`;
- checks Ollama;
- writes control metadata:
  - `control_online`
  - `worker_running`.

**agent.mjs**

- performs catalogue research only;
- heartbeats research-worker state;
- does not consume lifecycle commands.

## Expected dashboard states

- **ONLINE** — supervisor and worker running.
- **READY** — supervisor online, worker stopped.
- **OFFLINE** — control supervisor unavailable.

## First failure points

1. Wrong local startup path launches `agent.mjs` directly.
2. Partial deployment updates `agent.mjs` but not `supervisor.mjs/package.json`.
3. Agent ID in local `.env` differs from the live dashboard-selected agent ID.
4. Supervisor cannot authenticate to Supabase.
5. Stale queued lifecycle commands replay after recovery.
6. Windows launcher restarts the wrong process.
7. Worker child exits while supervisor remains online.

## Known failure and repair history

### 7 September 2026 — partial supervisor deployment

**Observed:** Research PC ran `npm start → node agent.mjs` after the worker had been changed to delegate lifecycle commands to `supervisor.mjs`.

**First failure:** deployment drift between local startup files and the new worker architecture.

**Repair:**

- `package.json` now maps `npm start` to `supervisor.mjs`;
- direct worker execution moved to `npm run worker`;
- supervisor version updated to 1.5.7-supervisor;
- stale queued lifecycle commands older than 10 minutes are expired at supervisor startup;
- manuals and this roadmap updated.

## Verification sequence

1. Start Research PC.
2. Confirm heartbeat metadata shows `control_online=true`.
3. Confirm worker starts and dashboard shows ONLINE.
4. Run CHECK STATUS.
5. Run CHECK OLLAMA.
6. Run STOP ALL RESEARCH & WORKER.
7. Confirm worker stops but supervisor remains READY.
8. Run START RESEARCH PC WORKER.
9. Confirm worker returns ONLINE.
10. Only then resume Deep Source or continuous research.


## GitHub Desktop working-copy standard — 7 September 2026

### Authoritative repository and local working copy

- GitHub source of truth: `wmdroneservices/Action-Buyer-UK`
- Current verified local working copy: `C:\\GearCashOut\\Action-Buyer-UK-GITHUB-CLEAN`
- Current agent directory: `C:\\GearCashOut\\Action-Buyer-UK-GITHUB-CLEAN\\tools\\gear-ai-local-agent`
- External secrets/config: `C:\\GearCashOut-Config\\.env`

The active path is supplied to the external launcher through the Windows environment variable:

`GEARCASHOUT_AGENT_DIR`

Do not assume the launcher's legacy fallback path is the active path. Verify the resolved path in the PowerShell prompt/log before diagnosing a code issue.

### GitHub Desktop update flow

`GitHub origin/main → GitHub Desktop Fetch/Pull → active local working copy → controlled supervisor/worker restart → live workflow test`

GitHub Desktop updates the files only. It does not hot-reload the running Node.js supervisor or worker.

### Path-specific failure points

1. GitHub Desktop is pointing at a different local clone than the running Research PC.
2. `GEARCASHOUT_AGENT_DIR` is missing or points at an obsolete copy.
3. A change is pulled successfully but the old Node.js process remains running.
4. A legacy extracted folder is mistaken for the active working copy.
5. Secrets/config are copied into the repository instead of remaining in `C:\\GearCashOut-Config`.

### Verification after any agent-code update

1. Confirm GitHub Desktop has the intended latest commit on `main`.
2. Confirm the PowerShell path is the active GitHub working-copy agent folder.
3. Restart the supervisor if runtime code changed.
4. Confirm configuration loads from the external config folder.
5. Confirm the worker reaches Ready/Polling.
6. Trigger one small real research job.
7. Confirm the job is claimed and completes/returns evidence.
8. Only then continue with larger research work.

### Verified migration result

On 7 September 2026 the Research PC was started from the GitHub working copy, loaded the separate external configuration, reached Ready/Polling, and successfully processed a real research job. This is the baseline deployment state for future repairs and updates.
