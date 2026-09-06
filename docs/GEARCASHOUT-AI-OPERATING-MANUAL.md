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


### Product-centred grouped evidence review — 5 September 2026

The pending review queue is now grouped by `catalog_product_id` before rendering.

Opening a matched product shows a single complete review page:

- **NEW AI EVIDENCE — EDITABLE** first, containing **all pending findings for that catalogue product**;
- each finding remains individually editable, with its exact product URL and manual Gemma feedback controls;
- **CURRENT CATALOGUE EVIDENCE** immediately underneath, automatically loaded from `quote_catalog_retailer_prices` for the same product.

There is no separate **COMPARE HERE WITH CATALOGUE** step and no separate **VIEW EVIDENCE** step inside the product review. The user opens the product once and sees the complete evidence context.

For each evidence item:

- **SAVE FINDING** preserves edits;
- **SUBMIT TO CATALOGUE EVIDENCE** records manual review feedback, accepts the candidate and applies it through the existing `apply_accepted_ai_candidate(uuid)` workflow;
- **DENY WITH REASON** records the rejection reason and reviewed fields for Gemma learning.

The grouped layout is especially intended for products with multiple findings, such as the DJI Mini 3 product currently carrying several pending evidence candidates.


### Grouped review panel close behaviour — 5 September 2026

The product-centred review uses native collapsible panels. A previous state-retention handler remembered the active product when it was opened but did not clear that state when the panel was closed. After a render, this could force the same review section back open and make it difficult to move to the next grouped review, including Amazon findings.

Current behaviour:

- opening a product loads its grouped new evidence and current catalogue evidence;
- closing that product review clears the active review state and keeps it closed;
- the reviewer can then collapse the surrounding section or open another product normally;
- opening another product switches the active grouped review without requiring an edit or decision;
- no Supabase schema or evidence workflow was changed.

This is a UI-state repair only. Save, submit and deny behaviour remains unchanged.


### Grouped review catalogue context — 5 September 2026

Live usability feedback showed that the grouped product review was structurally correct but the **matched catalogue product** information was too sparse. The reviewer could see the product name and evidence count, but not enough of the existing Quote Catalogue context to make a quick comparison.

The grouped review now loads and displays the same decision-relevant catalogue information directly in the review:

- automatic buying prices: Factory Sealed, Opened/Unused, Excellent, Good and Fair;
- UK New evidence count;
- lowest and highest qualifying UK New selling prices;
- UK used/other reference count;
- total current evidence count;
- the full linked evidence list with retailer, type, condition, sell price, buy price, availability, buy method, region, exact source URL, notes and checked timestamp.

This information appears in the product review context and again in the **CURRENT CATALOGUE EVIDENCE** block. The separate full catalogue editor remains available for deeper changes, but routine evidence decisions should not require leaving the grouped review.

Data flow remains unchanged:

quote_catalog_products + quote_catalog_retailer_prices → admin-ai-research.js grouped review.

No Supabase schema, pricing rule or evidence-application workflow was changed.

### Grouped review catalogue evidence rule — 5 September 2026
When reviewing AI findings against an existing catalogue product, the current catalogue comparison must expose all evidence classes before a reviewer decides what to do with new evidence. Do not suppress valid rows merely because price_currency is blank. Use the catalogue row's region and evidence classification so UK NEW, UK USED / OTHER and OVERSEAS evidence can all be seen, followed by the complete evidence table.


---

# 16. Current AI Review Rule — Full Evidence Before New Findings

**Implemented 5 September 2026; live browser verification pending.**

The grouped AI review must not reduce existing catalogue evidence to summary counters when a reviewer is deciding whether a new finding is duplicate or useful.

For each opened catalogue product:

1. load all quote_catalog_retailer_prices rows for that product;
2. show automatic buying prices and evidence totals;
3. show the actual rows split into:
   - UK NEW;
   - UK USED / OTHER;
   - OVERSEAS;
4. include the full evidence fields needed to compare identity, price, source and status;
5. place the complete current-evidence comparison **above** the grouped new AI findings.

The previous layout already loaded the full rows, but placed the current-evidence block after the new findings and initially presented only summary information. This made duplicate checking unnecessarily difficult.

Current implementation:

- admin-ai-research.js
  - loadComparisonEvidence(productId)
  - catalogueEvidenceBreakdownMarkup(rows)
  - catalogueEvidenceBucketMarkup(...)
  - productReviewMarkup(group)
- admin-ai-research.html
  - grouped evidence comparison styling.

No Supabase schema or workflow change is required. The source remains quote_catalog_retailer_prices.

Verification still required in the live browser:

- all existing evidence rows appear as individual rows for a matching test product;
- used and overseas rows appear when present;
- all new findings remain grouped beneath the current evidence;
- save, deny and submit/apply flows continue to work.
\n---\n\n# 20. Manual Review Feedback — Right / Wrong / Adjusted Outcomes\n\nIndividual AI evidence reviews no longer use plain “checked” boxes as the only structured signal.\n\nFor each reviewed area, the reviewer can choose:\n\n- **NOT CHECKED**\n- **AI WAS RIGHT**\n- **AI WAS WRONG**\n- **ADJUSTED**\n\nThe review areas are:\n\n1. Price\n2. Product / model / package match\n3. Exact URL / product page\n4. Condition\n5. Availability\n6. Source / retailer\n7. Evidence category\n\n## Correction rule\n\nSaved edits are compared against the original candidate automatically. Any actual saved change is mapped to the relevant review area and recorded as **adjusted**, including changed price, exact URL, condition, availability, source/retailer, evidence category, and title/package/variant/product-match details.\n\nTherefore Gemma receives both the reviewer’s explicit judgement and the factual before/after correction.\n\n## Data flow\n\nUser review outcome → `admin-ai-research.js` → `record_ai_candidate_manual_review(...)` → `quote_catalog_ai_candidate_review_feedback.field_outcomes` + before/after values → `quote_catalog_ai_learning`.\n\nThe learning record contains:\n\n- decision: accepted or rejected;\n- reviewed field;\n- outcome: correct / wrong / adjusted;\n- reviewer reason;\n- exact before value;\n- exact after value;\n- candidate and feedback IDs.\n\nLearning keys include the outcome so opposite lessons are not collapsed into one record.\n\n## Acceptance and denial\n\nThe same structured outcomes are recorded regardless of whether the reviewer submits corrected evidence to live catalogue evidence or denies the finding.\n\nThe existing accepted-evidence application function remains unchanged: `apply_accepted_ai_candidate(uuid)`.\n\nNo automatic buying-price workflow was introduced.

---

## AI Evidence Review — Immediate Decision Movement and Inline Correction of Existing Evidence

The grouped AI evidence review now supports two additional workflow rules:

### 1. Manual submit/deny must visibly complete the workflow

When **SUBMIT TO CATALOGUE EVIDENCE** or **DENY WITH REASON** is pressed:

- the button immediately shows a processing state;
- the manual review is saved first;
- the queue is reloaded immediately afterwards;
- denied evidence leaves **Requires Attention** and appears in the denied/rejected audit area;
- accepted evidence leaves **Requires Attention**;
- if live application succeeds, it is applied to the catalogue evidence;
- if live application fails after the review itself was saved, the reviewer is explicitly told that the review moved out of Requires Attention but the live apply step failed.

The UI must never silently leave a reviewer uncertain whether a click was processed.

### 2. Existing catalogue evidence is editable inside the comparison

Each current catalogue evidence row now has an **EDIT** action inside the grouped review.

The reviewer can correct saved evidence without leaving the AI Research Centre, including:

- retailer;
- evidence type;
- condition;
- sell price;
- buy price;
- availability;
- buy method;
- evidence region;
- exact source URL;
- notes.

Saving updates the existing `quote_catalog_retailer_prices` row, refreshes the comparison cache, and redraws the grouped review so the new AI evidence is immediately compared against the corrected catalogue evidence.

No new evidence row is created by this correction workflow, and no automatic buying-price logic is changed.


---

## AI Evidence Review — Verify Sources, Edit All Objective Evidence and Immediate Decision Movement

Current operating rule:

1. Open the grouped product review.
2. Review **CURRENT CATALOGUE EVIDENCE** first.
3. Use **OPEN / VERIFY** on any saved source row to visit the live website.
4. Use **EDIT** on the row to correct objective saved information without leaving the review.
5. Compare all new AI findings underneath.
6. Record right/wrong/adjusted outcomes and a reason where required.
7. Submit or deny.

### Existing evidence editor

The grouped review supports direct correction of:

- retailer;
- evidence type;
- condition;
- sell price;
- buy price;
- currency;
- original selling price;
- VAT basis and VAT rate;
- availability;
- buy method;
- evidence region;
- exact source URL;
- checked timestamp;
- notes.

### Decision behaviour

A manual decision is treated as complete as soon as `record_ai_candidate_manual_review(...)` succeeds.

- **DENY WITH REASON** immediately moves the finding out of Requires Attention into Denied.
- **SUBMIT TO CATALOGUE EVIDENCE** immediately moves the finding out of Requires Attention into Accepted, then runs the existing live application step.
- If `apply_accepted_ai_candidate(...)` fails, the review decision is retained and the UI explicitly reports the apply failure.

The page now shows a visible inline processing/result status during manual actions.

### Currency rule

Existing overseas/non-GBP evidence must retain and display its stored currency. Do not present non-GBP evidence as a GBP price merely because it is displayed inside the UK staff review interface.



---

# 18. Current AI Review UI Regression — Collapsible Product Panels

## Fault observed during live browser testing

After the latest evidence verification/editing changes, opened grouped product reviews could become effectively stuck open. Opening several reviews made the page unnecessarily long because the reviewer could not reliably collapse a panel again.

## First failure identified

The grouped review uses native `<details>` panels. The review-opening path was forcing a full `render()` immediately while the native panel was changing state, then rendering again after the asynchronous catalogue-evidence load. That created a race between the browser's close/open state and the application state, allowing a panel to be recreated open after the reviewer tried to close it.

## Repair

`openProductReview(...)` now:

1. records the active review;
2. loads catalogue evidence only when it is not already cached;
3. does **not** synchronously rebuild the review queue while the native `<details>` panel is opening;
4. only renders after loading if that same review is still active/open.

Closing the panel clears `activeProductReviewId`. If the reviewer closes it while evidence is still loading, the delayed load can no longer reopen it.

## Required live verification

- Open one grouped product review and close it immediately.
- Open two or three different reviews and close each independently.
- Open one review, close it while catalogue evidence is loading, and confirm it stays closed.
- Confirm normal and Amazon review groups can still be used without forcing other panels open.
- Regression-test existing evidence editing, submit to catalogue evidence and deny with reason.


---

## 5 September 2026 — Freefly Astro Official Evidence Audit

The official Freefly Astro collection was checked against the current Quote Catalogue after a pending AI candidate used a generic third-party review URL with a $27,000 price.

### Corrections made

- refreshed current official USD evidence for Astro Max, Astro Max NDAA/Blue, Mapping Essentials NDAA/Blue, Flux L1/O1/H1 and LR1 Payload;
- added the missing **Freefly Astro Max Mapping Essentials** standard bundle at **$37,725 USD**;
- corrected the **Astro Max NDAA/Blue with LR1** configuration from an incorrect $37,725 reference to the official **$43,725 USD** NDAA Mapping Essentials price;
- removed an unrelated Canon UK £6,999.99 manufacturer RRP from the legacy Freefly Astro record because the official current collection does not publish a standalone legacy Astro price;
- added active structured learning for Gemma: a generic category, collection, review article or broad model page must not be treated as exact price evidence unless the exact catalogue product and displayed price are directly matched.

The generic pending AI candidate was intentionally left in the human review queue so the reviewer can deny it through the normal feedback workflow and add the specific review reason.


---

## 21. AI Evidence Decision Processing Visibility Repair — 5 September 2026

Inspection of the current front end found a specific UI mismatch: manualReviewAction(...) attempted to update .ai-manual-review-status, but manualReviewMarkup(...) did not render that element. The button label could change and the backend call could run, yet there was no dedicated inline status surface beside the decision controls.

The repair adds a live inline status region to every manual review panel. The existing workflow remains unchanged:

1. disable the clicked button;
2. show SAVING DECISION / DENYING and inline processing status;
3. call record_ai_candidate_manual_review(...);
4. reload the queue so the item leaves Requires Attention;
5. for direct submission, call apply_accepted_ai_candidate(uuid) and report any separate apply failure.

No schema, RPC, RLS or evidence-application change was made.


---

# MPB UK Deep Inventory Learning Rule — 5 September 2026

## Root lesson

A generic MPB category or brand page can reveal that a model exists, but it is not sufficient final evidence for a catalogue product.

The worker previously treated broad discovery paths too much like evidence sources, which contributed to incomplete MPB evidence such as one or two observations where the exact MPB model page contained many individual units.

## Permanent rule

For MPB UK:

1. Use category/brand pages only to discover candidate models.
2. Continue into the exact `/en-uk/product/...` model page.
3. Inspect all currently displayed individual units.
4. Aggregate all live units on the same exact MPB page into one reference-only market range.
5. Capture minimum price, maximum price, cosmetic conditions represented and unit count.
6. Preserve the canonical MPB product URL so staff can verify the latest stock and manually refresh stale evidence.
7. Never store category, brand or search pages as final exact product-price evidence.

## Current database audit state

Initial audit found 1,743 MPB rows, of which 404 used category URLs and 465 used brand URLs. 549 catalogue products had MPB evidence but no exact MPB product-page row.

This means the historical MPB dataset must be treated as requiring replacement/audit rather than assumed correct.

## Gemma learning integration

The local worker was updated to version 1.4.6 so active `quote_catalog_ai_learning` rules are loaded for the researched product/manufacturer and supplied to the Gemma validation prompt.

The MPB source-specific rule is now explicitly present in structured learning and the prompt.

This does not by itself complete the historical MPB audit. It prevents the learning system from treating category/brand pages as final evidence while the existing dataset is audited.


---

# MPB Deterministic Deep-Inventory Audit Path — 5 September 2026

The historical MPB audit found that Gemma must not be the authority for interpreting a multi-unit MPB model page. The source-specific collector aggregates the exact page into a deterministic reference range.

## First failures corrected

### MPB source registration

MPB UK was absent from the active source registry used by the local worker. It is now explicitly registered as:

- source: MPB UK
- domain: mpb.com
- country: GB
- kind: used_dealer
- scope: used_uk
- priority: 5

### Multi-unit extraction

Worker version 1.4.7 contains extractMpbUkUnits(page).

For an exact UK MPB product page it extracts repeated live unit records using:

- SKU;
- price;
- cosmetic condition;
- charges or shutter count where present;
- included details where available.

Each SKU is submitted separately. The worker does not ask Gemma to decide how many units exist.

### Duplicate same-price units

MPB exact pages are represented as one reference-only market range. The canonical MPB model URL is the verification identity, with minimum and maximum observed prices, conditions represented and unit count stored alongside it.

The canonical URL is also retained in the evidence notes.

## Verification

Live exact-page checks were used to replace generic evidence for:

- DJI Air 3 Standard Package (DJI RC-N2): £584, SKU 4135248.
- DJI Mini 4 Pro Standard Package: four units, £444–£639, SKUs 3974411, 4018929, 4115498 and 4144768.

## Audit completion condition

Do not report the MPB historical sweep complete merely because a worker run finished.

Every generic-only product must receive one verified outcome:

1. exact live unit evidence;
2. exact MPB model page, currently out of stock;
3. no exact MPB model/not stocked;
4. package or controller mismatch.

Current generic-only count after verified corrections: **547**.


---

# Deep Source / Website Audit — Operating Rules

Use Deep Source Audit when the user wants a specific website or marketplace searched from a landing page through its relevant category structure.

## Required behaviour

The landing page is a map, not evidence.

The worker must continue through relevant:

1. category pages;
2. subcategory pages;
3. internal site search where the source rule provides it;
4. exact product pages.

Final evidence must come from an exact product page.

## Source-specific handling

The deterministic code owns navigation depth and extraction. Gemma may interpret evidence but must not decide that a generic category page represents a completed exact-product search.

### MPB

- exact UK product pages only;
- expand every live SKU;
- retain price, cosmetic condition and charges/shutter information where present;
- preserve package/controller details;
- preserve duplicate same-price units using SKU-level identity.

### Other sources

A generic Deep Source framework can discover pages, but a source-specific rule should be added when a site has distinctive navigation, pagination or product URL behaviour. Do not invent a rule without inspecting the live source structure.

## Completion outcomes

For each product:

1. exact evidence found;
2. exact page found but out of stock;
3. source does not stock the exact product;
4. package/variant mismatch.

A category page alone is never a completion outcome.

## Deployment

Deep Source requires local worker **1.5.0** or later.


---

# Catalogue-centred Pending Review Rules — 5 September 2026

AI research must submit findings as pending candidates first.

Do not write new research directly into live catalogue evidence.

The catalogue page is now the primary review surface:

- red **P** identifies pending evidence;
- pending findings appear in the correct UK NEW, UK USED / OTHER or OVERSEAS section;
- current live evidence remains visible for comparison;
- every field can be verified/corrected before acceptance;
- denial leaves the live catalogue exactly as it was.

The AI Research Centre remains a queue/control/checklist surface. The catalogue is the evidence decision workspace.

Required final path:

`pending candidate`
→ manual verification
→ accept and apply
→ `quote_catalog_retailer_prices`

or:

`pending candidate`
→ deny with reason
→ rejected history + learning feedback
→ no live catalogue change.


## 6 September 2026 — MPB Deep Source first-run discovery repair

The first live Deep Source test targeted DJI Mavic 3 Enterprise Standard Package using the MPB UK landing page. The 1.4.8 worker correctly claimed and processed the queue item, but returned **No usable web pages were collected for this product**.

This was the first failure: MPB's landing/category/internal search path was not reliably yielding exact links to the raw local crawler, despite the exact MPB UK model page existing.

Repository worker **1.4.9** adds MPB-specific exact-page discovery fallbacks before the generic crawl:

1. deterministic MPB UK product URL derived from the catalogue manufacturer + model identity;
2. external web discovery constrained to `site:mpb.com/en-uk/product`.

Both are still discovery-only. The worker must fetch and validate the exact MPB page before extracting SKU evidence.

The failed run is retained as audit history; it produced no pending candidates and changed no live evidence.


## 6 September 2026 — MPB HTTP 403 collection repair (worker 1.5.0)

The controlled retry on worker 1.4.9 proved that exact MPB discovery was now reaching the correct deterministic product URL, but the first failure remained at **collection**: direct Node HTTP retrieval of the exact MPB page returned HTTP 403.

Worker **1.5.0** keeps the existing direct HTTP collector as the first path. For MPB exact product pages only, an HTTP 403 now falls back to a local Chromium browser session through `playwright-core`, using the installed Chrome/Edge executable. This is deliberately limited to the exact-page validation stage; landing, category and subcategory pages remain discovery-only.

The worker requires `npm install` once after updating to install the new `playwright-core` dependency. If the browser fallback succeeds, normal exact-model validation and MPB SKU/unit extraction continue unchanged. No live evidence is automatically applied.


## MPB range evidence rule — 6 September 2026

For MPB UK, do not create one candidate per SKU when a single exact model page aggregates multiple used units. Create one `used_uk` pending candidate for the exact product page with `reference_only=true`, `reference_price_min`, `reference_price_max`, conditions represented, unit count and canonical verification URL. Approval writes one reference-only catalogue evidence row; denial leaves the catalogue unchanged. This evidence never changes automatic pricing.


---

# 6 September 2026 — AI Research Completed-Decision Audit Simplification

The active **Review, edit and decide** evidence area in the AI Research Centre is no longer the primary review workspace.

Current routing:

- pending evidence remains in Supabase and is reviewed from the **Automatic Quote Catalogue**;
- **Rejected findings** remain visible in the AI Research Centre for audit and Gemma learning;
- successful accepted findings appear in **Applied to live evidence**;
- an accepted finding that cannot be applied is retained in a visible **Live application issues** recovery section so an application failure cannot disappear silently.

No database schema, RLS, review-feedback RPC or live-evidence application RPC was changed.


## Deep Source URL history — 6 September 2026

The **Landing page URL** control now remembers previously used valid Deep Source URLs on the staff device/browser and presents them as dropdown suggestions. Entering a new valid full URL adds it to the history; duplicates are moved to the top. The selected URL remains explicit for every run and is still passed as `deep_source_url`.

This history is a convenience layer only. It does not alter source isolation, evidence scope or the exact Deep Source URL selected for the audit.


## Deep Source website selection and source-filter isolation — 6 September 2026

The Deep Source landing-page field now uses the approved GearCashOut source registry as its primary suggestion list. Approved, enabled, live quote_catalog_ai_sources.homepage_url values are offered in the dropdown, with local previously used URLs appended without duplication.

Deep Source runs are isolated from the normal All Sources / Amazon UK Only selector. The dashboard sends evidence_scope: deep_source plus the selected deep_source_url; the worker Edge Function routes that request directly into ai_research_create_deep_source_run(...). The normal all/Amazon branch is not used.

For operators: seeing All Sources selected while preparing a Deep Source audit does not broaden that Deep Source audit. The selected landing-page domain controls the Deep Source run.


---

## Shared product filters and separate workflow controls — 6 September 2026

When operating the AI Research Centre, first choose the catalogue products using the shared filters:

- Manufacturer;
- Model / search term;
- Category;
- Product type.

These filters are valid for both **Regular AI Research** and **Deep Source Website Audit**.

Then choose the workflow:

### Regular AI Research

Uses:

- Market / condition;
- All Sources or Amazon UK Only;
- **Regular research batch size**;
- optional Continuous mode.

### Deep Source Website Audit

Uses:

- selected Deep Source landing-page URL;
- **Deep Source audit batch size**;
- explicit `evidence_scope=deep_source`.

Deep Source ignores the Regular AI Research market/source controls. Its selected landing-page domain is the source boundary.

The two batch-size controls are intentionally independent. Do not assume changing one changes the other.


## Deep Source Audit live run controls — 6 September 2026

The AI Research dashboard now treats a Deep Source Audit as an active run while any of its queue rows are queued, claimed or processing, even if the run record itself still says queued. This matters because the Research PC changes queue rows to processing before the run is marked complete.

The RUN DEEP SOURCE AUDIT button therefore changes to a live progress state such as DEEP AUDIT RUNNING · 3/5 and a visible CANCEL DEEP SOURCE AUDIT control appears beside it. Operators no longer need to scroll to STOP ALL RESEARCH & WORKER merely to stop one Deep Source test.

Cancellation is targeted: ai_research_cancel_run(uuid) marks only that run as cancelled and changes its queued/claimed/processing items to skipped. It does not stop the Research PC, continuous research or unrelated runs. ai_research_complete_queue_item(...) now refuses to overwrite a skipped item, preventing a worker that finishes moments later from resurrecting cancelled work.

The local Research PC worker now re-checks run state before submitting candidates and recognises RUN_CANCELLED, so a cancellation stops further evidence from being written after the current long page operation reaches a cancellation check.


## Pending evidence review — field-level source-page shortcuts — 6 September 2026

When manually checking pending AI evidence in the Automatic Quote Catalogue, the reviewer no longer has to scroll to the bottom action area to open the source page.

The canonical candidate source URL can now be opened directly beside:

1. FROM / TO PRICE RANGE;
2. PRODUCT / MODEL / PACKAGE;
3. EXACT PRODUCT PAGE URL;
4. the editable Exact source URL field.

All shortcuts open the same candidate canonical source URL in a new tab. They are navigation-only controls: they do not save edits, mark a field as checked or change the accept/deny workflow.


## Pending evidence review — bulk “AI WAS RIGHT” shortcut — 6 September 2026

When every field on a pending evidence card has been checked and is correct, use **CHECK ALL — AI WAS RIGHT** at the top of **VERIFY EACH FIELD**. This sets every field outcome to AI WAS RIGHT at once. You can still override any individual field afterwards; the checkbox then shows that the review is no longer unanimously correct.

The checkbox does not accept, save or apply the evidence by itself. Finish with the normal **ACCEPT & ADD TO CATALOGUE** action.


---

## 6 September 2026 — Mismatched evidence preservation rule

**Permanent rule: valid evidence must not be discarded solely because the originally targeted catalogue product is wrong.**

The previous database contract rejected `variant_match='mismatch'` or `package_match='mismatch'` before review. This was unsafe for package-heavy product families because valid MPB/retailer evidence could be lost when Gemma or deterministic matching attached it to the wrong catalogue row.

Current behaviour:

- mismatch findings remain pending;
- mismatch remains visible as an error/attention state;
- staff can route the same candidate to the correct catalogue product;
- the original target and reassignment history are retained;
- no evidence is duplicated or recreated;
- normal human verification still happens before acceptance and live application.

Authorities:

- submission: `ai_research_submit_candidate(...)`
- reassignment: `reassign_ai_candidate(uuid,uuid,text)`
- candidate record: `quote_catalog_ai_candidates`
- reassignment audit: `quote_catalog_ai_candidate_reassignments`
- review UI enhancement: `admin-catalog-ai-evidence-reassignment.js`

Do not solve future package/model mismatches by filtering them out of the database again. Preserve first, route second, verify third.


### 2026-09-06 UI clarification fix — marking a wrong target

The pending-review **VERIFY EACH FIELD → PRODUCT / MODEL / PACKAGE → AI WAS WRONG** control is now a direct trigger for the reassignment workflow. Selecting it immediately reveals the **VALID EVIDENCE — WRONG TARGET DETECTED** panel and destination-product selector. Package Match or Variant Match = Mismatch also triggers the same panel. This avoids requiring staff to understand that the verification outcome and package/variant metadata were previously separate controls.

### 2026-09-06 searchable reassignment catalogue selector

The **VALID EVIDENCE — WRONG TARGET DETECTED** reassignment control now includes keyword search across all active catalogue products. Staff can search by manufacturer, model, package name, package key, or other matching keywords before selecting the destination product. The destination list is no longer restricted to the currently targeted manufacturer, preventing valid evidence from becoming trapped when the wrong manufacturer/model/package was initially identified.

## 6 September 2026 — Deep Source identity-depth correction

The MPB screenshots exposed that the worker was discovering the correct deep exact product URLs, but its search identity was still too broad in two ways:

1. Deep Source only used the first/base product search name for internal and external discovery, so a specific package/kit identity could be ignored.
2. Exact-model validation allowed the full page body to prove the model. On MPB, “You might also like” and “Similar products” sections can mention another model/package, creating a false positive even when the page title and canonical URL describe a different product.

Worker **1.5.2** now:

- runs every real catalogue search identity from productSearchNames(...), including specific package/kit names;
- derives MPB direct exact-page URLs for each identity, not only the base model;
- repeats MPB web discovery and source-specific internal search for each identity;
- validates Deep Source identity from the page title and canonical product URL rather than related-product text;
- marks valid same-model evidence with a package mismatch as **VALID EVIDENCE — WRONG TARGET / PACKAGE DETECTED** instead of silently treating it as an exact match.

This keeps the existing preservation/reassignment workflow intact while making the crawler more specific and deeper for named packages and kits.


## Mavic 2 package-depth lesson — 2026-09-06

The MPB Deep Source correction must distinguish **model identity** from **catalogue package identity**.

For the Mavic 2 family, accepted catalogue identities now include:

- Mavic 2 Pro — Standard Package
- Mavic 2 Pro — Fly More Combo
- Mavic 2 Pro — With DJI Smart Controller
- Mavic 2 Pro — Fly More Combo with Smart Controller
- Mavic 2 Zoom — With RC1 Controller
- Mavic 2 Zoom — Fly More Combo
- Mavic 2 Zoom — With Smart Controller

The following are separate accessory products:

- Mavic 2 Zoom ND Filter Kit
- Mavic 2 Pro ND Filters Set

Operational rule: when an exact page proves a different package or accessory, **preserve and route** the evidence to the exact identity. Do not attach it to the base aircraft merely because the model tokens match.

The Mavic 2 Zoom ND Filter Kit finding from the Deep Source run was reassigned from the Zoom aircraft to its new accessory product and applied. The exact RC1 Controller finding was applied to the corrected RC1 package identity. Duplicate discovery of the same RC1 page was reconciled to the same evidence row rather than creating a second live price.


## Deep Source exact-package discovery rule — 6 September 2026

When Gemma reaches a category or model-family page, she must continue to exact product pages and classify the exact identity before assigning evidence.

A base-model match is not enough when the page title identifies a distinct:

- controller package;
- Fly More/Combo/bundle;
- kit;
- filter/lens/accessory;
- other named variant.

If the exact identity is absent from the catalogue, preserve the source finding and create a **NEW PRODUCT CANDIDATE** for staff review. Do not discard it and do not force its price into a generic Standard Package.

Nothing discovered this way becomes live automatically. Staff must approve the product candidate and create a draft catalogue product through the existing review workflow.


---

## 6 September 2026 — Mavic 3 exact-package correction and evidence reassignment

A review of the DJI Mavic 3 MPB Deep Source findings confirmed the same failure pattern previously seen in the Mavic 2 family: broad family matching had allowed distinct MPB model/package pages to accumulate under **DJI Mavic 3 — Standard Package**.

The catalogue and evidence were corrected using the exact MPB product-page identity, not the family name alone.

### Exact identities added or separated

- Mavic 3 Enterprise — With RC Pro Enterprise Controller
- Mavic 3 Pro Cine — Premium Combo with RC Pro Controller
- Mavic 3 Classic — Fly More Combo
- Mavic 3 Pro — Fly More Combo
- Mavic 3 Pro — Standard Package

Existing exact catalogue rows were also used for:

- Mavic 3 — Standard Package
- Mavic 3 — Fly More Combo
- Mavic 3 — Cine Premium Combo
- Mavic 3 Classic — Standard Package
- Mavic 3 Intelligent Flight Battery

The MPB Mavic 3 Enterprise reference evidence was moved from the generic Enterprise Standard Package to the exact RC Pro Enterprise Controller package.

All Mavic 2/Mavic 3 findings from the reviewed batch were cleared from **pending**. Exact findings were applied to the matching catalogue identity; one duplicate discovery of the same exact Mavic 3 MPB page was retained as rejected audit history rather than creating duplicate live evidence.

### Permanent matching rule reinforced

For package-heavy families, the worker must treat these as separate identities when the exact source page says so:

- base model;
- controller-specific package;
- Fly More/Combo package;
- Cine/Premium package;
- Classic/Pro/Enterprise variant;
- battery, filter, lens or other accessory.

A family-name match alone is not sufficient to place evidence into a Standard Package.

When the exact identity is already in the catalogue, route evidence there. When it is not, preserve the evidence and surface a new-product candidate/reassignment path. Do not force the evidence into a generic package and do not discard it.


---

## DJI package-identity checkpoint — 6 September 2026

### Trigger

A live Gemma regression test found **Used DJI Mini 2 with RC-N1 Controller | MPB** and matched it to the catalogue's generic **Mini 2 — Standard Package**. The model match was correct, but the catalogue identity was too vague to teach the system what the base package actually contained.

### Implemented database normalisation

The following live quote_catalog_products records were renamed and given controller-specific package keys:

- Air 2 → `Standard Package (DJI RC-N1)` / `standard-rc-n1`
- Air 2S → `Standard Package (DJI RC-N1)` / `standard-rc-n1`
- Mavic Air → `Standard Package (Mavic Air Controller)` / `standard-mavic-air-controller`
- Mini 2 → `Standard Package (DJI RC-N1)` / `standard-rc-n1`
- Mini 4K → `Standard Package (DJI RC-N1)` / `standard-rc-n1`

### Non-negotiable matching lesson

Do not treat every generic DJI “Standard Package” record as safely equivalent to one controller configuration. Some MPB model pages legitimately contain mixed controller variants. The first failure point must be identified from the candidate title, package/controller evidence and catalogue identity before splitting or reassigning records.

### Next work

Use a broader DJI research pass as a regression test. Inspect candidate → package/variant match → catalogue target, especially for:

- RC-N1 / RC-N2 / RC-N3;
- DJI RC / RC 2 / RC Pro;
- Fly More / Combo / Premium;
- aircraft-only and no-controller listings;
- accessories and batteries.

Do not publish uncertain mixed-controller evidence automatically.


## 6 September 2026 — Large and whole-manufacturer Deep Source audits

The previous **25-product UI ceiling** was not a crawler limitation. It came from the Deep Source dashboard options and an Edge Function clamp. The database RPC separately capped positive requests at 100, creating inconsistent limits across the execution path.

Deep Source now supports:

- 1, 3, 5, 10, 25, 50, 100, 250 or 500 products; and
- **ALL matching products**.

For safety, ALL matching products requires at least one shared product filter. Selecting a manufacturer therefore provides the intended **whole manufacturer audit** without accidentally queuing the entire catalogue.

The RPC treats `p_limit <= 0` as no SQL limit while retaining the existing manufacturer/model/category/product-type filters. Positive Deep Source limits are capped at 500 by the Edge Function. Regular AI Research retains its existing separate batch behaviour.


## 6 September 2026 — Match-status contract repair (worker 1.5.4)

### Failure identified
The live Supabase RPC ai_research_submit_candidate accepts only four package/variant status values: exact, compatible, uncertain, mismatch.

The DJI Deep Source run exposed a producer-path inconsistency: Deep Source identity code could emit match, while the database contract rejects that value as Invalid match status.

### Repair
Worker 1.5.4 introduces one canonical status boundary. Every package/variant status is normalised immediately before RPC submission. The Deep Source exact-identity producer now emits exact directly rather than match.

This is deliberately a worker-side compatibility repair. The database contract remains strict so invalid future producer values cannot silently enter the catalogue.

### Required verification
After the Research PC reports worker 1.5.4, run a small controlled Deep Source test before another large manufacturer audit. Confirm that valid exact MPB candidates no longer fail with Invalid match status.


---

## 6 September 2026 — Phase 2 retail storefront infrastructure started

A new Phase 2 backend foundation was added after inspecting current project memory, GitHub sales/inventory code, live Supabase schema, resale functions and RLS.

### Preserve existing architecture

Do not replace the existing multi-channel resale system. The retail website is another channel using the same central inventory truth. Existing `resale_listings`, `handle_resale_listing_sold`, `staff_mark_resale_listing_sold` and inventory sold-state logic remain authoritative.

### Added foundation

- nullable `inventory_assets.catalog_product_id` FK to `quote_catalog_products`;
- brand-neutral `sales_storefronts` and visibility override infrastructure;
- reusable master-product sales content separated from physical-item condition content;
- controlled explicit asset-to-catalogue linking to avoid ambiguous automatic package/model matches;
- sales-permission-gated read-only evidence RPC for pricing decisions.

### Security rule

Sales evidence access is read-only. Sales staff use evidence to set prices; this infrastructure does not grant evidence editing or live-evidence application rights.

### Next implementation sequence

1. trace and connect the existing inventory creation path to an exact catalogue product where identity is already known;
2. add staff sales-dashboard UI for explicit catalogue linking and read-only evidence;
3. define website channel semantics using the existing `resale_listings` workflow;
4. create the separate branded storefront repository once the name/domain is chosen;
5. add public storefront read models without exposing internal evidence, purchase costs or customer data.

Roadmap: `docs/DIAGNOSTIC-ROADMAPS/PHASE2-RETAIL-STOREFRONT.md`


## 6 September 2026 — DJI evidence reassignment and catalogue cleanup

- Fixed the live reassign_ai_candidate(...) RPC so it runs as SECURITY DEFINER while retaining its explicit staff check; this prevents the reassignment audit insert from being blocked by RLS.
- Compact mismatch routing UI: each VALID EVIDENCE — WRONG TARGET DETECTED workflow is now collapsed by default and opens only when routing is needed.
- During the DJI/MPB audit, clear controller/package identities were normalised to exact, accepted and applied to live comparison evidence.
- Clear wrong-target cases were reassigned conservatively: RC-N1, RC1, RC Pro Enterprise, Drone Only and generic Standard Package destinations where the source identity supported them.
- Generic evidence was not forced onto controller, Fly More, Plus, Cine or other specific variants without source support; those cases remain for review.
- Duplicate candidates may point to the same live evidence row after application; this is expected and avoids duplicate market evidence.


## 6 September 2026 — Learning from audit corrections

Gemma's learning is not limited to the model's static prompt. The Research PC loads active rules from Supabase table `quote_catalog_ai_learning` for the relevant manufacturer/product type and passes them into every Ollama validation request.

The DJI audit has added explicit rules explaining the reason behind catalogue corrections: controller identity, generic-versus-specific bundles, **No RC → Drone Only**, uncertainty when package wording is absent, MPB exact-page requirements, and package-aware duplicate checks.

Worker **1.5.5** also uses the catalogue duplicate check before creating a new Deep Source product candidate. It flags only high-confidence same-package matches as likely duplicates; a different controller or bundle is preserved as a potentially distinct catalogue identity.

This is the intended direction of the learning loop:

**Search → collect → deterministic validation → Gemma review with prior learning → database duplicate/package checks → pending evidence → human correction → structured feedback/learning → next Gemma run.**

Gemma must still not auto-accept uncertain evidence or silently create catalogue products.


### Phase 2 follow-up — exact catalogue identity propagation

The actual inventory creation path was traced before modification. `staff_mark_sale_paid_and_create_inventory` is the primary path that creates received inventory after payment confirmation; quote items currently store manufacturer/model/package rather than a catalogue UUID. Therefore the repair adds a deterministic resolver using exact normalised manufacturer + model + package and links only when exactly one catalogue row exists. Never broaden this to fuzzy matching without a separate identity review design. Ambiguous results must remain NULL and be resolved by staff.


### Inventory identity rule — SKU vs catalogue product ID

Do not confuse the two identities:

- `catalog_product_id`: master catalogue/product identity; multiple physical units can share it.
- `inventory_assets.sku`: unique immutable identity for one physical purchased unit.

Every newly inserted inventory asset receives its SKU from `next_inventory_sku()`, and the column is NOT NULL with a unique index. Preserve SKU across inspection, warehouse moves, listing and sale. Do not regenerate it when an item changes channel or location.

Warehouse growth uses `inventory_locations` plus append-only `inventory_location_movements`. Do not treat free-text `current_location` as the future audit history; the movement table is the historical record.


### Outlet architecture rule — Phase 2

Treat these as separate layers:

- `inventory_assets` / SKU = the physical unit;
- `sales_outlets` = where the unit may be offered;
- `resale_listings` = one listing of that SKU on one outlet.

Do not duplicate inventory records for different websites. Multiple listings may coexist for one SKU. The existing database-level sold/delist workflow remains authoritative. A UI must read listing status from the database and must not independently calculate competing-listing closure state.

Before adding a new owned brand or auction outlet, register it in `sales_outlets`; then connect its listing/publication layer to the same `resale_listings.asset_id`.


### Package equivalence learning

When retailer wording differs from the catalogue title, Gemma must resolve the underlying identity rather than perform literal title matching. Check manufacturer → model → controller → bundle → included accessories → variant. Record alternative wording with its retailer/domain, supporting evidence, confidence and reason.

Use **confirmed / probable / ambiguous** states. Do not invent aliases or silently promote a guess. A retailer-specific pattern remains source-specific until independently supported elsewhere. Any positive controller or bundle conflict blocks automatic equivalence.


### Dynamic Sales Workbench rule — security and outlet registry

Do not restore a hard-coded outlet/channel list in `sales-workbench.js`. Load only active records from `sales_outlets` through the authenticated Supabase client. New listings must persist both the compatibility display channel and the authoritative `outlet_id`.

The client UI may present outlet choices but must not be treated as the security boundary. RLS and staff authorization remain the database boundary, and sold/delist state must continue through the authoritative database workflow. Never expose service-role credentials in any GitHub Pages/public JavaScript.


---

## Package-equivalence learning update — 6 September 2026

Live DJI/MPB review added a practical controller-aware rule to the existing package-equivalence framework:

1. Read the exact product page, including the observed “What’s included” data where available.
2. Treat a positive controller identity as stronger evidence than a vague catalogue label.
3. If every observed unit shares one controller, map to that controller package.
4. If units on one aggregate page have different controllers, do not auto-assign the whole range to one package.
5. Do not infer Fly More, Plus, Cine, Creator or another bundle from controller identity alone.
6. Explicit “No RC” maps to Drone Only.
7. Exact accessory titles must leave the drone family and route to an exact accessory catalogue identity.
8. When a retailer exposes a real recurring controller configuration missing from the catalogue, create a narrowly named canonical package rather than forcing it into an incorrect existing bundle.

This correction pattern should be stored as explainable learning, not as a loose synonym list.


### Management-facing links rule — Outlet Registry

Management-only operational pages must be reached from the central `admin.html` Staff Dashboard and protected by both UI/session checks and database authorization. Do not rely on hidden navigation as security.

For `admin-outlet-management.html`:

1. require an authenticated session;
2. require `staff_users.active = true`;
3. require `staff_users.can_manage_staff = true`;
4. rely on `sales_outlets` RLS for database enforcement;
5. prefer deactivation over deletion to preserve historical listing references;
6. never place service-role credentials or other secrets in public JavaScript.




### Slow-moving stock strategy rule

Use `management_stock_strategy_report()` only as a management advisory/reporting layer. It must not become an automatic repricing, automatic delisting, automatic auction-transfer or inventory-status mutation mechanism without a separately designed and audited workflow.

Security requirements:

- authenticated active management permission is checked inside the RPC;
- public access is revoked and only authenticated execution is granted;
- the page performs its own active-management guard but database authorization remains authoritative;
- only unsold/non-disposed inventory is reported;
- listing status is read from central `resale_listings`.


### Outlet coverage and controlled handoff rule

The stock strategy layer may calculate missing outlet coverage and provide a direct link into the existing SKU Sales Workbench. It must not automatically create listings merely because an outlet is missing.

Coverage is calculated from:

- active records in `sales_outlets`;
- active listing statuses in `resale_listings`;
- the central `inventory_assets` SKU.

A missing outlet means the active registry contains an outlet without a Draft, Ready For Listing, Published or Reserved listing for that SKU. It is a management signal, not an instruction to publish everywhere.


### Sales Dashboard management-attention rule

The Sales Dashboard may contain a compact management-only summary of stock strategy, but it must remain a summary and controlled navigation layer.

For the management attention panel:

1. require the authenticated user's own active staff_users record;
2. display the panel only when can_manage_staff = true;
3. obtain strategy counts through management_stock_strategy_report();
4. keep the detailed action workflow in admin-stock-strategy.html and the existing Sales Workbench;
5. never expose management-only information merely by CSS hiding — the RPC/database permission remains authoritative;
6. do not introduce automatic listing creation, publishing, repricing, delisting or auction transfer from dashboard summary logic;
7. refresh the operational pipeline independently from the management summary to avoid unnecessary management-RPC polling.

The current implementation refreshes the normal sales workflow frequently and the management stock summary on a slower interval.


### Alternative-product routing rule — 6 September 2026

When a pending finding is valid but the original catalogue target is wrong, keep the finding and expose **ROUTE TO AN ALTERNATIVE PRODUCT**. Select the exact canonical destination using manufacturer → model → controller → bundle/package → accessories → variant. This is reassignment, not duplication: preserve one candidate and its audit trail, then continue normal verify/accept/apply review. Do not deny valid evidence merely because the first target was wrong.


### Unified live-task intelligence rule

live-task-board.js is the shared central action layer used by the main Staff Dashboard, Purchasing Dashboard and Sales Dashboard.

When changing it:

1. derive tasks from existing authoritative workflow records; do not create a competing task truth unless a separate task system is explicitly designed;
2. assign explicit forced priority only to actions whose urgency is inherent in the workflow;
3. retain age-based escalation for ordinary workflow actions;
4. use the ranking order **CRITICAL → PRIORITY → OVERDUE → CURRENT**;
5. keep **FOCUS NEXT** as a navigation recommendation, not an automatic action;
6. deduplicate only identical task identities; never merge different required actions merely because they concern the same SKU;
7. category filters must affect only browser display, not underlying database state;
8. preserve the existing RLS/security boundary and do not introduce service-role credentials into browser code;
9. version every dashboard page that loads the shared task-board script after material changes so cached staff pages receive the current workflow logic.

Current explicit priority examples:

- Delist Required marketplace listings → **CRITICAL**.
- confirmed customer payment awaiting staff recording → **PRIORITY**.
- Repair Required inventory → **PRIORITY**.

All other ordinary tasks continue through age-based escalation unless a later verified workflow requirement changes this rule.


## Compact mismatch-routing interface — 6 September 2026

A large mismatch batch can contain many valid findings awaiting rerouting. The catalogue therefore uses lazy-open routing controls: show a compact route button first, then load the searchable alternative-product selector only for the evidence item staff chooses to route.

The underlying rule is unchanged: preserve valid evidence, route it to the exact canonical product, record the reassignment, then continue normal review/acceptance. Interface compactness must never be implemented by hiding or discarding the pending candidate.


### UI stability rule — server-backed mismatch state

Do not repeatedly remove and recreate routing controls when editable UI fields have not yet reflected the server-backed mismatch. Cache the confirmed route-required state for the card and guard concurrent lookups. A MutationObserver must never be allowed to generate an add/remove cycle that freezes the staff page.


### Regression rule — never cache startup uncertainty as a negative decision

For server-backed UI state, null because Supabase/auth is not ready is unknown, not not-required. A negative UI state may only be cached after a successful authoritative lookup. When retrying asynchronously, preserve the MutationObserver loop guard: retries may refresh state but must not create repeated add/remove DOM mutations.


### UI search rule — large catalogue selectors

Do not preload thousands of records into a native select when the user is expected to search. Keep the authoritative catalogue query, but render only bounded search results after a meaningful query. This prevents UI lag from being mistaken for a failed or inactive search and does not change matching or reassignment decisions.


### DOM observer rule — avoid self-triggering full-page rescans

When an observer is needed for dynamically rendered catalogue cards, never respond to every mutation with a full-document query plus DOM writes. Observe the required container, batch added roots, and process only relevant pending-candidate cards. This avoids feedback loops and scroll/render instability while preserving dynamic-card support.


### Controlled test stock rule — 6 September 2026

When production-like inventory is required before genuine stock exists:

- prefer real catalogue-linked inventory_assets over an invented parallel test table;
- use the production SKU generator;
- clearly mark every manually created sample record as TEST DATA in its notes/reference fields;
- do not attach fake customer identities, bank payments or genuine financial events merely to create stock;
- verify all database CHECK constraints before selecting workflow statuses;
- create outlet/listing scenarios only with statuses permitted by the live schema;
- confirm the existing test-data reset function removes downstream resale_listings, resale_transactions and inventory_assets before relying on a sample batch;
- do not run the destructive reset as a verification step while the batch is still needed.

Current Phase 2 sample batch:

- 8 inventory assets;
- 4 resale listings;
- all linked to existing quote_catalog_products;
- all cleared by the existing management-only reset_test_quote_data() function while test reset remains enabled.


## Regression repair — pending evidence shudder and missing route control (6 September 2026)

A previous sequence of fixes alternated between two failures: restoring the routing control with repeated scanning eventually destabilised the page, while removing the unstable scanning could leave the control absent.

The permanent rule is to separate state rendering from interaction handling:

1. The pending-review renderer already has the authoritative candidate fields, so it must render the compact route button immediately when persisted package/variant mismatch exists.
2. The reassignment script must react to that button and direct edits only.
3. Do not use a document-wide MutationObserver to rediscover every pending card.
4. Do not repeatedly replace the whole pending evidence section after startup.
5. Preserve lazy loading of the alternative-product search panel so thousands of catalogue products are never rendered until staff opens a route control.
6. Server-side reassign_ai_candidate(...) and reassignment audit history remain authoritative.

This is the required baseline for future changes to mismatch routing.


## Catalogue cleanup audit — 6 September 2026

A post-repair cleanup removed obsolete catalogue bootstrap and legacy scripts that were no longer referenced by the live page. The old bootstrap could dynamically inject the market-structure and evidence-tools scripts even though the page already loaded them directly, creating a risk of duplicate listeners and duplicate observers.

The live catalogue now has one direct load path for those scripts. The reassignment layer also had leftover retry/refresh code from the earlier observer-based approach; that unreachable discovery path was removed. Route controls remain renderer-owned and interaction remains event-driven.

Removed legacy/unreferenced files:
- admin-catalog-boot-fix.js
- admin-catalog-accordion-fix.js
- admin-catalog-accordion.js
- admin-catalog-discontinued-label.js
- admin-catalog-list-active.js
- admin-catalog-online-comparison-guard.js
- admin-catalog-online-comparison-history.js
- admin-catalog-online-comparison.js

Do not restore dynamic duplicate script injection or the retired route-state rescan path unless a new, tested ownership model is documented first.


### Duplicate listing closure debugging rule — 6 September 2026

When a dashboard warning says a listing must be closed, do not assume the Sold Items page is sufficient context.

The first diagnostic checks are:

1. query the exact `resale_listings` rows with `status='Delist Required'`;
2. identify the linked `inventory_assets` SKU;
3. query **all sibling listings for the same asset_id**;
4. identify the Sold sibling using `sold_listing_id` or `status='Sold'`;
5. show the exact listing that must be closed and all other channels;
6. provide an explicit handoff to `listing-readiness.html?id=<asset_id>`;
7. never imply that GearCashOut can automatically remove a third-party listing.

Do not filter the closure context only to inventory assets already selected by a Sold Items history query. The authoritative closure queue is `resale_listings.status='Delist Required'`.

Security rule: the closure confirmation RPC must require `staff_users.active=true`.


## Duplicate catalogue consolidation learning — 6 September 2026

When a catalogue package is removed because it overlaps another canonical identity, Gemma must not solve the deletion by guessing a new destination for every attached finding.

Use this sequence:

1. Read the source identity.
2. Identify explicit model, controller, bundle and accessory facts.
3. Route only clear exact matches to the surviving canonical product.
4. If identical evidence already exists there, do not duplicate it.
5. Leave ambiguous model-level/package-unknown evidence unresolved; do not mark it exact.
6. Keep accessory-only evidence separate from complete drone/package pricing.
7. Remove stale candidate decisions created by a previous forced-routing mistake and record the correction as learning.

### Mavic 3 Classic correction

During consolidation, exact Fly More Combo evidence was moved to **Fly More Combo** and exact DJI RC evidence to **Standard Package (DJI RC)**. Official Drone Only evidence already existed on the correct destination, so redundant duplicate copies were removed. Generic MPB Mavic 3 Classic evidence and exact Fly More Kit accessory evidence were not forced into another drone package.

**Hard learning rule:** ambiguity is a valid outcome. Never manufacture package certainty to keep a record attached to a catalogue row.


---

## Current Lesson — Apparent Valuation Dropdown Duplicates — 6 September 2026

A customer-side report of duplicate Mavic 3 Classic packages was checked against live Supabase before any destructive catalogue action.

The live catalogue did **not** contain duplicate normalised Mavic 3 Classic identities. It contained four legitimate package keys: `drone-only`, `fly-more-combo`, `rc-n1`, and `rc`.

Therefore:

1. do not delete controller-specific packages merely because their labels both contain “Standard Package”;
2. verify duplicate identity using manufacturer + model + package key;
3. treat browser/client duplication separately from catalogue duplication;
4. use the valuation dropdown guard as defence-in-depth;
5. preserve distinct RC-N1 and DJI RC package identities.

The customer valuation page now loads a fresh version of `quote-reverse-basket-v5.js` and `quote-catalog-dropdown-guard.js`, which removes only true duplicate dropdown options while preserving legitimate variants.


### Product Workbench repair-state diagnostic rule — 6 September 2026

If **SEND TO SALES** is disabled after inspection/testing appears to pass:

1. inspect the live `inventory_assets.status`;
2. inspect the latest `inventory_testing` inspection and testing rows;
3. compare the current status with the state-machine transition branches;
4. specifically check the `Repair Required` → `Testing` → `Ready for Resale` path;
5. do not bypass the state machine by directly marking the asset Sent to Sales.

Confirmed fault: the Product Workbench handled `Testing` → `Ready for Resale`, but did not handle a repaired asset whose post-repair testing was saved while still in `Repair Required`. The minimal repair performs the two controlled transitions when the post-repair checks pass.


### Repair Required workflow rule — 6 September 2026

Do not treat `Repair Required` as a label that can be cleared manually. Before allowing an asset back into testing, verify the live asset status is `Repair Required`, the fault is visible, a repair record is created through `staff_complete_inventory_repair(...)`, any repair cost is recorded in `inventory_expenses`, and the function moves the asset to `Testing`. Post-repair testing must then pass normally before `Ready for Resale`.

When repairing this workflow, inspect the live `inventory_expenses_category_check` constraint before changing the RPC. `Repair` is a required allowed category because the RPC writes linked repair costs transactionally. If the category constraint omits `Repair`, the RPC fails and rolls back without creating the repair record.

Never restore the previous shortcut where a passing inspection/testing save could move an asset directly out of `Repair Required` without a recorded repair.


### Sales Dashboard repair count rule — 6 September 2026

When changing `admin-sales-dashboard.js`, keep `Repair Required` visible as its own pipeline count. Do not silently merge it back into the general Inventory card. The dashboard reads `inventory_assets.status`; general Inventory excludes `Repair Required`, and `repair-count` is calculated separately. A repair state is operationally blocked and should use the red repair pipeline styling when work exists.


---

## Multi-AI Coordination and Shared Project Memory — 6 September 2026

### Current multi-agent arrangement

More than one ChatGPT technical agent may be working on GearCashOut at the same time.

Current known streams include:

- **AI research stream:** Quote Catalogue, evidence, Gemma, Research PC, Ollama, package matching and research learning.
- **Sales stream:** inventory, testing, repair, resale, listings, sales dashboards and related operational workflows.

Both streams use the same repository and Supabase project. Therefore, neither agent may treat its own conversation history or checkpoint as the complete current system state.

### Mandatory shared-state retrieval

Before material work, retrieve and compare:

1. relevant Supabase project-memory rules;
2. current checkpoints relevant to the task;
3. recent project-memory events, especially from other areas;
4. current GitHub code and recent commits;
5. current Supabase schema and affected live data.

If another agent has recently changed a shared dependency, inspect that change before editing.

### Concurrent checkpoint rule

Do not replace another workstream's checkpoint simply because it is the newest current checkpoint. Checkpoints describe work context; they do not grant exclusive ownership of the whole project.

For cross-stream coordination:

- record material work as area-specific events;
- keep the active task area explicit;
- reference commits/database objects where possible;
- avoid changing another stream's documented workflow without inspecting it;
- update both manuals when a change alters system-wide behaviour.

### Conflict prevention

If repository state, Supabase state and memory disagree, treat **current deployed code/database state** as the operational fact to investigate, then correct the documentation and memory.

Never resolve a disagreement by assuming one AI's earlier explanation is authoritative.

### Shared-memory principle

The working model is:

**Research AI discoveries + sales/inventory changes + human decisions → shared Supabase memory → current GitHub/Supabase verification → both manuals updated where relevant.**

This is the continuity mechanism that allows separate AI workstreams to contribute to one coherent system without relying on private conversation memory.


---

# Product Workbench Rule — Repair Completion Marks Tested (6 September 2026)

A user decision changed the previous explicit repair workflow.

Do **not** reintroduce the old path:

`Repair Required → Repair → Testing → manual post-repair test save → Ready for Resale`

Current required path:

`Repair Required → secure repair record + explicit Passed testing record → Ready for Resale`

The authoritative backend is `staff_complete_inventory_repair(...)`.

Before changing this workflow:

1. inspect the current RPC definition;
2. inspect `inventory_repairs`, `inventory_testing`, `inventory_expenses` and `inventory_assets`;
3. preserve the active-staff check and `FOR UPDATE` asset lock;
4. preserve the requirement that the asset is currently `Repair Required`;
5. preserve transactional repair-cost handling;
6. create a tracked testing record rather than using an untracked status bypass;
7. do not auto-send the item to Sales.

Front end owner: `inventory-workbench.js`.

Repository checkpoint: `CHECKPOINTS/2026-09-06-repair-completion-marks-tested.md`.


## Product Workbench Rule — Inspection Requires Repair Routing (6 September 2026)

A staff inspection outcome of **Requires Repair** is a completed inspection that routes the item into the repair workflow.

Required path:

`Inspection Required → Requires Repair → Repair Required → Record repair + mark tested → Ready for Resale`

Before changing this area:

1. inspect `inventory-workbench.js`;
2. inspect `asset-state-machine.js` and confirm the transition is valid;
3. inspect the live `inventory_assets` and latest `inventory_testing` rows;
4. preserve the secure `staff_complete_inventory_repair(...)` workflow;
5. do not leave a repairable item stranded in `Inspection Required`;
6. do not create a false passing testing result merely because the inspection result was saved;
7. preserve legacy handling for existing `Requires Attention` records.

The user-facing inspection selector should say **Requires Repair**. The successful routing notification must explicitly confirm that the item has moved to **Repair Required**.

First confirmed failure: TEST-ASSET-006 / DJI Neo saved `Requires Attention` but remained `Inspection Required` because the transition branch handled only `Failed`.
### Sales gate compatibility after Requires Repair

Do not create a false historical `Passed` inspection merely to satisfy `staff_send_inventory_to_sales(...)`. A repair-required inspection may satisfy the inspection gate only when an authoritative `inventory_repairs` record exists. Technical testing, condition, missing-item and Ready for Resale requirements remain mandatory. Repository migration: `20260906214500_allow_repaired_inspection_to_pass_sales_gate.sql`.

---

## Sales Dashboard Quick Stock Search — 6 September 2026

Front end:

`admin-sales-dashboard.html` → compact search form → `admin-sales-dashboard.js`.

Search source: `inventory_assets` using the existing authenticated staff Supabase client and RLS.

Allowed search identities:

1. `sku`
2. `transaction_number`
3. combined `manufacturer + model`

The result renderer must show the authoritative current `status` and hand off to the existing Product Workbench detail route. Do not create a duplicate search table or write inventory state from the search UI.

If inventory volume becomes large, review the current client-side search read and replace it with a controlled server-side search/RPC rather than weakening RLS or exposing service credentials.


## Operating rule — Post-sale fulfilment and customer returns (6 September 2026)

**Workstream:** Sales / Inventory.

Do not overload `purchase_return_cases`: it is for pre-purchase customer-property returns. Post-sale shipping uses `sales_fulfillments`; buyer returns use `sales_customer_returns`.

Authoritative flow:

- sold truth remains `inventory_assets.status='Sold'` and the existing sold-listing workflow;
- fulfilment: `Sold → Label Created → Ready for Collection (optional) → Collected → Delivered`;
- buyer return: `Requested → Approved → Label Created → Collected → Item Received → Resolved/Refused`.

On physical buyer-return receipt, move the asset to `Returned` for review without deleting the sold history.

Diagnostic entry points: `sold-items.html` + `sold-after-sales.js`, `sales-customer-returns.js`, `purchase-returns.js` and migration `post_sale_fulfilment_and_customer_returns`.

## Product Workbench — Sales Handoff Operating Rule (6 September 2026)

When an asset status is `Sent to Sales`, `Listed`, `Reserved` or `Sold`:

1. do not restart or re-present inspection/testing as an unfinished workflow;
2. preserve the completed `inventory_testing` history;
3. preserve original customer photographs as separate evidence;
4. use `catalog_sales_content` for reusable product/manufacturer content;
5. use `inventory_sales_content` for the actual physical item's condition, listing notes and hero image;
6. permit staff-photo management without mixing staff photos with customer evidence;
7. do not create another sales-description table;
8. keep the Sales Workbench as the operational channel/listing stage.

Current front-end ownership:

`inventory-detail.html` → `inventory-workbench.js` → `inventory-sales-handoff.js` (handoff statuses only).

Diagnostic roadmap: `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`.


---

## Operating Rule — Sold Shipping States and UK Tax-Year Archive (6 September 2026)

This supersedes the earlier rule that treated `inventory_assets.status='Sold'` as the single post-sale state.

Authoritative inventory lifecycle:

`Sent to Sales / Listed / Reserved → Sold - Awaiting Shipping → Sold - Shipped → Archived`

Rules:

1. Marking a resale listing sold sets the inventory asset to **Sold - Awaiting Shipping**.
2. Recording a label does not mean the item has shipped.
3. **Mark Collected / Shipped** moves the asset to **Sold - Shipped**.
4. **Mark Delivered** records delivery and starts the current 30-day operational return hold in `inventory_assets.return_window_ends_at`.
5. A customer return may only be opened for a delivered **Sold - Shipped** item.
6. Do not merge buyer returns with `purchase_return_cases`.
7. After the return hold ends, delivery is recorded and no buyer return is open, `staff_archive_sales_asset(...)` moves the asset to **Archived**.
8. Archiving is non-destructive. The same inventory, inspection, evidence, expenses, listing and sales records remain available.
9. `archive_tax_year` uses the UK tax year boundary: 6 April to 5 April.
10. Legacy `Sold` records remain readable and are normalised into the new shipping flow when staff create fulfilment.

Front-end ownership:

- `sold-items.html` + `sold-after-sales.js` — active post-sale work.
- `sales-archive.html` + `sales-archive.js` — UK tax-year archive.
- `asset-state-machine.js`, `admin-sales-dashboard.js`, `live-task-board.js` — shared lifecycle presentation.

Diagnostic roadmap: `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`.


### Return closure compatibility

If a customer return is resolved or refused **before the item is physically received**, restore the linked `sales_fulfillments.status` to `Delivered`. Otherwise the closed return would leave a permanent `Return Open` fulfilment that blocks later archiving. This compatibility repair is implemented in `staff_update_sales_customer_return(...)`.


### Known post-sale reconciliation fault — TEST-ASSET-007 (6 September 2026)

Observed state:

- `sales_fulfillments.status = 'Collected'`
- linked `inventory_assets.status = 'Sold'`

Expected state after collection is **Sold - Shipped**. The asset was reconciled directly to **Sold - Shipped** after confirming the linked fulfilment collection timestamp. The current live `staff_update_sales_fulfillment(uuid,text)` function was inspected and already contains the correct asset update, so do not invent a root cause or replace the current RPC without reproducing a new failure.

If this happens again, inspect in this order:

1. exact RPC definition in live Supabase;
2. browser network/RPC call and returned error;
3. `sales_fulfillments` row;
4. linked `inventory_assets` row;
5. triggers on the affected tables;
6. only then consider a backend invariant repair.

## Operating Rule — Customer Return Closure and Accounting Data (7 September 2026)

Before changing post-sale customer returns:

1. inspect `sales_customer_returns`;
2. inspect the current live return RPC definitions;
3. keep buyer returns separate from `purchase_return_cases`;
4. do not permit a physically received return to become `Resolved` with only a generic note.

Required flow after receipt:

`Item Received → assessment → damage/condition → item disposition → customer financial/replacement resolution → Resolved`

Required persisted accounting/operational facts include:

- return label cost;
- resolution summary;
- damage assessment;
- item disposition;
- customer resolution type;
- refund method/provider/amount/reference;
- replacement asset/reference where applicable.

The dedicated RPCs are:

- `staff_record_sales_customer_return_label(...)`
- `staff_resolve_sales_customer_return(...)`

The legacy `staff_update_sales_customer_return(..., 'resolve')` path intentionally refuses closure without the detailed record.

Do not automatically move the returned asset into a new resale status merely because the return is closed. `item_disposition` records what happened to the item; downstream inventory routing should remain explicit and auditable.
