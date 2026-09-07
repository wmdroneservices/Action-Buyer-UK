# 2026-09-07 GitHub Desktop and Gemma Working-Copy Baseline

## Purpose

Lock the verified local source-control and Research PC deployment arrangement after GitHub Desktop was connected to the GearCashOut repository and Gemma was successfully run from the GitHub working copy.

## Authoritative repository

- Repository: `wmdroneservices/Action-Buyer-UK`
- Branch: `main`
- GitHub remains the source of truth for committed code.

## Verified active local working copy

`C:\GearCashOut\Action-Buyer-UK-GITHUB-CLEAN`

Research PC agent directory:

`C:\GearCashOut\Action-Buyer-UK-GITHUB-CLEAN\tools\gear-ai-local-agent`

The older extracted `Action-Buyer-UK-main` folder is retained temporarily as a backup only and is not the active deployment target.

## Secrets and configuration

Secrets remain outside the repository:

`C:\GearCashOut-Config\.env`

No secrets are committed to GitHub or stored in project memory.

The external launcher resolves the active agent path through:

`GEARCASHOUT_AGENT_DIR`

The active value points to the GitHub working-copy agent directory.

## Verified runtime test

The following were confirmed live:

1. Supervisor started from the GitHub working-copy agent directory.
2. External configuration loaded from `C:\GearCashOut-Config\.env` plus repository configuration.
3. Research PC reached Ready/Polling.
4. A real research job was claimed and processed successfully.

## Standard future workflow

1. Use GitHub Desktop for Fetch/Pull, commit and push.
2. Work from the single verified active working copy.
3. Keep secrets in the external config folder.
4. If pulled changes affect `agent.mjs`, `supervisor.mjs`, `package.json` or other running runtime files, restart the affected Research PC process.
5. A GitHub pull updates files but does not hot-reload Node.js.
6. Run a small real workflow test after deployment before resuming larger research.
7. Before material repairs, follow the investigation order: project memory → relevant roadmap → current GitHub → current Supabase → first failure → previous fixes → minimal repair → test → verify → update documentation and checkpoint.

## Related records

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DIAGNOSTIC-ROADMAPS/AI-RESEARCH-PC-CONTROL.md`
- Supabase current checkpoint: **2026-09-07 GitHub Desktop and Gemma working-copy baseline**
