# GearCashOut Project Memory — Operating Standard

## Core principle

Project memory is a working part of the system. Significant work is not complete until its important state, decisions, lessons and verification status are captured.

## Retrieval before work

For substantial GearCashOut work, retrieve:

1. `project_memory_context_v2('gearcashout', '<task context>')`
2. current checkpoint
3. non-negotiable rules
4. active decisions
5. open errors and tasks
6. relevant source intelligence
7. current GitHub and Supabase state

## Mandatory quality states

Every significant feature/change should progress through:

- Proposed
- Implemented
- Tested
- Verified Live

A Git commit alone is not proof that a browser feature works.

## Automatic capture

The database automatically records AI research activity including:

- research runs;
- candidate findings;
- candidate decisions;
- evidence applied to the live catalogue.

## Manual capture required for significant changes

After meaningful GitHub, database, UI or workflow changes:

- record the event;
- record important decisions;
- record errors and lessons;
- update unfinished tasks;
- update the checkpoint when the stopping point changes;
- record verification status.

## Non-negotiable research rules

- A price and URL must come from the same validated evidence item.
- Exact product evidence is required.
- Generic search/category/home pages are discovery, not evidence.
- New UK, Used UK and Overseas evidence remain separate.
- Research does not automatically alter GearCashOut buying prices.
- Rejected findings remain auditable.
- Never store secrets or credentials in memory.

## Memory layers

1. Current truth/checkpoint
2. Non-negotiable rules
3. Active decisions
4. Open problems/tasks
5. AI research contract
6. Source intelligence
7. Product aliases and identity knowledge
8. Verification history
9. Errors and lessons
10. Full event history

## Consolidation

Raw history is retained for audit. Current truth should be concise. Superseded decisions and obsolete entries must be marked rather than silently deleted.
