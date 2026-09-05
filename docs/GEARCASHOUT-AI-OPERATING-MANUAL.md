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


---

# 13. Diagnostic Roadmap Requirement

The AI must use the documentation as a troubleshooting map, not merely as a history record.

For each significant website action, the Human / Developer Handbook should progressively contain a **Developer Diagnostic Roadmap** identifying the real inspected route through:

1. visible user action;
2. page/front-end entry point;
3. relevant file/module/component;
4. handler or function where known;
5. Supabase query/RPC/Edge Function;
6. relevant database table(s), fields and statuses;
7. database functions/triggers/RLS where relevant;
8. external integrations;
9. local systems such as the Research PC and Ollama;
10. expected visible result.

## AI troubleshooting procedure

When a feature is reported broken:

1. Retrieve the relevant project memory and current checkpoint.
2. Open the relevant section of the Human / Developer Handbook.
3. Follow the Diagnostic Roadmap from the user action forward.
4. Identify the first layer where actual behaviour differs from expected behaviour.
5. Inspect current GitHub and Supabase state before changing anything.
6. Check previous issue history so failed fixes are not blindly repeated.
7. Apply the smallest appropriate repair.
8. Test the repair.
9. Update both manuals and structured project memory.

## No invented roadmaps

A roadmap is only authoritative when based on inspected current code and backend objects.

If the connection has not been verified, mark it as not yet audited rather than guessing.

## Goal

The documentation should allow a future AI or developer to answer quickly:

> **“This part is broken — which files, database objects and connected systems should I inspect first?”**

The manuals are therefore part of the system's maintenance infrastructure, not merely explanatory documentation.


---

# 14. Current Diagnostic Lesson — Amazon UK Only Must Be Verified at the Run Record

On 5 September 2026, Amazon UK Only appeared selected in the dashboard and was passed correctly by `admin-ai-research.js` and the live `quote-catalog-ai-worker` Edge Function, yet the Research PC still searched non-Amazon sources.

The first actual failure was the persisted run scope. The live Supabase RPC `ai_research_create_run_filtered(...)` accepted `p_evidence_scope` but only preserved `new_uk`, `used_uk` and `overseas`; `amazon_uk` silently became `all`.

The local worker correctly uses `quote_catalog_ai_research_runs.evidence_scope` through `getRunEvidenceScope(...)`, so it widened the search because the database had already lost the Amazon-only instruction.

Repair: `supabase/migrations/20260905162500_fix_amazon_uk_manual_research_run_scope.sql`.

Before diagnosing worker search logic again, always verify the latest run row itself. For an Amazon-only test it must store `evidence_scope = 'amazon_uk'`.

Expected next live verification:

- fresh run record stores `amazon_uk`;
- worker logs `Research evidence scope: amazon_uk`;
- Amazon-only enforcement is active;
- no non-Amazon source probes occur.


---

# 15. Current AI Research Centre Review UI — 5 September 2026

## Current implementation

The AI evidence review page now separates pending findings into two collapsed working groups:

1. **Amazon findings — review, edit and decide**
2. **Review, edit and decide** for all other pending findings

Accepted, rejected and applied findings remain separate collapsible audit sections.

Do not remove the separation by reintroducing a permanently expanded pending queue unless there is a verified usability reason.

## Amazon classification rule

Amazon findings are identified from the effective evidence source rather than merely from the currently selected dashboard filter.

Check, in order:

- edited source URL;
- original source URL;
- Amazon source text where present;
- Amazon UK hostname.

This prevents stale filter state from incorrectly deciding where a historical finding is displayed.

## Catalogue comparison shortcut

Each AI finding with a resolvable catalogue product now includes:

**COMPARE WITH CATALOGUE PRODUCT**

The target is:

`admin-catalog.html?product=<catalog_product_id>`

The existing catalogue implementation already supports this parameter and opens the matching product through `admin-catalog.js`.

The AI finding remains evidence only. Opening the catalogue does not automatically alter buying prices or apply the finding.

## Mandatory verification still required

Implementation was committed and the updated JavaScript was syntax-checked. A live browser test should confirm:

1. Amazon findings appear in their own collapsed section.
2. Non-Amazon pending findings appear in the general collapsed section.
3. Opening either section reveals the correct findings.
4. A finding's compare CTA opens the exact linked catalogue product.
5. Existing catalogue evidence is visible for comparison.
6. Browser Back returns safely to the AI review page.
7. Edit, accept, deny and apply behaviour remains unchanged.

Current state: **Implemented; awaiting browser/live verification.**

---

# 16. Current AI Review Workflow — Inline Vertical Comparison

On 5 September 2026, the per-finding catalogue comparison was changed from a same-page navigation shortcut into an in-place comparison workflow.

## Current behaviour

**COMPARE HERE WITH CATALOGUE**:

1. keeps the AI finding open;
2. loads current live evidence from `quote_catalog_retailer_prices` for the linked `catalog_product_id`;
3. displays the editable new AI finding above the existing catalogue evidence;
4. allows source links to be opened independently;
5. retains **EDIT NEW FINDING**;
6. provides **ACCEPT & ADD TO LIVE EVIDENCE** for the reviewed finding.

The direct action is still explicit. It sets the candidate to accepted when required and then calls the existing live function:

`apply_accepted_ai_candidate(uuid)`

That function remains the authority for writing the final evidence row and mapping the selected evidence category to the live evidence fields.

## Full catalogue editor

A separate **OPEN FULL CATALOGUE EDITOR (NEW TAB)** action remains available for deeper catalogue work without losing the AI review state.

## Verification state

- Implemented
- JavaScript syntax checked
- Live browser verification still required


### 5 September 2026 — Inline comparison dropdown regression and repair

#### Fault observed during live browser testing

Clicking **COMPARE HERE WITH CATALOGUE** opened the comparison state internally but appeared to close the containing review dropdown. The comparison was therefore hidden because `render()` rebuilt the entire queue and the outer `<details class="ai-decision-section">` returned to its default collapsed state.

#### First failure

The issue was not the catalogue lookup or Supabase evidence query. It was the UI re-render in `admin-ai-research.js`:

1. Compare set `comparingCandidateId`.
2. `render()` rebuilt the review queue.
3. The finding itself was reopened from comparison state.
4. Its parent decision section was recreated closed.
5. The user therefore saw the dropdown close instead of the comparison panel.

#### Repair

`renderSection(...)` now forces the relevant decision section open whenever it contains the active comparison or active editor. This preserves the user's context across the two renders used while catalogue evidence loads.

#### Verification status

- Root cause: confirmed from current code and live browser behaviour.
- Repair committed to GitHub.
- JavaScript syntax check: passed.
- Browser retest: required.


---

# 17. Manual Review Feedback for Gemma — 5 September 2026

The AI Research Centre now distinguishes between **bulk decisions** and **individual manual review**.

## Individual manual review

Each individual finding can be manually reviewed with structured checkboxes for:

- price;
- URL / exact product link;
- condition;
- product/model match;
- package/variant;
- evidence bucket;
- availability;
- source/retailer.

The reviewer can enter a reason explaining what was wrong or why a correction was made.

### Mandatory rules

- If evidence values were changed, a reason is required before manual acceptance.
- Manual denial requires a reason.
- Original and effective edited values are compared automatically.
- Before/after values, reviewed fields, changed fields and the reviewer are retained in Supabase.

The database function `record_ai_candidate_manual_review(...)` also creates/update structured `quote_catalog_ai_learning` entries so future Gemma research can use recurring human review feedback.

## Direct manual acceptance

When reviewing side-by-side with the existing catalogue, the manual action can:

1. record the human review feedback;
2. mark the candidate accepted;
3. call `apply_accepted_ai_candidate(uuid)`;
4. add the accepted evidence to the live comparison.

The feedback write and the live evidence write remain separate responsibilities.

## Manual denial

Each individual finding has **DENY WITH REASON**.

The denial is retained with the reason and reviewed evidence areas so Gemma can distinguish, for example:

- incorrect price;
- wrong or category-level URL;
- incorrect condition;
- wrong product or variant;
- incorrect evidence bucket.

## Bulk decisions

**ACCEPT SELECTED** and **DENY SELECTED** remain available for speed.

Bulk decisions intentionally do not request or invent an individual reason. They must not be treated as detailed training feedback.

## Verification checklist

1. Open an individual finding.
2. Tick one or more reviewed fields.
3. Edit a value and try accepting without a reason — it should be blocked.
4. Add a reason and accept — the decision should save.
5. Check the candidate review feedback row and generated AI learning.
6. Manually deny another finding without a reason — it should be blocked.
7. Add a denial reason and confirm the finding moves to Rejected.
8. Select several findings and bulk deny — there should be no reason prompt.
9. Confirm existing bulk apply behaviour for accepted findings remains unchanged.


---

# 18. AI Research Centre Usability and Startup Guide Audit — 5 September 2026

## Discovery list scalability

The **New models and products found** and **New websites and monitored launches** areas are now collapsed by default because these lists can become large.

This preserves the existing controls inside each section while preventing long discovery queues from forcing the rest of the page far below the fold.

Do not re-expand these lists permanently without a verified usability reason.

## Startup guide correction

The visible bottom-of-page setup/startup/restart guide was compared with the current inspected implementation and checkpoint history.

The previous guide was partly stale because it instructed direct `npm start` use as the normal lifecycle and contained duplicate update steps.

Current truth:

**Windows launcher → Start-GearCashOut-AI.ps1 → supervisor.mjs → agent.mjs**

The guide now distinguishes:

- **OFFLINE**: supervisor unavailable; Windows launcher required.
- **READY**: supervisor available, worker stopped; remote START can work.
- **ONLINE**: worker active.
- dashboard STOP stops the worker but leaves the supervisor available.
- normal Windows restart does not normally require `npm install`.
- the permanent configuration remains outside the repository at `C:\GearCashOut-Config\.env`.

Verification state:

- GitHub implementation: completed.
- JavaScript syntax check: passed.
- Browser/live verification: pending for the new collapsible discovery sections and revised guide display.


### Current comparison layout correction — 5 September 2026

The per-finding **COMPARE HERE WITH CATALOGUE** workflow is now deliberately vertical rather than two columns:

1. **NEW AI FINDING — EDITABLE** appears first.
2. The full finding editor is visible inside that comparison section, including price and exact product URL.
3. **CURRENT CATALOGUE EVIDENCE** appears directly underneath for comparison.
4. Saving the finding keeps the comparison open and refreshes the edited evidence.
5. The full catalogue editor remains available in a separate tab for deeper catalogue work.

This corrects the previous usability problem where the editor could render below a long comparison panel and appear not to open.


---

# 19. Removal of Duplicate Research Memory Dashboard Section — 5 September 2026

The visible **RESEARCH MEMORY → Accepted and denied decisions** table was removed from the AI Research Centre because it duplicated the accepted/rejected evidence audit workflow and unnecessarily lengthened the page.

The removal does **not** remove Gemma's learning data. Manual review feedback and structured learning continue to be stored in Supabase, including `quote_catalog_ai_learning` entries created by `record_ai_candidate_manual_review(...)`.

The remaining user-facing audit path is the evidence review area, including the existing accepted and rejected sections. The structured learning table is now treated as backend operational memory rather than a second dashboard section.


### Full-width comparison correction — 5 September 2026

Live browser feedback showed that the comparison still appeared column-based because the normal expanded finding body remained visible above the comparison panel. That created a left catalogue-product column, centre evidence column and right action column before the vertical comparison.

The comparison state now replaces that normal multi-column finding body entirely.

When **COMPARE HERE WITH CATALOGUE** is active, the expanded finding shows one full-width workflow only:

1. **NEW AI FINDING — EDITABLE** as a full-width block across the page.
2. The editable fields immediately inside that block.
3. **CURRENT CATALOGUE EVIDENCE** as a second full-width block directly underneath.
4. Manual review feedback and accept/deny actions underneath.

The old three-column summary is not rendered while comparison mode is active.

The JavaScript asset version was also changed to force browsers to load the corrected implementation rather than continue using a cached script.
