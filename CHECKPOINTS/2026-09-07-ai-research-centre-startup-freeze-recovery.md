# GearCashOut Checkpoint — AI Research Centre startup freeze recovery

Date: 7 September 2026

## Symptom

The AI Research Centre was visibly static:

- Deep Source selector remained on Loading approved websites.
- Research PC Remote Controls remained on Checking.
- Check/start/restart/stop controls were not responding.

## Investigation

Current Supabase state was checked before changing code:

- Research PC agent: gary-pc-1.
- Persisted supervisor heartbeat had reported control_online=true and worker_running=true.
- Recent lifecycle commands had previously completed successfully.
- The source registry contained 60 approved sources.

Therefore the static browser UI was not sufficient evidence of an offline Research PC or empty source registry.

## First failure identified

admin-ai-research.js start() awaited initClient() before registering any page handlers.

initClient() used actionBuyerAuth.getSession(), which performs a session operation and an additional profiles lookup. A stalled profile lookup could prevent the rest of start() from running, leaving the original HTML placeholders permanently visible.

## Repair

GitHub commits:

- c1bc75ce48ab5e578c6fdced35f17b83e9eb4f44 — startup now waits for the Supabase client, then uses direct sb.auth.getSession() with a timeout. Source registry and agent-status calls are bounded and the selector no longer remains indefinitely on Loading.
- 2cc1acd401f4fa9a0b23bf6f3e9cb7a286b2bf52 — new JavaScript cache version for admin-ai-research.html.

## Documentation

Updated:

- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
- docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md

## Required verification

1. Reload the AI Research Centre and confirm the new script is served.
2. Confirm the Deep Source website dropdown populates from the approved registry.
3. Confirm Remote Controls leaves Checking and displays ONLINE, READY or OFFLINE from the heartbeat.
4. Test CHECK RESEARCH PC and CHECK OLLAMA first.
5. Only then use START/RESTART/STOP if needed.
6. Do not restart the Research PC merely to fix a frozen browser startup unless Supabase proves the PC control channel is offline.
