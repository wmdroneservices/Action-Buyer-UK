# GearCashOut Project Memory Baseline

Date: 4 September 2026

## Purpose

A persistent project-memory database has been created in the connected Supabase project so future work can begin from verified project state, active decisions, open errors and the latest checkpoint rather than relying only on chat history.

## Connected systems verified

- GitHub repository: `wmdroneservices/Action-Buyer-UK`
- Default branch: `main`
- Supabase project: `Action Buyer UK`
- Supabase ref: `npdpopaoazbpmwsgyosp`
- Region: `eu-west-2`
- Repository head reviewed during creation: `edb93264a78cbd44881fc68e1f3b6a55c6af9319`

## Memory system

Tables created:

- `project_memory_projects`
- `project_memory_entries`
- `project_memory_decisions`
- `project_memory_checkpoints`
- `project_memory_errors`
- `project_memory_tasks`
- `project_memory_code_refs`

Retrieval functions:

- `project_memory_search(project_key, query, limit)`
- `project_memory_context(project_key, query, limit)`

## Verified baseline

At creation:

- 3,832 quote catalogue products
- 7,938 retailer price evidence rows
- 21 AI research sources
- 14 AI research runs
- 71 AI queue items
- 7 AI candidates
- 1 AI agent record

## Catalogue evidence model

1. UK New — Online Comparison
2. UK Used / Other — Reference Only
3. Overseas non-GBP — Reference Only with original currency retained

Locked rules include:

- Do not overwrite existing UK New / Online Comparison evidence with Used or Overseas evidence.
- Do not alter buying prices during evidence research.
- No manufacturer RRP workflow.
- Prioritise exact-model evidence.
- Store URLs and timestamps.
- Keep reliable evidence even where a reliable price is not exposed.

## Current AI research lessons

- Evidence must point to the exact product page.
- Generic category pages, search pages and boilerplate pages are not acceptable evidence.
- A price and URL must come from the same validated evidence item.
- New UK and Used UK evidence must remain separate.
- Overseas evidence must remain separate.
- Pending, Accepted, Rejected and Applied findings are now separated in the review workflow.
- Rejected findings are retained for audit.

## Open technical issues

- Strengthen exact-product validation in the local research worker.
- Fix the local worker `Assignment to constant variable` error.
- Handle search-provider aborts and 403 responses without accepting poor fallback pages.
- Populate reusable AI learning from review outcomes.

## Future workflow

Before significant GearCashOut work:

1. Read the current checkpoint.
2. Read active decisions.
3. Read open/monitoring errors.
4. Retrieve relevant architecture and code references.
5. Verify current GitHub/Supabase state when making changes.
6. Record new decisions, errors, fixes and checkpoints after significant work.

This file is a repository backup of the Supabase project-memory baseline, not a replacement for the live memory database.
