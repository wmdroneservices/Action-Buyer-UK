# GearCashOut Project Memory Workflow

## Purpose

The GearCashOut project memory is part of the working system, not an optional set of notes.

Every significant change must leave a structured trail so the next work session can recover:

- what changed;
- why it changed;
- what is still open;
- mistakes and lessons;
- the latest working state.

## Automatic capture already active

Supabase automatically records project-memory events when:

1. an AI research run is created;
2. an AI research run changes status or finishes;
3. an AI candidate is created;
4. an AI candidate is accepted or rejected;
5. accepted AI evidence is applied to the live catalogue.

These events also update the current checkpoint with the latest automatic activity.

## Mandatory workflow for significant work

Before starting a substantial GearCashOut task:

1. Retrieve the current project memory and checkpoint.
2. Check active decisions.
3. Check unresolved errors and tasks.
4. Inspect the live GitHub/Supabase state before changing anything.

After completing substantial work:

1. Record the change with `project_memory_record_event`.
2. If a decision was made, add/update a `project_memory_decisions` record.
3. If a mistake or failure occurred, add a `project_memory_errors` record with the lesson.
4. Update/create tasks for anything unfinished.
5. Update the current checkpoint when the stopping point materially changes.

## Event types

Use clear event types such as:

- `github_change`
- `database_change`
- `ui_change`
- `workflow_change`
- `ai_research_run_*`
- `ai_candidate_*`
- `bug_found`
- `bug_fixed`
- `decision`
- `checkpoint`

## Non-negotiable evidence rule

A market price and its source URL must belong to the same validated evidence item.

Never combine:

- a price from one page; and
- a link from another page.

Generic search pages, category pages, help pages and navigation pages are not exact-product evidence.

## Current retrieval order

1. `project_memory_context(...)`
2. current checkpoint
3. active decisions
4. unresolved errors/tasks
5. current GitHub/Supabase state

This document is the repository-level workflow contract for persistent project memory.
