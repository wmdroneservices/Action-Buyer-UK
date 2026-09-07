# Research PC Supervisor Deployment Repair — 7 September 2026

## Summary

The Research PC control failure was traced to a partial deployment: current `agent.mjs` delegated lifecycle commands to `supervisor.mjs`, but the local startup route still ran `npm start → node agent.mjs`.

## Completed repair

- `package.json` version updated to 1.5.7.
- `npm start` now launches `supervisor.mjs`.
- `npm run worker` remains available for controlled direct worker execution.
- `supervisor.mjs` reports version 1.5.7-supervisor.
- stale queued lifecycle commands older than 10 minutes are expired on supervisor startup.
- Human/Developer System Handbook updated.
- AI Operating Manual updated.
- Research PC README updated.
- Diagnostic roadmap created.

## Current GitHub state

Repository: `wmdroneservices/Action-Buyer-UK`

Control deployment commits:

- `4d09e8432a0aeb8769ab2e39f73cb54daf418b84` — package startup repair
- `f94ca0bfa9c97460e14cf653613ba4f92fdb378e` — supervisor command recovery hardening

## Required local deployment

Copy together from the current repository:

- `tools/gear-ai-local-agent/agent.mjs`
- `tools/gear-ai-local-agent/supervisor.mjs`
- `tools/gear-ai-local-agent/package.json`

Ensure the Windows launcher uses the same extracted agent folder.

## Verification required

Live browser/Research PC verification remains required:

1. ONLINE state.
2. CHECK STATUS completes.
3. CHECK OLLAMA completes.
4. STOP leaves supervisor READY.
5. START returns worker to ONLINE.

Do not resume a large Sony/MPB run until this control sequence has passed.
