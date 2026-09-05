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
4. Preserve each unit as separate market evidence when relevant.
5. Capture SKU, price, cosmetic condition, charges when shown, and meaningful included/package details.
6. Never collapse a multi-unit MPB page to one representative price.
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

The historical MPB audit found that Gemma must not be the authority for expanding a multi-unit MPB model page.

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
