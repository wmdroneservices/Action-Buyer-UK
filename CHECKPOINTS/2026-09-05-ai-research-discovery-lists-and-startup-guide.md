# Checkpoint — 5 September 2026 — AI Research Discovery Lists and Startup Guide

## Work completed

### 1. Discovery lists made collapsible

The following AI Research Centre areas are now collapsed by default:

- **New models and products found**
- **New websites and monitored launches**

This prevents large discovery lists from making the page excessively long.

Existing workflows remain inside the dropdowns:

- product candidates: review, approve, reject and create inactive draft catalogue products;
- discovered sources: refresh, approve, block and monitor opening-soon retailers.

The source section displays a live count in its heading.

### 2. Research PC setup/startup/restart guide audited and corrected

The visible guide was compared against the current repository implementation and prior Research PC checkpoint history.

The previous guide had two problems:

1. it treated direct `npm start` as the normal current lifecycle;
2. it contained duplicate "Updating the local worker" steps.

Current architecture is:

Windows launcher → `C:\GearCashOut-Config\Start-GearCashOut-AI.ps1` → `supervisor.mjs` → `agent.mjs`

Operational rules now reflected in the guide:

- OFFLINE: supervisor unavailable; start the Windows launcher.
- READY: supervisor online, worker stopped; dashboard START can work.
- ONLINE: research worker active.
- STOP ALL RESEARCH & WORKER stops the worker/research but leaves the supervisor available.
- Normal PC restart does not normally require `npm install`.
- `npm install` is for a fresh extraction or missing/changed dependencies.
- Never run npm from `C:\GearCashOut-Config`; it is the configuration folder.
- Keep `C:\GearCashOut-Config\.env` unchanged during repository updates.

## Files changed

- `admin-ai-research.html`
- `admin-ai-research.js`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`

## Verification

- JavaScript syntax check: passed.
- GitHub updates: committed.
- Supabase schema: no change required.
- Live browser verification: still required for both new dropdown sections and revised guide display.

## Next test

1. Refresh the AI Research Centre.
2. Confirm New models and products found stays collapsed until opened.
3. Confirm New websites and monitored launches stays collapsed until opened.
4. Confirm all existing controls still work inside both sections.
5. Open the setup/startup/restart guide and confirm the revised architecture and commands are displayed.
