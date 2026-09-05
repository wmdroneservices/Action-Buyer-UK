# GearCashOut AI Operating Manual and Persistent Project Memory

**Status:** Living operational document  
**Project:** GearCashOut / Action-Buyer UK  
**Repository:** wmdroneservices/Action-Buyer-UK  
**Purpose:** Continuity manual for AI assistants and technical agents working on the project.

---

# 1. Purpose

This manual is not a customer guide. It exists so that a future AI can establish where the project is, what the system architecture is, what has already been decided, and what must be checked before making changes.

The authoritative operational model is:

**Current GitHub code + current Supabase state + structured project memory + verified live behaviour.**

No single source alone is sufficient for major changes.

---

# 2. Mandatory Retrieval Before Significant Work

Before substantial GearCashOut work:

1. retrieve relevant project memory using project_memory_context_v2('gearcashout', ...);
2. inspect the current checkpoint and open tasks;
3. inspect current GitHub state;
4. inspect relevant Supabase state;
5. identify non-negotiable rules;
6. inspect the actual affected workflow before changing it.

Do not restart work from scratch if a checkpoint or prior implementation exists.

---

# 3. Two-Manual Documentation Rule

## Human / Developer Manual

docs/GEARCASHOUT-SYSTEM-HANDBOOK.md

Purpose:

- staff operation;
- developer onboarding;
- system architecture;
- workflow traceability;
- troubleshooting.

It must progressively document:

**User action → page → JavaScript/controller → Supabase call → database object → trigger/function → status change → visible result.**

## AI Operating Manual

This document records:

- current truth;
- decisions;
- active architecture;
- faults and lessons;
- limitations;
- workarounds;
- verification state;
- documentation requirements.

The Supabase project-memory layer is the structured retrieval companion to this file.

---

# 4. Current Architecture Map

## Website and repository

GitHub repository:

wmdroneservices/Action-Buyer-UK

The repository contains the public site, customer areas, staff/admin pages, Quote Catalogue tools and Research Centre front-end.

## Backend

Supabase project:

**Action Buyer UK**  
Project reference: npdpopaoazbpmwsgyosp

Supabase is the system of record for:

- authentication;
- staff/customer access;
- valuations;
- quote items and offers;
- catalogue products;
- evidence;
- AI research queues and candidates;
- project memory;
- RPC/database workflow logic;
- Edge Functions.

## Current known Edge Functions

At the time this manual structure was established, active functions included:

- send-quote-email
- send-quote-email-v2
- mark-item-received
- send-shipping-email
- quote-catalog-ai-orchestrator
- manage-staff
- staff-login
- staff-activity
- quote-catalog-ai-worker
- management-mail
- manage-staff-v2
- management-mail-v2

Future AI work must inspect current live versions rather than assuming this list remains unchanged.

## Research PC

The local research system uses:

- Node.js;
- tools/gear-ai-local-agent/agent.mjs;
- Ollama;
- the configured Gemma model;
- Supabase queue and research workflow;
- local configuration outside the repository.

Important operational limitation:

A website dashboard cannot start a completely absent local process by itself. Remote controls can communicate only with an available local control/worker process. If the Research PC has no active supervisor/control process, it must first be started locally by the configured Windows/Desktop startup mechanism.

---

# 5. Non-Negotiable Rules

Always retrieve the current structured rules, but the established core principles include:

- Never mismatch a price with a URL from another evidence item.
- Generic pages are discovery, not exact-product evidence.
- Keep New UK, Used UK and Overseas evidence separate.
- Research must not automatically change GearCashOut buying prices.
- Rejected evidence remains auditable.
- AI research does not automatically create or publish catalogue products.
- Do not mark a feature complete solely because code was committed.
- Check current GitHub and Supabase state before significant changes.
- Never store credentials or secrets in project memory.
- Preserve working UI and architecture unless a change is genuinely required.

---

# 6. Verification States

Every significant change should be tracked separately as:

1. **Proposed**
2. **Implemented**
3. **Tested**
4. **Verified Live**

A Git commit is implementation evidence, not proof of live behaviour.

---

# 7. How to Document a System

For each major system, create an exact traceability map.

Template:

## System name

### Purpose
What the system does.

### Entry points
- Page(s):
- JavaScript/controller:
- User actions:

### Supabase path
- Tables:
- RPCs:
- Database functions:
- Triggers:
- Edge Functions:
- Constraints/RLS where relevant:

### Status transitions
status A → action → status B

### External dependencies
- Email:
- Research PC:
- Ollama:
- Other services:

### Failure modes
What can fail and how it is detected.

### Recovery
What staff/developers should do.

### Verification
- Implemented:
- Tested:
- Verified Live:

### Change history
What changed and why.

---

# 8. Priority Documentation Audit Order

The documentation audit should proceed system by system:

1. Quote/valuation submission
2. Automatic pricing and automatic offers
3. Manual valuation and offers
4. Customer acceptance/rejection
5. Purchasing and shipping
6. Receipt, inspection, refusal and returns
7. Payment and completed transactions
8. Customer account
9. Staff authentication and permissions
10. Quote Catalogue
11. Evidence and comparison pricing
12. AI Research Centre
13. Research PC/local agent/Ollama
14. Email and notification functions
15. Full Supabase architecture map

Do not document unverified internal relationships as facts. Inspect the relevant code and database objects first.

---

# 9. Current Operational Lesson — Research PC Control

Recent testing established an important distinction:

- **Research queue controls** manage queued research jobs.
- **Continuous research** controls catalogue progression.
- **Research PC controls** manage the local machine/worker lifecycle.

These are different layers and should not be merged conceptually.

The dashboard can show and control a connected Research PC, but it cannot create a running local process on a machine when no persistent local supervisor is available to receive the command.

Operationally:

1. ensure the Research PC's local startup/control mechanism is running;
2. confirm the dashboard reports the PC/worker as available;
3. use remote controls from an authorised logged-in device;
4. keep queue controls separate from machine lifecycle controls.

---

# 10. Mandatory Change Capture

After meaningful work, record:

- what changed;
- why it changed;
- affected files and backend objects;
- important decisions;
- faults discovered;
- lessons learned;
- test result;
- live verification result;
- current stopping point.

Update:

1. Human/Developer System Handbook where relevant;
2. this AI Operating Manual where current operational truth changes;
3. Supabase project-memory event/checkpoint layer.

---

# 11. Current Documentation Status

**Implemented now:**

- two-manual architecture established;
- Staff Dashboard continues to link to the Human/Developer System Handbook;
- dedicated AI Operating Manual created in the repository;
- project-memory operating standard requires retrieval and change capture;
- documentation traceability standard established.

**Next documentation work:**

Audit and document the actual Quote/Valuation workflow end-to-end using the exact repository files and Supabase objects.

---

# 12. Rule for Future AI Sessions

Do not assume remembered summaries are sufficient.

For significant work:

**Retrieve → inspect current state → trace → change minimally → test → verify → document → capture checkpoint.**
