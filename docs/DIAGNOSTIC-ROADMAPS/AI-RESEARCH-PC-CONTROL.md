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
