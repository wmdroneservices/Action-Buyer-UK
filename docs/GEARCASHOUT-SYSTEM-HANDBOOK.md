# GearCashOut Human / Developer System Handbook

**Status:** Living document  
**Purpose:** Human-readable operating, developer and technical reference for GearCashOut / Action-Buyer UK.  
**Audience:** Gary, staff, administrators and future developers.  
**AI continuity companion:** docs/GEARCASHOUT-AI-OPERATING-MANUAL.md

> This document is intentionally a living system memory. It should be updated whenever a material workflow, database rule, integration or user-facing process changes. It is not a substitute for the source code or Supabase migrations; where they differ, the deployed code/database must be checked and this handbook corrected.

---

# 1. What GearCashOut Is

GearCashOut is a specialist equipment buying and valuation platform. A customer submits equipment for valuation, GearCashOut assesses it, an offer can be issued, the customer can accept or reject it, and accepted items move through a controlled purchasing, shipping, inspection, payment and completed-transaction workflow.

The system is supported by:

- a public/customer website;
- customer accounts;
- an internal administration area;
- a Quote Catalogue used to support valuations;
- a research/evidence system for catalogue pricing;
- Supabase for authentication, database logic and server-side functions;
- GitHub as the source-code repository;
- a separate Research PC running the local AI worker;
- Ollama with Gemma as the local research model.

The main repository is:

**wmdroneservices/Action-Buyer-UK**

---

# 2. High-Level Architecture

## The body
The public and administration website is primarily a GitHub-managed web application.

Key areas include:

- public pages and valuation entry;
- customer account pages;
- staff/admin pages;
- Quote Catalogue administration;
- AI Research Centre;
- purchasing and sales administration.

## The engine
Supabase provides the backend system of record and workflow logic.

It is responsible for areas including:

- authentication;
- customer and staff access;
- valuations;
- quote items;
- quote offers;
- catalogue products;
- AI research queues and candidates;
- live evidence;
- source registry;
- workflow RPC/functions.

## Amazon UK continuous research and verified comparison placement

When **Amazon UK Only** is selected and Continuous Catalogue Mode is started:

1. the continuous control stores `amazon_uk` as the research scope;
2. the local worker preserves that scope when it claims the next product;
3. discovery queries are restricted to actual Amazon UK URLs;
4. general retailer searches and approved-source fallbacks are disabled for that run;
5. results remain candidates until manually verified.

During manual review, the reviewer explicitly chooses the **Verified comparison bucket**:

- **NEW comparison — UK**
- **USED comparison — UK** (including refurbished comparisons)
- **OVERSEAS comparison**

Saving does not make evidence live. The reviewer must verify/edit it, accept it, and then explicitly apply it. The live application maps `new_uk` into the new comparison data and `used_uk` into the used comparison data.

## AI Research Queue Control

The AI queue is intentionally **not a permanent backlog**.

Operational rule:

- a new manual research run clears any older waiting jobs before adding the newly selected products;
- **CLEAR ALL QUEUED RESEARCH** removes all waiting jobs without interrupting the product currently being processed;
- stopping Continuous Catalogue Mode disables the continuous loop and clears waiting jobs, so old test products cannot continue into a later run;
- a product already physically being researched may finish safely unless the Research PC itself is stopped from the Remote Controls panel.

This prevents a testing sequence such as “run, stop, change filters, run again” from leaving older products hidden in the queue and processing later.

## The research brain
The Research PC runs a local Node.js worker and Ollama/Gemma.

Its job is to:

1. receive queued research work;
2. search approved and wider sources;
3. collect candidate evidence;
4. use Gemma to structure/filter findings;
5. send findings back to Supabase;
6. leave final acceptance to human review.

The local worker is in:

`tools/gear-ai-local-agent/agent.mjs`

The Research PC uses configuration outside the repository, including:

`C:\GearCashOut-Config\Start-GearCashOut-AI.ps1`

and configuration loaded from:

- `C:\GearCashOut-Config\.env`
- repository `.env`

The worker currently identifies itself in logs as Gary's GearCashOut Research PC and uses the configured Ollama model (recently Gemma).

---

# 3. Customer Journey: First Quote to Completed Sale

## Stage 1 — Customer submits equipment

The customer provides information about equipment they want GearCashOut to buy.

Depending on the product, the system may collect:

- manufacturer;
- model;
- specifications;
- condition;
- serial numbers/identifiers;
- usage information;
- photographs;
- accessories;
- drone-specific flight time;
- drone battery-cycle information;
- DJI binding/unbinding information where relevant.

The submitted equipment enters the valuation/quote workflow.

## Stage 2 — Valuation

The submitted item is associated with a valuation and quote items.

The Quote Catalogue and its market evidence support the valuation process, but catalogue research is not the same thing as automatically deciding a customer payout.

Staff can review information and produce an offer.

## Stage 3 — Offer issued

Offers are stored against quote items.

Customer-facing account logic can show:

- new quotes waiting for response;
- valuations received;
- valuation/sale updates;
- completed transactions.

Email functions are used for offer communications, including the `send-quote-email-v2` path.

## Stage 4 — Customer accepts or rejects

A published offer can be accepted by the customer.

The sale workflow includes database protection so that:

- only an available published offer can be accepted;
- the accepted offer is marked accepted;
- the relevant quote item is marked accepted;
- competing published offers for the same item can be superseded.

This is a controlled transition, not merely a front-end status change.

## Stage 5 — Purchasing and shipment

Accepted items move into the purchasing workflow.

The internal purchasing area is responsible for progressing the transaction through the operational stages rather than allowing a valuation to jump directly into payment.

The customer account can show progress and relevant shipping information.

## Stage 6 — Inspection and final valuation handling

After GearCashOut receives equipment, the operational workflow can assess whether the received item matches the agreed information.

The system has been designed to support outcomes including:

- acceptance and payment;
- changed/refused valuation handling;
- return flow where appropriate.

This distinction is important: receiving an item does not mean the system should automatically treat every valuation as finally paid without operational checks.

## Stage 7 — Payment

When the transaction reaches the appropriate payment stage, the customer account can show payment status, including payment sent/received states.

Bank/payment information is handled through the customer account and associated backend workflow.

## Stage 8 — Completed transaction

Paid transactions are archived into the completed-transaction area for customer records.

Eligible return options remain part of the broader operational design where applicable.

---

# 4. Quote Catalogue

The Quote Catalogue is a central internal valuation resource.

A catalogue product can have:

- manufacturer;
- model;
- package name/variant information;
- category/product type;
- active/customer-visible state;
- pricing/evidence information.

The catalogue is not simply a list of products. It is supported by evidence intended to explain and support market pricing.

Important principle:

**Evidence must not become customer-facing valuation truth merely because an AI found it.**

The system separates discovery, review and live application.

---

# 5. AI Research System

## 5.1 Purpose

The AI research system exists to expand and maintain market evidence for catalogue products.

It is designed to research:

- new UK retail evidence;
- used UK / marketplace evidence;
- overseas evidence;
- Amazon UK discovery.

## 5.2 Research scopes

The current dashboard supports:

- **All markets**
- **New UK retail**
- **Used UK / UK marketplace**
- **Overseas**
- **Amazon UK only**

The Amazon-only mode was added specifically because Amazon is a major comparison source but frequently blocks direct automated page retrieval.

## 5.3 Normal research flow

1. An administrator selects products and a research scope.
2. The website queues work through the Supabase AI research workflow.
3. The Research PC polls for work.
4. The Node worker performs searches and source checks.
5. Candidate pages/listings are collected.
6. Product identity and evidence are assessed.
7. Gemma helps structure/filter the findings.
8. Findings are stored as candidates.
9. A human reviews the candidates.
10. Accepted candidates remain separate until explicitly applied to live evidence.

## 5.4 Manual review is mandatory

The core rule is:

**AI research discovers and proposes. Humans decide.**

The system should not automatically publish uncertain evidence merely because a model found a plausible result.

This is especially important for:

- wrong variants;
- accessories instead of the main product;
- used items presented as new;
- missing prices;
- broken links;
- package differences;
- incorrect market/country classification.

---

# 6. Amazon UK Research

Amazon is a special case because direct automated access can be blocked.

The worker now treats Amazon UK as:

1. a mandatory discovery route during New UK research; and
2. a dedicated Amazon UK only research mode.

Amazon-focused searches include forms equivalent to:

- exact product + `site:amazon.co.uk`
- exact product + `Amazon UK`

If Amazon blocks direct retrieval but a search engine surfaces an exact-model Amazon result, the worker may preserve it as:

**Amazon UK indexed discovery**

This means:

- the discovery can reach manual review;
- no price is invented;
- availability is not invented;
- the human reviewer must verify the live listing;
- nothing is automatically accepted.

---

# 7. Evidence Review and Human Learning

The AI Research Centre uses a staged evidence process.

## Pending

The AI has found evidence but it has not yet been approved.

## Accepted

A human reviewer considers the finding suitable.

Acceptance alone does **not** immediately make it live.

## Rejected

A human reviewer considers the finding unsuitable.

## Apply Accepted to Live Evidence

This is a separate action.

Only accepted findings are eligible to be applied through the live-evidence workflow.

This separation protects the catalogue from accidental publication.

---

# 8. Review Reasons: Teaching the Research System

Review decisions can now include a reason.

The purpose is not merely record keeping. These reasons are intended to become structured feedback about what the human reviewer considers good or bad evidence.

Examples of rejection reasons:

- price missing;
- website/product link missing;
- link is broken;
- wrong model;
- wrong variant;
- accessory rather than the actual product;
- used item incorrectly classified as new.

Examples of accepted-with-correction reasons:

- accepted after correcting the price;
- accepted after replacing the source URL;
- accepted after correcting the condition;
- accepted after correcting the evidence category.

The long-term learning loop is:

**Gemma discovers → human reviews → human explains decision/correction → decision history becomes research guidance → future filtering improves.**

This is a central design principle for future development.

---

# 8A. Condition Rules for Comparison Evidence

GearCashOut does not operate a separate **Refurbished** buy-in category.

For comparison research:

| Listing condition | Evidence category | Condition retained |
|---|---|---|
| New | New UK | new |
| Used | Used UK | used |
| Open-box / returned stock | Used UK where appropriate | used/open-box |
| Refurbished / Renewed | Used UK | **refurbished** |

Refurbished/Renewed findings are **comparison evidence only**. They do not imply that GearCashOut buys refurbished stock.

The AI must preserve the distinction in the finding's condition so a reviewer can see that a price came from refurbished stock, while keeping the evidence within the existing Used comparison section.

---

# 9. Important Database / Workflow Separation

The system contains several distinct layers that must not be casually merged:

### Research candidate
AI-discovered information awaiting review.

### Accepted candidate
Human-approved research that is still not necessarily live.

### Live evidence
Evidence formally applied to the catalogue through the appropriate database workflow.

### Catalogue product
The product record itself.

### Customer valuation
A customer's submitted equipment valuation.

### Quote offer
An offer made to the customer.

### Purchase/sale workflow
The operational process after acceptance.

These are related, but they are not interchangeable objects.

---

# 10. Administration Areas

Known major administration areas include:

- AI Research Centre;
- Quote Catalogue;
- valuations;
- purchasing;
- staff management;
- customer/sales workflow.

The staff-management area supports creation and access control for staff accounts. Further documentation should record exact roles and permissions as the system is audited.

---

# 11. Customer Account

The customer account has distinct areas including:

- New Quotes;
- Valuations Received;
- Valuation Update;
- Completed Transactions.

Associated account modules include functionality for:

- sales/progress;
- bank details;
- bank summary;
- shipping links;
- returns;
- payment notifications;
- contact details.

The account is intended to be the customer's record of what is happening to their equipment through the transaction lifecycle.

---

# 12. Source Registry

The research system maintains a source registry.

Sources may be:

- known/approved research sources;
- newly discovered sources;
- blocked/rejected sources.

Automatic discovery is useful but must not be trusted blindly.

A key lesson from overnight testing was that automatic source and country classification can be wrong. Future development must distinguish:

- source domain;
- retailer's actual market;
- evidence market;
- currency;
- search scope that happened to discover the result.

These are not automatically the same thing.

---

# 13. Current Known Quality Problems

The following issues have been observed and must remain on the development memory:

## Weak product matches

Around 55% match confidence allowed unrelated products into review.

Examples included:

- one drone model returning other drone models;
- an Autel accessory returning DJI accessories;
- generic camera cages returning cages for unrelated equipment.

Future filtering should strongly favour exact model identity for pricing evidence.

## Market classification

Some used UK results appeared in New UK research, and UK domains appeared in Overseas results.

Classification must use actual listing/source evidence, not simply inherit the research pass.

## Source geography

Automatically discovered domains were sometimes assigned incorrect countries.

Country inference must be hardened.

## Amazon verification

Amazon discovery is now implemented, but its real-world performance must be tested from the newly updated Research PC installation.

---

# 14. Development Rules

When changing this system:

1. Inspect the existing workflow before changing it.
2. Do not replace working architecture with isolated shortcuts.
3. Preserve the separation between research, review and live evidence.
4. Protect customer workflow status transitions.
5. Prefer backend/database enforcement for important state changes.
6. Keep GitHub as the source-controlled record of code.
7. Document material changes in this handbook.
8. Record the reason for significant architectural decisions.
9. Do not assume a search result proves a product price.
10. Do not let AI findings bypass human review unless a future, explicitly designed rule permits it.

---

# 15. How Future Developers Should Work

A developer joining the project should begin by understanding the system in this order:

1. Read this handbook.
2. Inspect the repository structure.
3. Identify the relevant front-end page.
4. Identify the JavaScript controlling that page.
5. Identify the Supabase tables/functions involved.
6. Inspect relevant migrations.
7. Trace the customer/admin workflow before changing it.
8. Make the smallest safe change.
9. Test the complete affected workflow.
10. Update this handbook with the change and its reason.

---

# 16. The Living Memory Plan

This handbook is the persistent human-readable counterpart to working knowledge accumulated during development.

It should eventually contain:

## A. System overview
What GearCashOut does.

## B. Customer journey
From first quote to completed sale.

## C. Administration manual
How staff operate every major area.

## D. Technical architecture
Website → GitHub → Supabase → Edge Functions → Research PC → Ollama/Gemma.

## E. Database map
Main tables, relationships, statuses and critical RPC functions.

## F. Catalogue manual
How products, evidence and prices are managed.

## G. AI research manual
How the worker searches, filters, learns and submits candidates.

## H. Sales/purchasing manual
Accepted offer through receipt, inspection, payment, refusal and return.

## I. Staff and security manual
Accounts, permissions and protected areas.

## J. Change log and decision log
What changed, why it changed, and what problem it solved.

---

# 17. Current Development Direction

The current objective is to turn the accumulated system knowledge into two connected assets:

### 1. Developer/System Reference
Technical enough for someone maintaining the software.

### 2. Human User Handbook
Plain English instructions explaining how to operate the website and understand the business workflow.

Both documents should grow alongside the software.

**Rule for future work:** A material system change is not fully documented until this handbook and the relevant operational instructions have been updated.

---

## 17A. 5 September 2026 — AI research hardening pass

A live testing pass was carried out on the local Research PC after the worker, dashboard controls and source filters had been restored.

### What was observed

The tests confirmed that:

- the local PowerShell launcher can start the worker and the dashboard can see the Research PC;
- normal **All Sources** research can search multiple source types;
- Amazon-only mode required stronger defensive enforcement and clearer operational separation;
- related models and accessories could still consume search effort when product identity overlap was weak.

### Changes made

The local worker was tightened so that:

1. **Exact model identity is required** before a discovery result enters the evidence collection pool.
2. **Manufacturer identity is also required** when the catalogue product specifies a manufacturer.
3. Main-product searches reject common accessory/spare-part results unless the catalogue product itself is an accessory.
4. Recognised manufacturer bundles/combos/kits remain eligible.
5. **Amazon UK Only** remains a hard source boundary:
   - only Amazon-targeted queries are issued;
   - general web-market searches are not used;
   - approved-source/direct probes are disabled;
   - only actual `amazon.co.uk` result URLs can enter the pool;
   - the source-registry scope helper also refuses non-Amazon sources as a defensive fallback barrier.
6. A legitimate Amazon-only run may finish with zero findings rather than relaxing the source restriction.

### Operational rule

When testing a new source filter, first allow the currently processing product to finish or clear/stop the previous run as appropriate. The dashboard can change the next queued work while a product already claimed by the Research PC continues safely. Logs from that in-progress product therefore belong to its original run scope.

### Files changed in this hardening pass

- `tools/gear-ai-local-agent/agent.mjs`
- `tools/gear-ai-local-agent/README.md`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`

This section is part of the persistent project record and should be read together with the AI research workflow rules above.

---

## 17C. 5 September 2026 — Simplified batch and continuous research control

The AI Research Centre originally displayed a separate Continuous Catalogue Mode panel with its own mode selector and Start/Stop buttons. This duplicated the main batch-selection decision and added unnecessary controls.

The interface was simplified so **Batch size** now contains:

- 1 product
- 3 products
- 5 products
- 10 products
- 25 products
- **Continuous**

The single **RUN RESEARCH** button now starts whichever mode is selected:

- a numbered value runs that batch;
- **Continuous** starts automatic catalogue continuation.

Switching back to a numbered batch and pressing **RUN RESEARCH** automatically ends continuous mode, clears waiting jobs, and starts the selected batch. This keeps the workflow in one place and removes the separate continuous-control panel.

---

## 17B. Research control buttons — clarified

The AI Research Centre uses different controls for different purposes. These must not be treated as interchangeable.

### CLEAR WAITING QUEUE

Removes only products that are still waiting to be claimed by the local worker.

It **does not interrupt a product already being researched**.

### STOP CONTINUOUS RESEARCH

Stops automatic catalogue continuation.

It is used only for Continuous Catalogue Mode and is **not** a general stop button.

### STOP ALL RESEARCH & WORKER

This is the full emergency stop.

It shuts down the local Research PC worker/launcher so the current processing loop cannot continue. The worker must be started again before new local research can run.

### START RESEARCH PC WORKER

Starts the local PowerShell/AI worker.

### RESTART RESEARCH PC WORKER

Stops and relaunches the local worker.

### Operational lesson

A batch can contain products already claimed by the worker and products still waiting in the queue. Clearing the queue only affects waiting products. If immediate interruption is required, use the full worker stop control.

The dashboard labels and confirmation messages were updated on 5 September 2026 to make this distinction explicit.

---

## Current baseline

This handbook records the system state and design direction as understood from the current repository and recent development work in September 2026. It should be expanded through a systematic repository and Supabase audit rather than relying indefinitely on conversational recollection alone.


---

## 17D. 5 September 2026 — Research PC emergency stop reliability fix

Live testing exposed two separate failures in the full-stop control.

### Root cause

The local worker created a detached PowerShell helper to walk up the process tree and terminate the outer launcher. The helper incorrectly used $pid as a normal variable. PowerShell treats $PID as a read-only automatic variable and variable names are case-insensitive, so the helper could fail before taskkill ran.

At the same time, the dashboard disabled the stop button and changed its label to **STOPPING ALL RESEARCH…** without a reliable completion/timeout path, so the button could remain permanently disabled.

### Fix

The emergency-stop workflow is now three-layered:

1. **Database stop:** Continuous mode is disabled and queued/claimed/processing research items are marked stopped so old work cannot resume later.
2. **Worker stop:** The local agent uses a corrected $currentPid process-tree traversal variable and falls back to terminating the Node process if no launcher shell is found.
3. **Dashboard confirmation:** The stop button now waits for command completion plus an offline heartbeat. It reaches a clear stopped state or releases itself after a timeout instead of remaining permanently on **STOPPING**.

The command registry now also accepts **START RESEARCH PC WORKER**, matching the existing dashboard button.

### User operation

- **STOP ALL RESEARCH & WORKER** means exactly that: stop the current run, clear active/waiting queue state, disable Continuous mode and shut down the local worker.
- When successful, the dashboard shows **RESEARCH PC STOPPED**.
- To resume later, use **START RESEARCH PC WORKER**.
- A numbered batch or Continuous research can then be started normally.

Because the Research PC is a manually downloaded/extracted copy rather than a live Git checkout, the local file that must be replaced for this fix is tools/gear-ai-local-agent/agent.mjs.

The dashboard/database changes are already source-controlled and database-enforced; the corrected local agent file is required before the physical PowerShell shutdown fix can take effect on the Research PC.


---

## 17E. Confirmed Research PC start/stop regression - 5 September 2026

### Existing design that must be preserved

The Research PC already uses:

Windows startup / desktop shortcut -> Start-GearCashOut-AI.ps1 -> npm start -> agent.mjs

The PowerShell launcher is expected to remain alive and restart the Node worker after an unexpected exit.

### Confirmed fault

A later repository change left Start-GearCashOut-AI.ps1 as a one-shot npm start launcher. Once Node exited, PowerShell exited as well.

Separately, the dashboard START control only writes a start_worker command into Supabase. That command can only be consumed by an already-running agent.mjs. It cannot wake a completely offline Windows process.

Therefore an offline Research PC could show a START confirmation but nothing happened after OK: the command was waiting for the very worker it was supposed to start.

### Correct behaviour

- The existing Windows startup/desktop launcher starts the PowerShell launcher.
- The PowerShell launcher remains alive and restarts npm start after 10 seconds if the worker exits.
- Remote STOP and RESTART commands are consumed while the worker is online.
- The dashboard must not claim that an offline worker has been remotely started when no persistent listener exists.

### Maintenance rule

Before changing Research PC controls, preserve this distinction:

Research queue control is cloud/database state. Research PC process control depends on a running local process.

Do not redesign the established startup chain without checking this handbook and the current local installation first.


---

## 17F. 5 September 2026 — Research PC launcher path fault and repair

### Fault confirmed from live PowerShell output

The desktop launcher successfully opened PowerShell, but PowerShell repeatedly reported:

`npm error path C:\\GearCashOut-Config\\package.json`

followed by an `ENOENT` package.json error and the launcher's automatic restart loop.

This established that Windows, the desktop shortcut and the restart loop were all functioning. The fault was the **working directory**: the PowerShell launcher lives in `C:\\GearCashOut-Config`, which is the permanent configuration folder, but the previous launcher treated its own folder as the Node project folder and therefore ran `npm start` in the wrong location.

### Correct architecture

`Desktop shortcut / Windows startup → C:\\GearCashOut-Config\\Start-GearCashOut-AI.ps1 → C:\\gearcashout\\Action-Buyer-UK-main\\tools\\gear-ai-local-agent → npm start → agent.mjs`

The configuration folder and the repository folder are deliberately separate:

- `C:\\GearCashOut-Config` holds persistent configuration and the external launcher.
- `C:\\gearcashout\\Action-Buyer-UK-main\\tools\\gear-ai-local-agent` holds `package.json`, `node_modules`, `agent.mjs` and the Node worker.

### Repair applied

The canonical PowerShell launcher was changed so it:

1. explicitly targets the extracted repository's agent folder instead of using `$PSScriptRoot` as the npm folder;
2. checks that `package.json` exists before running npm;
3. reports the exact configuration and agent folders in its startup log;
4. automatically runs `npm install` only when dependencies are missing;
5. preserves the established 10-second automatic restart loop;
6. supports an optional `GEARCASHOUT_AGENT_DIR` environment variable if the extracted repository is moved later.

### Local update required

For this repair, only the local PowerShell launcher file needs replacing:

`C:\\GearCashOut-Config\\Start-GearCashOut-AI.ps1`

Do **not** replace the permanent `.env` file. No full repository download is required for this specific repair.


---

## 17G. 5 September 2026 — Remote START fault: circular command architecture repaired

### Confirmed fault

The dashboard button **START RESEARCH PC WORKER** could not start a stopped worker. The frontend explicitly blocked the command when the worker heartbeat was offline, and the underlying architecture was circular: the worker itself was responsible for polling Supabase commands, so once stopped there was nothing alive to receive a START command.

### Repair: persistent Research PC supervisor

The Research PC now has two layers:

`PowerShell launcher → supervisor.mjs (always-on control channel) → agent.mjs (research worker)`

The supervisor remains alive when the research worker is stopped. It polls Supabase for lifecycle commands and can:

- START the research worker remotely;
- RESTART it remotely;
- STOP the research worker and emergency-stop research while retaining the control channel;
- answer status and Ollama checks.

### Dashboard status meanings

- **ONLINE** — supervisor and research worker are running.
- **READY** — supervisor is online but the worker is stopped; START can be used remotely.
- **OFFLINE** — the Research PC control channel itself is unavailable.

This removes the previous requirement to walk to the Research PC and manually start PowerShell after using STOP.


---

# 18. Documentation Architecture — Two Connected Manuals

GearCashOut now uses two separate but connected documentation layers. They must describe the same system truth, but serve different audiences.

## 18.1 Human / Developer System Handbook

This document remains the staff, administrator and developer-facing handbook and is the manual linked from the Staff Dashboard.

Its required structure is:

1. System overview and architecture
2. Authentication, staff access and permissions
3. Customer accounts
4. Quote and valuation system
5. Automatic valuation and pricing
6. Manual valuation and offer management
7. Customer acceptance, rejection and offer supersession
8. Purchasing, receipt, inspection, refusal and return workflow
9. Payment and completed transactions
10. Quote Catalogue
11. Evidence and market comparison data
12. AI Research Centre
13. Research PC, local worker and Ollama
14. Emails and notifications
15. Supabase architecture
16. GitHub/repository and deployment architecture
17. Troubleshooting, known faults and recovery
18. Change log and verification history

### Required traceability standard

For every major workflow, documentation must progressively provide this chain:

**User action → page → front-end controller → Supabase call → database object → trigger/function → status change → visible result.**

| Layer | What must be documented |
|---|---|
| User action | What the customer or staff member does |
| Page | Exact HTML/page entry point |
| Front end | Exact JavaScript/controller responsible |
| Backend call | Supabase RPC, query or Edge Function |
| Database | Tables/records read or written |
| Database logic | Functions, triggers, constraints and status rules |
| External services | Email, Ollama, Research PC or other integration |
| Result | What status changes and what the user sees |
| Verification | Proposed / Implemented / Tested / Verified Live |

This must be based on inspection of the actual deployed repository and Supabase objects. Documentation must not invent code paths.

## 18.2 AI Operating Manual / Persistent Project Memory

The AI manual is a separate technical continuity document:

docs/GEARCASHOUT-AI-OPERATING-MANUAL.md

Its purpose is to allow a future AI or developer AI to resume safely without rediscovering the project from scratch.

It records:

- current system architecture;
- authoritative sources of truth;
- current checkpoint and active work;
- non-negotiable rules;
- important architectural decisions;
- known faults and lessons;
- operational limitations and workarounds;
- verification status;
- documentation obligations after material changes.

The Supabase project-memory layer remains the structured persistent retrieval source. The repository AI manual is its human-readable companion.

## 18.3 Mandatory update rule

A material change to code, Supabase, workflow, integration or operational behaviour is not fully closed until the relevant documentation has been updated.

Where applicable, update:

1. this Human/Developer System Handbook;
2. the AI Operating Manual;
3. the Supabase project-memory event/checkpoint layer;
4. the verification status for the affected feature.

## 18.4 Current documentation build method

The manuals will be completed by auditing one system at a time rather than guessing at the entire architecture.

For each system:

1. inspect the live repository;
2. inspect the relevant Supabase tables/functions/triggers/RPCs/Edge Functions;
3. trace the complete workflow end to end;
4. document the exact connections;
5. test the workflow where practical;
6. mark the documentation with its verification state.

This handbook therefore becomes the living technical map for humans, while the AI Operating Manual and Supabase memory provide continuity for future AI work.


---

# 19. Developer Diagnostic Roadmaps

## Purpose

The Human / Developer System Handbook is not intended to duplicate the repository's source code.

Instead, every major visible website area and action should progressively receive a **Developer Diagnostic Roadmap**.

The purpose is to let a developer answer:

> **“This feature is not working. Where do I start checking?”**

The roadmap points to the relevant parts of the real system without copying large amounts of code into the manual.

## Required roadmap format

Each documented feature should contain:

### What the user does
The visible page, control or action.

### Expected result
What the user should see happen.

### Diagnostic route

**Website / Front end**
- relevant page;
- relevant JavaScript/module/component;
- relevant handler or function where known.

**Supabase**
- relevant table(s);
- relevant fields/status values;
- RPC/database function(s);
- trigger(s), RLS or permissions where relevant;
- Edge Function(s), where used.

**External / local systems**
- email service or email function;
- Research PC;
- local worker;
- Ollama;
- other integration where relevant.

### Failure checkpoints

A short ordered checklist showing where the action can fail.

### Expected data path

A simple roadmap such as:

User action
→ front-end handler
→ Supabase/API call
→ database record/function
→ external or local worker if applicable
→ status/result returned to website.

### Known issue history

Where relevant, link to or summarise:

- previous faults;
- fixes attempted;
- approaches that failed;
- current verified behaviour.

## Important rule

The roadmap must contain **real inspected paths and objects**. It must not invent filenames, tables or functions merely to complete a template.

If a feature has not yet been fully traced, it should be marked:

**Roadmap status: Not yet audited**

rather than guessing.

## Example

### Research & Pricing → Amazon UK Only

**User action:** Select Amazon UK Only and start research.

**Expected result:** Only Amazon UK research routes should be generated and accepted.

**Developer diagnostic route:**

1. Check the Research & Pricing source-filter front-end control.
2. Check the command/request created from that selection.
3. Check the Supabase record storing the selected research scope.
4. Check the local Research PC worker path in `tools/gear-ai-local-agent/agent.mjs`.
5. Check the source-routing logic before search queries are generated.
6. Check the final evidence/domain allowlist.
7. Check logs to identify the first point at which a non-Amazon route appears.

This is a diagnostic roadmap, not a copy of the code.

## Documentation rollout

Roadmaps will be added progressively as systems are inspected:

1. Quote and valuation flow
2. Customer acceptance/rejection
3. Purchasing, receipt, refusal and returns
4. Staff management and permissions
5. Quote Catalogue
6. Evidence and comparison pricing
7. AI Research Centre
8. Research PC and local worker
9. Email and notifications
10. Sales and completed transactions
11. Authentication and customer accounts

The eventual aim is that a developer can open the Human / Developer Handbook, identify the broken website area, and immediately see the route through the repository, Supabase and any connected services.


---

## 17C. 5 September 2026 — Amazon UK Only manual-run scope repair

### Fault observed

The dashboard could visibly select **Amazon UK Only** and the Edge Function received `evidence_scope = amazon_uk`, but the local Research PC still logged searches against Bright Tangerine, DJI Retail and other non-Amazon sources.

### First failure identified

The failure was in the Supabase RPC `ai_research_create_run_filtered(...)`.

**Path:**

1. `admin-ai-research.html` → Amazon UK Only control.
2. `admin-ai-research.js` → sends `evidence_scope: 'amazon_uk'`.
3. Supabase Edge Function `quote-catalog-ai-worker` → forwards `p_evidence_scope: evidenceScope`.
4. `ai_research_create_run_filtered(...)` → previously accepted the parameter but only preserved `new_uk`, `used_uk` and `overseas`; `amazon_uk` was incorrectly converted to `all`.
5. `quote_catalog_ai_research_runs.evidence_scope` therefore stored `all`.
6. `tools/gear-ai-local-agent/agent.mjs` correctly reads the stored run scope, so it legitimately searched all enabled sources.

### Repair

Supabase migration `supabase/migrations/20260905162500_fix_amazon_uk_manual_research_run_scope.sql` now preserves `amazon_uk` as a valid manual-run scope.

### Diagnostic lesson

For source-filter faults, do not stop at the front-end selection or request payload. Verify the persisted value in `quote_catalog_ai_research_runs.evidence_scope`.

The worker follows that database value. A correct UI label with an incorrect persisted run scope will still produce the wrong searches.

### Verification status

- Root cause: verified in live Supabase function definition.
- Database repair: applied.
- Repository migration: committed.
- End-to-end Research PC retest: required next.


---

# 20. AI Research Centre — Review Queue and Catalogue Comparison

**Roadmap status: Verified from current code and Supabase state on 5 September 2026.**

## What the staff user does

A staff user opens a proposed AI finding in **AI Research Centre**, checks the evidence page, edits the evidence if required, and can now use **COMPARE WITH CATALOGUE PRODUCT** to open the exact linked catalogue product.

## Expected result

### Pending review layout

Pending findings are no longer rendered as one permanently expanded list.

- **Amazon findings — review, edit and decide** contains Amazon findings separately.
- **Review, edit and decide** contains the remaining pending findings.
- Both sections are collapsed by default.
- Accepted, rejected and applied findings remain separate collapsible sections.

Amazon classification is based on the finding's effective source information, including the edited/original source URL and Amazon source text where available.

### Compare CTA

Each finding linked to a loaded catalogue product now includes:

**COMPARE WITH CATALOGUE PRODUCT**

The CTA opens:

`admin-catalog.html?product=<catalog_product_id>`

The catalogue page already reads the `product` URL parameter, loads the exact `quote_catalog_products` record, opens the editor and loads its associated `quote_catalog_retailer_prices` evidence rows.

## Developer diagnostic route

**User action**

AI finding → open finding → compare CTA.

**Front end**

1. `admin-ai-research.html` — AI Research Centre page and review styles.
2. `admin-ai-research.js` — `renderCandidateCard(c)`, pending grouping in `render()`, and `isAmazonFinding(c)`.
3. CTA target: `admin-catalog.html?product=<catalog_product_id>`.
4. `admin-catalog.js` — `load()` reads the requested product ID and `loadProduct(p)` opens the exact catalogue editor.

**Supabase**

- `quote_catalog_ai_candidates.catalog_product_id` links a finding to its catalogue product.
- `quote_catalog_products.id` is the target product.
- `quote_catalog_retailer_prices.catalog_product_id` supplies the existing comparison evidence shown in the catalogue editor.

## Expected data path

AI finding
→ `catalog_product_id`
→ compare CTA
→ `admin-catalog.html?product=...`
→ catalogue `load()`
→ matching `quote_catalog_products` record
→ `loadProduct()`
→ retailer/evidence rows loaded.

## Failure checkpoints

1. If the CTA is absent, check whether the finding has a resolvable `catalog_product_id` and the product was loaded into the review page.
2. If the CTA opens the catalogue but no product editor appears, check the URL `product` parameter and whether the ID exists in `quote_catalog_products`.
3. If the product opens but comparison rows are missing, inspect `quote_catalog_retailer_prices` for that `catalog_product_id`.
4. If an Amazon finding appears in the general queue, inspect its effective source URL/source fields first; do not classify by the dashboard filter alone.

## Change history

**5 September 2026 — Implemented**

- Added a separate collapsible Amazon findings review section.
- Made the general pending review queue collapsible.
- Added per-finding catalogue comparison CTA.
- Preserved the existing review/edit/accept/deny/apply workflow and existing evidence data model.

**Verification status:** Implemented and syntax-checked. Browser/live workflow verification is still required.

---

## AI Research Centre — Inline Catalogue Comparison

### Purpose

A reviewer can compare a proposed AI evidence finding against the current live catalogue evidence without leaving the AI Research Centre.

### User flow

1. Open a pending finding.
2. Click **COMPARE HERE WITH CATALOGUE**.
3. The finding remains open.
4. The page loads the linked product's current `quote_catalog_retailer_prices` records beside the new finding.
5. Review the new evidence and existing evidence side by side.
6. Either:
   - edit the new finding;
   - open the new evidence source;
   - open the full catalogue editor in a new tab;
   - close the comparison; or
   - click **ACCEPT & ADD TO LIVE EVIDENCE**.

### Data path

**User action**
AI Research Centre → finding → Compare Here With Catalogue

**Front-end**
`admin-ai-research.js`

**Existing catalogue evidence**
`quote_catalog_retailer_prices` filtered by `catalog_product_id`

**New evidence**
`quote_catalog_ai_candidates`

**Direct accept/apply path**
`quote_catalog_ai_candidates.decision = accepted` → `apply_accepted_ai_candidate(uuid)` → `quote_catalog_retailer_prices` → candidate receives `applied_at` and `applied_evidence_id`.

### Important rule

The inline vertical comparison does not automatically change a buying price. The reviewer must explicitly use **ACCEPT & ADD TO LIVE EVIDENCE** after comparing the evidence.

### Fallback navigation

The full catalogue editor remains available from the comparison panel and opens in a new tab, preserving the AI finding in the original tab.


### Inline comparison regression — 5 September 2026

**Observed behaviour:** Clicking **COMPARE HERE WITH CATALOGUE** appeared to close the review dropdown instead of showing the comparison.

**Root cause:** `admin-ai-research.js` correctly set the active comparison, but `render()` rebuilt the outer review `<details>` sections closed. The active finding was technically reopened inside a collapsed parent section.

**Repair:** `renderSection(...)` now keeps the parent decision section open whenever it contains the active comparison or active editor.

**Verification:** JavaScript syntax check passed. Live browser retest required.


---

# AI Evidence Review Feedback & Gemma Learning — 5 September 2026

## Purpose

Individual AI evidence decisions now capture structured human feedback so the local Gemma research workflow can learn why evidence was corrected, accepted or rejected.

## Data flow

**User action**  
Open individual AI finding → tick reviewed evidence areas → enter reason/correction note → manual Accept or Deny.

**Front end**  
`admin-ai-research.js`

- `manualReviewMarkup(...)` renders field checkboxes and reason input.
- `manualReviewAction(...)` calls `record_ai_candidate_manual_review(...)`.
- Direct individual acceptance can then call `apply_accepted_ai_candidate(uuid)`.
- Bulk Accept / Bulk Deny remain reason-free by design.

**Supabase**

- `quote_catalog_ai_candidates` — current decision and visible decision reason.
- `quote_catalog_ai_candidate_review_feedback` — immutable-style review audit with reviewed fields, changed fields, before/after snapshots, reason and reviewer.
- `quote_catalog_ai_learning` — structured learning summaries made available to the local AI worker.
- `record_ai_candidate_manual_review(uuid,text,text,jsonb)` — authoritative manual decision/feedback write path.
- `apply_accepted_ai_candidate(uuid)` — existing final live-evidence write path.

## Learning rule

Manual corrections are compared against the original candidate values. Changed fields are recorded automatically. The reviewer also explicitly ticks fields checked, such as:

- price;
- URL/exact product link;
- condition;
- product/model match;
- package/variant;
- evidence bucket;
- availability;
- source/retailer.

If a value was changed, the reviewer must explain why before manual acceptance. Manual denial always requires a reason.

## Bulk rule

Bulk Accept and Bulk Deny are deliberately separate from manual learning:

- no individual reason prompt;
- no field-by-field feedback;
- decision remains auditable on the candidate;
- Gemma should not infer a specific correction reason from a bulk decision.

## Diagnostic roadmap

If this workflow fails:

1. Confirm the button action in `admin-ai-research.js`.
2. Confirm the candidate ID and active review panel match.
3. Check `record_ai_candidate_manual_review(...)` exists in Supabase.
4. Check `quote_catalog_ai_candidate_review_feedback` for the audit row.
5. Check `quote_catalog_ai_candidates` for decision/reason/reviewer/timestamp.
6. Check `quote_catalog_ai_learning` for generated field learning.
7. For direct acceptance, then check `apply_accepted_ai_candidate(uuid)` and `quote_catalog_retailer_prices`.
8. Do not alter the existing apply function merely to repair feedback capture; identify the first failed step.


---

# AI Research Centre — Collapsible Discovery Lists and Current Startup Guide

## Discovery lists

The following large lists are intentionally collapsed by default:

- **New models and products found**
- **New websites and monitored launches**

Opening either section reveals the existing review controls and records. This is a usability change only: no product, source or approval workflow is automatically changed.

The source list retains:

- refresh;
- approve/block controls;
- monitored-opening status;
- source counts.

The product-discovery list retains:

- duplicate review;
- approve/reject;
- draft catalogue creation.

## Research PC setup, startup and restart instructions

The bottom-of-page guide was audited against the current Research PC architecture and corrected.

Current architecture:

**Windows desktop/startup launcher → C:\GearCashOut-Config\Start-GearCashOut-AI.ps1 → persistent supervisor.mjs → agent.mjs**

Important distinctions:

- **OFFLINE** means the Research PC supervisor/control channel is unavailable. Start the Windows launcher.
- **READY** means the supervisor is online but the research worker can be stopped.
- **ONLINE** means the research worker is active.
- **START RESEARCH PC WORKER** starts the worker through the persistent supervisor.
- **STOP ALL RESEARCH & WORKER** stops the worker/research but leaves the supervisor available for a later remote start.
- A normal Windows restart does not normally require `npm install`.
- `npm install` is needed after a fresh repository extraction or when dependencies are missing/changed.
- Do not run `npm start` from `C:\GearCashOut-Config`; it is a configuration folder and does not contain `package.json`.
- Permanent secrets remain in `C:\GearCashOut-Config\.env` and must not be overwritten by repository updates.


### Current comparison layout correction — 5 September 2026

The per-finding **COMPARE HERE WITH CATALOGUE** workflow is now deliberately vertical rather than two columns:

1. **NEW AI FINDING — EDITABLE** appears first.
2. The full finding editor is visible inside that comparison section, including price and exact product URL.
3. **CURRENT CATALOGUE EVIDENCE** appears directly underneath for comparison.
4. Saving the finding keeps the comparison open and refreshes the edited evidence.
5. The full catalogue editor remains available in a separate tab for deeper catalogue work.

This corrects the previous usability problem where the editor could render below a long comparison panel and appear not to open.


---

## 19. AI Research Review Audit Views — 5 September 2026

The AI Research Centre previously displayed a separate **Research Memory / Accepted and denied decisions** table. This duplicated information already available through the evidence review audit sections and made the page longer without adding a separate operational action.

The dashboard section was therefore removed.

This is a **UI simplification only**:

- accepted, rejected and applied evidence audit sections remain;
- individual manual review feedback remains recorded;
- structured Gemma learning remains stored in Supabase;
- `quote_catalog_ai_learning` is still used by the research workflow and has not been deleted or disabled.

The learning data is backend operational memory rather than a second on-page review queue.


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


## AI Research Centre — Product-Centred Evidence Review (5 September 2026)

Pending AI evidence is now grouped by the linked `catalog_product_id` for review.

When a staff user opens a matched catalogue product, the page shows one complete review workflow in this order:

1. **NEW AI EVIDENCE — EDITABLE** — every pending finding for that product is displayed together in the same block, with each finding's full editable evidence fields and exact source link.
2. **CURRENT CATALOGUE EVIDENCE** — all existing `quote_catalog_retailer_prices` for the same product are loaded automatically underneath.

The reviewer no longer needs to open a separate comparison, click View Evidence, or move between pages to compare the matched product. Each evidence item can still be individually saved, submitted through `record_ai_candidate_manual_review(...)` and `apply_accepted_ai_candidate(...)`, or denied with a required reason for Gemma learning.

This preserves the existing separation between proposed evidence, manual acceptance and live evidence while changing the review UI from per-finding navigation to a product-centred evidence workspace.


### Grouped review panel close behaviour — 5 September 2026

The product-centred review uses native collapsible panels. A previous state-retention handler remembered the active product when it was opened but did not clear that state when the panel was closed. After a render, this could force the same review section back open and make it difficult to move to the next grouped review, including Amazon findings.

Current behaviour:

- opening a product loads its grouped new evidence and current catalogue evidence;
- closing that product review clears the active review state and keeps it closed;
- the reviewer can then collapse the surrounding section or open another product normally;
- opening another product switches the active grouped review without requiring an edit or decision;
- no Supabase schema or evidence workflow was changed.

This is a UI-state repair only. Save, submit and deny behaviour remains unchanged.


---

# AI Research Centre — Grouped Review Catalogue Context (5 September 2026)

## Purpose

A grouped AI review must show enough of the linked Quote Catalogue product to make a decision without repeatedly opening another page.

## Inspected data flow

**User action:** open a grouped catalogue-product review in admin-ai-research.html.

**Front end:** admin-ai-research.js → productReviewMarkup(group).

**Catalogue product data:** quote_catalog_products:

- manufacturer/model/package;
- category/product type;
- factory sealed price;
- opened-unused price;
- excellent price;
- good price;
- fair price;
- active/customer-visible/pricing metadata where loaded.

**Current evidence:** loadComparisonEvidence(productId) → quote_catalog_retailer_prices.

The grouped review now mirrors the useful Quote Catalogue context:

1. automatic buying-price ladder;
2. UK New evidence count;
3. lowest and highest qualifying UK New selling prices;
4. UK used/other reference count;
5. total current evidence count;
6. full current evidence table including retailer, type, condition, sell price, buy price, availability, buy method, region, exact source URL, notes and checked timestamp.

## Diagnostic rule

If a grouped review shows only the product name or incomplete catalogue context, inspect:

1. load() product field selection in admin-ai-research.js;
2. loadComparisonEvidence() field selection;
3. catalogueSnapshotMarkup() / productReviewMarkup();
4. the live quote_catalog_products row and linked quote_catalog_retailer_prices rows.

Do not reintroduce a separate evidence-view step when the required catalogue context can be shown directly in the grouped review.

### 5 September 2026 — Grouped AI review: full catalogue evidence classification
The grouped AI review snapshot must mirror the meaningful evidence context from the Quote Catalogue, not only rows that have both a GBP currency code and a UK region. The review now classifies every current quote_catalog_retailer_prices row into:

- UK NEW pricing evidence
- UK USED / OTHER evidence
- OVERSEAS comparison evidence
- Total current evidence records

The exact full evidence table remains underneath the summary, including retailer, type, condition, sell/buy prices, availability, region, exact source, notes and check time. Automatic buying prices remain separate and may legitimately show — where that catalogue product has not yet been priced.

This prevents a valid UK market row with a missing price_currency from being incorrectly shown as “no UK evidence”.


---

## AI Research Review — Full Current Evidence Comparison

The grouped product review is deliberately **product-centred**.

When staff open a matched catalogue product, the review must show the complete current catalogue context **before** the new AI findings so the reviewer can identify duplicates or already-recorded evidence without opening another page.

The current catalogue comparison block includes:

1. automatic buying prices:
   - factory sealed;
   - opened / unused;
   - excellent;
   - good;
   - fair;
2. evidence summary counts;
3. **UK — NEW PRICING EVIDENCE**;
4. **UK — USED / OTHER EVIDENCE**;
5. **OVERSEAS COMPARISON (NON-GBP)**.

Each evidence row exposes the catalogue evidence details needed for duplicate checking:

- retailer;
- evidence type;
- condition;
- selling price;
- buying price;
- availability;
- buy method;
- region;
- exact source URL;
- notes;
- checked date.

All new AI findings linked to that catalogue product remain grouped together underneath this complete current-evidence block.

The intended review order is therefore:

**Matched product → full current catalogue evidence → all new AI evidence → edit/review feedback → submit to catalogue or deny.**
\n---\n\n# Manual AI Review Outcomes — Right / Wrong / Adjusted\n\nThe individual AI evidence review now records a **per-field outcome**, not merely that a field was checked.\n\nFor each reviewed finding, staff can mark:\n\n- **PRICE** — AI WAS RIGHT / AI WAS WRONG / ADJUSTED\n- **PRODUCT / MODEL / PACKAGE MATCH** — AI WAS RIGHT / AI WAS WRONG / ADJUSTED\n- **EXACT URL / PRODUCT PAGE** — AI WAS RIGHT / AI WAS WRONG / ADJUSTED\n- **CONDITION** — AI WAS RIGHT / AI WAS WRONG / ADJUSTED\n- **AVAILABILITY** — AI WAS RIGHT / AI WAS WRONG / ADJUSTED\n- **SOURCE / RETAILER** — AI WAS RIGHT / AI WAS WRONG / ADJUSTED\n- **EVIDENCE CATEGORY** — AI WAS RIGHT / AI WAS WRONG / ADJUSTED\n\n**NOT CHECKED** remains the default.\n\n## Automatic correction capture\n\nThe existing candidate editor remains the place where staff change values. The review function compares original and edited values and automatically maps saved changes to the relevant review field as **ADJUSTED**.\n\nExamples:\n\n- price edited → `price: adjusted`;\n- exact URL edited → `url: adjusted`;\n- retailer/source edited → `source: adjusted`;\n- evidence category edited → `evidence_bucket: adjusted`;\n- title/package/variant/confidence edited → `product_match: adjusted`.\n\nThis prevents a correction from being lost merely because the reviewer forgot to select ADJUSTED.\n\n## Supabase storage\n\n`quote_catalog_ai_candidate_review_feedback.field_outcomes` stores the structured field outcome object.\n\nThe existing fields remain:\n\n- `reviewed_fields`;\n- `changed_fields`;\n- `before_values`;\n- `after_values`;\n- `review_reason`.\n\nThe live function remains `record_ai_candidate_manual_review(uuid,text,text,jsonb)`.\n\nThe fourth JSON argument now accepts either the legacy checked-field array or the new object form, for example:\n\n`{"price":"adjusted","url":"correct","source":"adjusted"}`\n\nFor Gemma learning, each outcome is written with the field, decision, outcome, reason and exact before/after values. Learning keys include the outcome so **correct**, **wrong** and **adjusted** feedback do not overwrite one another.\n\nThis feedback is recorded for both accepted and rejected individual findings. The existing `apply_accepted_ai_candidate(uuid)` path remains the authority for adding accepted evidence to the live catalogue.

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


### AI evidence review — verification links, full objective editing and immediate queue movement (5 September 2026)

The grouped AI evidence review is the working comparison surface for existing catalogue evidence and new AI findings.

Current rules:

- every current catalogue evidence row exposes an **OPEN / VERIFY** source link;
- the exact saved source URL remains visible and directly clickable;
- existing evidence can be edited in place without leaving the AI Research Centre;
- editable objective fields include retailer, type, condition, sell price, buy price, currency, original selling price, VAT basis, VAT rate, availability, buy method, evidence region, exact source URL, checked timestamp and notes;
- overseas/non-GBP evidence displays its stored currency rather than being misleadingly shown as GBP;
- **DENY WITH REASON** saves the decision first and immediately removes the finding from Requires Attention into Denied;
- **SUBMIT TO CATALOGUE EVIDENCE** saves acceptance first and immediately removes the finding from Requires Attention before the live apply step runs;
- if live application fails, the accepted review remains accepted and the UI reports that only the apply step failed;
- an inline processing/status message is shown so a reviewer is not left unsure whether a click worked.

Data flow remains:

`quote_catalog_ai_candidates` → `record_ai_candidate_manual_review(...)` → Accepted/Rejected audit state → optional `apply_accepted_ai_candidate(...)` → `quote_catalog_retailer_prices`.

No automatic buying-price logic was changed.


---

## AI Research Centre — Grouped Review Panel Collapse Diagnostic Roadmap

### User action
Open or close a matched catalogue-product review in **AI Research Centre → Review, edit and decide**.

### Front-end entry point
- `admin-ai-research.html`
- Native `<details class="ai-product-review-details">` grouped review panel.

### Controller and state
- `admin-ai-research.js`
- `activeProductReviewId`
- `openProductReview(productId)`
- document `toggle` handler for `.ai-product-review-details`
- `comparisonEvidenceByProduct` cache.

### Expected data flow
1. Opening a native details panel records the active product review.
2. Current catalogue evidence is loaded from `quote_catalog_retailer_prices` for the linked catalogue product when not already cached.
3. The panel remains open naturally while evidence loads.
4. A render after loading is allowed only if the same review is still active.
5. Closing the panel clears `activeProductReviewId`.
6. A delayed evidence load must not recreate a panel as open after the reviewer has closed it.

### Failure point / known fix history
A previous implementation called `render()` immediately during the native details opening transition and again after the asynchronous evidence load. That could race with the browser's close state and make grouped reviews appear impossible to collapse. The repair removes the synchronous opening render and guards the post-load render with the current active review ID.

### Backend impact
No Supabase schema or workflow change. The existing evidence source remains:

- `quote_catalog_retailer_prices`

The repair is UI state handling only; it must not alter manual review, deny, accept or live-evidence application workflows.


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


### 5 September 2026 — Inline decision processing status repair

The grouped AI evidence review's manualReviewAction(...) already changed the clicked button label and wrote a page-level result message, but the review markup did not actually contain the .ai-manual-review-status element that the action code was trying to update.

A dedicated inline live-status region now exists inside every manual review panel. It reports the actual transition in place:

- saving review decision and moving out of Requires Attention;
- saving denial and moving to Denied;
- any returned error.

The existing Supabase decision and application authorities are unchanged:

record_ai_candidate_manual_review(...) → decision transition, then optional apply_accepted_ai_candidate(uuid).


---

## MPB UK evidence rule and audit — 5 September 2026

### Source-specific evidence rule

MPB category pages and brand pages are **discovery pages**, not final exact-price evidence.

Required route:

Catalogue product
→ MPB category/brand discovery if useful
→ exact MPB `/en-uk/product/...` model page
→ inspect every live individual unit
→ store each relevant unit separately.

MPB model pages can expose multiple live units with separate:

- SKU;
- selling price;
- cosmetic condition;
- charges where shown;
- included accessories/controller/package details.

These must not be collapsed into one representative price.

### Audit finding

The existing database contained **1,743 MPB evidence rows**:

- 759 exact MPB product-page rows;
- 404 category-page rows;
- 465 brand-page rows.

Across 1,176 products with MPB evidence:

- 549 had **only generic MPB evidence** and no exact product-page evidence;
- 352 had only one exact MPB row;
- 109 had multiple exact MPB rows;
- 629 products contained at least one generic MPB row.

Generic category/brand evidence is therefore not reliable enough to treat as final exact product evidence and requires replacement through exact MPB model-page auditing.

### Verified example — DJI Mavic 3

The exact current MPB Mavic 3 page exposed multiple live used units. Under the current design, these are aggregated into one reference-only From → To range with a direct verification link instead of separate SKU evidence rows.

The generic/category evidence was removed. The current MPB design now represents an exact MPB product page as one reference-only From → To range with conditions represented and a direct verification link, rather than persisting one evidence row per SKU.

**Verification source:** exact MPB Mavic 3 model page.


### MPB UK audit architecture repair — 5 September 2026

The MPB sweep exposed two additional first-failure points that had to be corrected before a historical audit could be trusted:

1. **MPB UK was not present in the active AI source registry**, so the local worker could not deliberately probe MPB as a UK used-market source.
2. **The generic candidate model treated one URL as one observation**, but an exact MPB model page can contain many live SKUs.

MPB UK is now registered as an enabled used_dealer source with used_uk scope and priority 5.

Worker version 1.4.7 adds deterministic MPB UK extraction from exact /en-uk/product/... pages. Each live SKU becomes a separate evidence candidate with its own price, cosmetic condition and charges/shutter metric where present.

The evidence table's uniqueness rule also required SKU-level source identity because two genuine MPB units can share the same condition and price. MPB unit URLs therefore use a #mpb-sku-... fragment while retaining the canonical model URL in notes.

A dedicated roadmap now exists at:

docs/MPB-UK-EVIDENCE-AUDIT-DIAGNOSTIC-ROADMAP.md

Live verification also refreshed:

- DJI Air 3 Standard Package (DJI RC-N2): one exact live MPB unit at £584.
- DJI Mini 4 Pro Standard Package: four exact live MPB units from £444 to £639.

The generic-only audit count moved from 549 to **547**.

The historical sweep remains in progress; it must not be marked complete until every remaining generic-only product has an exact, out-of-stock, not-stocked, or explicit package-mismatch outcome.


### Deep Source / Website Audit — 5 September 2026

A new research mode was added because normal source searching can find a category or landing page without proving that the exact product was searched deeply enough.

Deep Source Audit works from a user-entered landing page but treats that page as discovery-only.

Flow:

landing page
→ relevant categories
→ relevant subcategories
→ source-specific internal search where available
→ exact product page
→ evidence extraction.

Supabase runs now support:

- evidence_scope: deep_source
- deep_source_url
- deep_source_domain

The Deep Source run uses the existing secure research queue and Research PC rather than creating a second worker system.

The Edge Function quote-catalog-ai-worker was deployed as version 8 to create Deep Source runs.

Repository worker version is now 1.4.8. The Research PC must be updated from 1.4.7 before live Deep Source work begins.

Current explicit source rules include MPB UK and a DJI framework rule. MPB exact pages remain deterministic: every live SKU is preserved separately.

Category, manufacturer, brand and search pages are discovery-only and must never be accepted as final product price evidence.


### Catalogue-centred Pending AI Evidence Review — 5 September 2026

Pending AI findings now have a first-class review surface inside `admin-catalog.html`.

The live/pending separation is unchanged:

- `quote_catalog_ai_candidates` with `decision='pending'` = proposed evidence only.
- `quote_catalog_retailer_prices` = verified live catalogue evidence.

Pending evidence is displayed beside the relevant product under a prominent red **P** and **PENDING EVIDENCE — NOT LIVE** heading. It is grouped into:

- UK — NEW
- UK — USED / OTHER
- OVERSEAS

The main catalogue has a top warning bar showing total pending evidence and affected products, grouped by manufacturer with a product dropdown. Product cards with pending findings receive a red PENDING badge.

Review flow:

1. Verify/edit the proposed evidence on the catalogue product.
2. Record field-by-field outcomes and a reason when denying or correcting.
3. Accept → `record_ai_candidate_manual_review` → `apply_accepted_ai_candidate` → live evidence row.
4. Deny → candidate becomes rejected; existing live catalogue remains unchanged.

Pending evidence cannot affect live comparison or automatic pricing before approval.

Implementation file:

- `admin-catalog-pending-ai-review.js`


## 6 September 2026 — MPB used-market reference ranges

MPB UK is now treated as **Used / Other Evidence — Reference Only**. The exact MPB product page is the evidence identity. Multiple live units on that page are aggregated into one pending range: **From price**, **To price**, conditions represented and units observed. The direct canonical MPB product URL is retained so staff can verify the latest stock and manually refresh stale evidence. MPB evidence does not alter automatic buying prices.


---

# 6 September 2026 — AI Research Completed-Decision Audit Simplification

The active **Review, edit and decide** evidence area in the AI Research Centre is no longer the primary review workspace.

Current routing:

- pending evidence remains in Supabase and is reviewed from the **Automatic Quote Catalogue**;
- **Rejected findings** remain visible in the AI Research Centre for audit and Gemma learning;
- successful accepted findings appear in **Applied to live evidence**;
- an accepted finding that cannot be applied is retained in a visible **Live application issues** recovery section so an application failure cannot disappear silently.

No database schema, RLS, review-feedback RPC or live-evidence application RPC was changed.


### Deep Source landing-page history — 6 September 2026

The AI Research Centre's **Deep Source / Website Audit** now keeps a persistent dropdown history of recently entered valid landing-page URLs on the staff device/browser. A new valid URL is normalised and saved, duplicates are de-duplicated, and the most recent entry is shown first. The history is capped at 20 URLs.

The saved history does not replace the run configuration: the currently selected/entered URL remains the explicit `deep_source_url` sent to the Deep Source workflow.


## Deep Source Audit source isolation and website registry suggestions — 6 September 2026

### Data flow
admin-ai-research.html Deep Source URL field
→ admin-ai-research.js registry + local-history datalist
→ quote_catalog_ai_sources.homepage_url for approved enabled live website suggestions
→ quote-catalog-ai-worker with evidence_scope=deep_source and explicit deep_source_url
→ ai_research_create_deep_source_run(...)
→ quote_catalog_ai_research_runs.deep_source_url/deep_source_domain
→ Research PC collectDeepSourceEvidence(...).

The normal source selector (all versus amazon_uk) is not included in the Deep Source request and does not alter the Deep Source execution branch.

Failure point to remember: the normal Amazon scope previously widened to all because of an RPC persistence bug. That history applies to normal research runs, not Deep Source runs; the Deep Source path has its own explicit branch and run contract.


---

## 6 September 2026 — AI Research Centre control separation

The AI Research Centre has two execution paths which share product-identification filters but do not share source scope or batch controls.

### Shared: Products to research

The following filters identify which catalogue products either workflow should process:

- Manufacturer
- Model / search term
- Category
- Product type

### Regular AI Research only

Regular research uses:

- Market / condition selection;
- All Sources / Amazon UK Only;
- Regular research batch size;
- Continuous mode.

### Deep Source Website Audit only

Deep Source uses:

- the selected website landing page;
- its own Deep Source audit batch size;
- the explicit Deep Source domain as the source scope.

The normal market and source selectors do not broaden a Deep Source audit.

### Important UI rule

There must be no ambiguous duplicate batch-size control. The dashboard keeps:

- **Regular research batch size** for normal AI research;
- **Deep Source audit batch size** for the selected website audit.

Both workflows reuse the shared product filters, so staff select the products once and then choose which research action to run.


## Deep Source Audit live-state and targeted cancellation — 6 September 2026

### Dashboard behaviour
admin-ai-research.js polls the current Deep Source runs and their queue rows. A run is treated as active when its run status is queued/running or any queue row is queued, claimed or processing. The UI shows live progress on RUN DEEP SOURCE AUDIT and reveals CANCEL DEEP SOURCE AUDIT.

### Targeted cancellation data flow
CANCEL DEEP SOURCE AUDIT
→ admin-ai-research.js
→ ai_research_cancel_run(p_run_id)
→ active queue rows for that run become skipped
→ run becomes cancelled
→ Research PC and unrelated research continue.

The completion RPC now only completes queue rows still in processing or claimed, so cancelled/skipped rows cannot be overwritten by a late worker completion. The Research PC worker also checks the persisted run state before writing candidates and exits the current item cleanly when the run has been cancelled.

### Failure point to check first
If the dashboard says an audit is running after completion, inspect quote_catalog_ai_research_runs and quote_catalog_ai_queue for the run. Queue state is authoritative for live activity because the current worker can leave the run record as queued while it processes individual items.


## Pending evidence source-page verification shortcuts — 6 September 2026

The catalogue-centred pending AI evidence review now places an **OPEN SOURCE PAGE** shortcut directly beside the verification fields where the reviewer needs the underlying page most often:

- FROM / TO PRICE RANGE;
- PRODUCT / MODEL / PACKAGE;
- EXACT PRODUCT PAGE URL.

The same exact source URL is also accompanied by an **OPEN / VERIFY PAGE** shortcut in the editable evidence fields. These links open the candidate's canonical `source_url` in a new tab and do not alter the candidate, review outcome, acceptance flow or live evidence.

The existing bottom action remains as a general source-page shortcut, renamed **OPEN / VERIFY SOURCE PAGE** so it is not MPB-specific.


## Pending evidence review — Check All confirmation — 6 September 2026

Where a reviewer has verified that every field in a pending evidence finding is correct, the **VERIFY EACH FIELD** panel now includes **CHECK ALL — AI WAS RIGHT**.

Checking it marks all seven field outcomes as **AI WAS RIGHT** in one action:

- price range;
- product / model / package;
- exact product page URL;
- conditions represented;
- availability;
- source / retailer;
- evidence category.

If any individual field is subsequently changed, the bulk checkbox automatically reflects that the whole set is no longer unanimously marked correct. This is only a review-input shortcut: nothing is written to the candidate or live catalogue until the normal **ACCEPT & ADD TO CATALOGUE** action completes.


---

## 6 September 2026 — Valid evidence routing and catalogue reassignment

### Decision

A model or package mismatch must no longer cause otherwise valid research to be discarded.

The research pipeline now treats a mismatch as a **review and routing condition**:

1. the candidate remains pending;
2. the original mismatch state is preserved for human review;
3. staff can select the correct catalogue product;
4. the candidate is reassigned without recreating or re-researching the source;
5. source URL, title, price/range, condition, availability, notes and timestamps remain on the same candidate record;
6. an audit row records the original and destination catalogue product.

### Diagnostic route

**Pending catalogue evidence card**
→ `admin-catalog-ai-evidence-reassignment.js`
→ `reassign_ai_candidate(...)`
→ `quote_catalog_ai_candidates.catalog_product_id`
→ `quote_catalog_ai_candidate_reassignments`
→ candidate appears under the correct catalogue product for normal verification and acceptance.

### Database change

`ai_research_submit_candidate(...)` now permits valid `package_match='mismatch'` or `variant_match='mismatch'` findings to enter the pending review queue. This is intentional: mismatch is no longer a data-loss rule.

### Safety

Reassignment is limited to pending, unapplied candidates and requires staff access. Applied evidence cannot be silently moved.


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


## Mavic 2 MPB package taxonomy correction — 2026-09-06

The Mavic 2 catalogue must follow evidence at the **exact product/package level**, not collapse MPB's separate product pages into one generic model.

### Current catalogue structure

**DJI Mavic 2 Pro**
- Standard Package
- Fly More Combo
- With DJI Smart Controller
- Fly More Combo with Smart Controller

**DJI Mavic 2 Zoom**
- With RC1 Controller (the former generic Standard Package row was corrected to this exact MPB identity)
- Fly More Combo
- With Smart Controller

**Separate accessories, not drone packages**
- DJI Mavic 2 Zoom ND Filter Kit
- DJI Mavic 2 Pro ND Filters Set

### Evidence routing rule

An aircraft page, controller package, Fly More bundle, or filter kit must never share evidence merely because the base model text is similar. Route evidence to the exact catalogue identity. Filter kits are independent accessory products and must not influence drone-package valuation.

The customer valuation wizard reads active package variants from `quote_catalog_products`. Legacy Mavic 2 battery/package compatibility maps were updated to recognise RC1, Smart Controller and Fly More + Smart Controller variants.


## 6 September 2026 — Deep Source filtering and missing catalogue identities

Deep Source filtering now distinguishes a broad model family from the exact source identity. A generic catalogue package such as **Standard Package** is no longer treated as an exact match merely because the base model appears in the page title.

For an exact same-model source page with a distinct identity (controller, Fly More/Combo, bundle, kit, filter/lens or other accessory), the worker:

1. marks the finding as a preserved wrong-target/package identity;
2. keeps the exact source URL and evidence for staff review;
3. creates a pending **NEW PRODUCT CANDIDATE** where that exact identity is not represented by the current catalogue;
4. never auto-adds or activates the discovered product.

This separates two jobs that must not be conflated:

- **evidence filtering** — do not attach RC1/Smart Controller/kit prices to a generic Standard Package; and
- **catalogue discovery** — surface missing exact packages and accessories for approval.

Research PC worker version: **1.5.3**.


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

## 20. 6 September 2026 — DJI package identity normalisation

A live Gemma/MPB regression test exposed that generic **Standard Package** records were too ambiguous for DJI products. A used MPB result titled **DJI Mini 2 with RC-N1 Controller** correctly identified the model but could only be matched against the catalogue's generic **Mini 2 — Standard Package** identity.

### Rule adopted

For DJI drones, a Standard Package should represent a real base package identity, not an undefined aircraft family. Where the controller is part of the identifiable base package, the catalogue package name must include that controller.

Initial MPB-backed normalisation completed:

- Air 2 → **Standard Package (DJI RC-N1)**
- Air 2S → **Standard Package (DJI RC-N1)**
- Mavic Air → **Standard Package (Mavic Air Controller)**
- Mini 2 → **Standard Package (DJI RC-N1)**
- Mini 4K → **Standard Package (DJI RC-N1)**

The Mini 2 pending MPB candidate remains attached to the same product record and now has a precise package identity instead of relying on the generic word “Standard”.

### Important limitation discovered

Not every DJI model has one unique controller identity in used-market listings. MPB can group several controller configurations under one model page, particularly in the Mavic 3 family. Those products must not be blindly renamed to a single controller configuration. They require either separate controller/package records or explicit human reassignment rules.

### Next verification

Run broader DJI research and check:

1. whether exact controller/package wording improves Gemma matching;
2. whether Fly More and controller variants remain distinct;
3. whether generic model pages containing mixed controller configurations are kept in review;
4. whether ambiguous generic Standard Package records should be split or retired rather than renamed.


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

## Phase 2 — Retail Storefront Foundation — 6 September 2026

GearCashOut now has an additive backend foundation for a separate branded retail storefront while preserving the existing multi-channel sales system.

### Architecture decision

The new public sales website is another sales channel, not a replacement for eBay or other marketplaces. Central inventory remains authoritative. Existing cross-channel sold/delist protection remains the operational model.

### New backend foundation

- `inventory_assets.catalog_product_id` links a physical inventory asset to its exact master catalogue product without guessing ambiguous matches.
- `sales_storefronts` stores storefront-level configuration, including empty-category behaviour.
- `sales_catalog_visibility` provides manufacturer/category/product visibility overrides with `auto`, `show` and `hide` modes.
- `catalog_sales_content` stores reusable product-level hero imagery, manufacturer imagery and product description separately from valuation data.
- `inventory_sales_content` stores item-specific condition description and listing presentation content separately from the master product.
- `staff_sales_market_evidence(uuid)` provides sales-permitted staff with read-only market evidence for pricing once an inventory asset is linked to a catalogue product.
- `staff_link_inventory_asset_catalog_product(uuid,uuid)` provides an explicit controlled link rather than unsafe automatic matching.

### Diagnostic Roadmap

See: `docs/DIAGNOSTIC-ROADMAPS/PHASE2-RETAIL-STOREFRONT.md`

The public storefront repository has not yet been created because the retail brand/domain is still undecided. The shared Supabase infrastructure is intentionally brand-neutral at this stage.


## 6 September 2026 — DJI evidence reassignment and catalogue cleanup

- Fixed the live reassign_ai_candidate(...) RPC so it runs as SECURITY DEFINER while retaining its explicit staff check; this prevents the reassignment audit insert from being blocked by RLS.
- Compact mismatch routing UI: each VALID EVIDENCE — WRONG TARGET DETECTED workflow is now collapsed by default and opens only when routing is needed.
- During the DJI/MPB audit, clear controller/package identities were normalised to exact, accepted and applied to live comparison evidence.
- Clear wrong-target cases were reassigned conservatively: RC-N1, RC1, RC Pro Enterprise, Drone Only and generic Standard Package destinations where the source identity supported them.
- Generic evidence was not forced onto controller, Fly More, Plus, Cine or other specific variants without source support; those cases remain for review.
- Duplicate candidates may point to the same live evidence row after application; this is expected and avoids duplicate market evidence.


## 6 September 2026 — Gemma learning loop from catalogue corrections

The local worker already loads active records from `quote_catalog_ai_learning` and passes them into the Ollama/Gemma validation prompt as **ACTIVE HUMAN LEARNING / SOURCE-SPECIFIC RULES**. The DJI Deep Source audit has now been converted into explicit operational learning, not just historical notes.

Current DJI rules teach Gemma that:

- an explicitly named controller is package identity and beats a generic package label;
- a generic exact-model page must not be promoted into a specific Fly More, Cine, Creator, Plus or premium-controller package without evidence;
- **No RC** means **Drone Only**;
- missing package wording alone is not a positive mismatch;
- MPB UK search/category pages are discovery-only and exact `/en-uk/product/` pages are required for final evidence;
- high-confidence catalogue duplicate checks must compare package identity as well as model identity.

The worker was also updated to **1.5.5**. New Deep Source product candidates now run the existing catalogue duplicate check before creation and store either `likely_duplicate` or `no_high_confidence_duplicate`, with matching catalogue records attached for review. Same-model products with different controller/bundle identities are no longer treated as high-confidence duplicates merely because the base model matches.


### Phase 2 catalogue-to-inventory identity propagation

From 6 September 2026, the paid seller-purchase inventory creation path attempts a catalogue link only when manufacturer, model and package identify exactly one `quote_catalog_products` row. Ambiguous or missing matches remain unlinked for staff review; no fuzzy or family-level automatic matching is used. The relevant functions are `resolve_quote_item_catalog_product`, `staff_backfill_inventory_catalog_links` and the updated `staff_mark_sale_paid_and_create_inventory`.


## Inventory SKU and warehouse identity — 6 September 2026

Every physical item entering `inventory_assets` now receives an immutable unique GearCashOut SKU automatically. The SKU is the operational identity for the individual physical unit and is separate from the master `catalog_product_id` (which identifies the product type). Current format is `GCO-YYYY-######`.

This supports labels, barcode/QR implementation, warehouse location tracking, stock picking, marketplace/website listing reconciliation and audit history. Warehouse foundations are `inventory_locations` and `inventory_location_movements`; staff movement is recorded through `staff_move_inventory_asset`.


## Central Outlet → Listing → SKU architecture — 6 September 2026

Sales are now being standardised around a central model: **one physical inventory asset/SKU → many outlet listings**. The existing `resale_listings` table remains authoritative for listing lifecycle and sold/delist protection; a new `sales_outlets` registry identifies the outlet behind each listing. This supports owned storefronts, marketplaces and future auction outlets without duplicating inventory.

When one listing is marked Sold, the central sold workflow marks competing active listings for the same asset as **Delist Required** and marks the physical inventory asset Sold. This existing protection remains the single operational truth; outlet additions must not create independent sold-state logic.


## Package equivalence and retailer-aware alias learning — 6 September 2026

Gemma must not rely on exact package-name strings. GearCashOut catalogue products are the canonical identities, compared by manufacturer, model, controller, bundle/package, included accessories and variant. Alternative retailer descriptions may be learned as aliases, but aliases retain source/retailer provenance and confidence. Retailer-specific terminology is not automatically global.

Equivalence states are **confirmed**, **probable** and **ambiguous**. Only confirmed mappings may be used confidently; probable mappings are review suggestions; ambiguous mappings must not be forced. Positive conflicts such as controller identity, No RC, Fly More/Cine/Creator/Plus wording, battery count or package-defining accessories prevent automatic equivalence. New aliases require repeated exact evidence, independent confirmation or explicit human confirmation before promotion to confirmed learning.


## Dynamic Sales Workbench outlets — 6 September 2026

The Sales Workbench no longer uses a hard-coded marketplace array. Active outlet blocks are read from the central `sales_outlets` registry, filtered by the database to active outlets only. Each saved listing carries `outlet_id` while retaining the existing sales-channel display field for compatibility. This means new owned websites, specialist stores and future auction outlets can be added centrally without editing the Sales Workbench source.

Security: the browser uses the authenticated Supabase client and RLS-protected tables. The UI is not trusted as the authority for sold-state protection; the existing staff RPC/database workflow remains authoritative.


---

## 17Z. 6 September 2026 — DJI controller-aware package correction pass

A live review of new Gemma/MPB findings confirmed that generic model titles must be checked against the **exact product page and observed included controller**, not matched by the words “Standard Package” alone.

### Rules confirmed in live use

- An explicit controller in an exact listing is a package-defining identity component.
- If all observed units on an exact model page show the same controller, the evidence may be routed to that exact controller package.
- If the observed units contain mixed controllers, one aggregate price range must **not** be forced into a single controller package.
- An explicit **No RC** identity routes to **Drone Only**.
- A separately titled battery/accessory must be treated as its own catalogue product, not as a drone package.
- A controller-only identity must not be upgraded into **Fly More** unless the source positively proves the Fly More bundle.

### Catalogue additions made

- DJI Air 3S — Standard Package (DJI RC 2)
- DJI Mini 5 Pro — Standard Package (DJI RC-N3)
- DJI Neo — Drone Only
- DJI Mini 5 Pro Intelligent Flight Battery — Standard Item

The additions preserve controller/package identity while preventing MPB’s retailer wording from being mistaken for a different Fly More or premium bundle.

### Remaining ambiguity rule

Mixed-controller aggregate pages, such as the observed DJI Mini 4 Pro MPB page, remain pending until evidence can be separated by exact unit/package identity.


## Management-only Outlet Registry — 6 September 2026

Outlet administration is available only from the central **GearCashOut Staff Dashboard**, alongside the existing management-facing functions. Management users can open **OUTLET MANAGEMENT** to add an outlet and activate or deactivate it. The registry supports owned websites, marketplaces, auction outlets and other outlets.

Security and preservation rules:

- the page performs its own authenticated active-management check before rendering controls;
- database RLS separately enforces management-only writes;
- ordinary sales staff can read active outlets for legitimate listing work but cannot create or alter outlets;
- outlets are deactivated rather than deleted so historical listing relationships remain intact;
- no service-role credential is present in the browser.


## Management-only Outlet Registry — 6 September 2026

Outlet administration is accessed only from the central **GearCashOut Staff Dashboard**, alongside the existing management-facing functions. Management users can open **OUTLET MANAGEMENT** to add an outlet and activate or deactivate it. The registry supports owned websites, marketplaces, auction outlets and other outlets.

Security and preservation rules:

- authenticated active-management check before controls are usable;
- database RLS separately enforces management-only writes;
- ordinary sales staff cannot create or alter outlets;
- outlets are deactivated rather than deleted so historical listing relationships remain intact;
- no service-role credential is present in browser code.


## Slow-Moving Stock & Outlet Strategy — 6 September 2026

Management-only **SLOW-MOVING STOCK** is accessed from the central Staff Dashboard. It reports each unsold physical SKU's age, purchase cost, active listing count, active outlet coverage and an advisory strategy band.

Current advisory thresholds are 30 days (review), 60 days (expand outlets/price review), 90 days (urgent strategy review) and 120 days (auction/exit review). A sales-ready asset with no active listing is separately flagged.

This feature is deliberately read-only/advisory. It never automatically changes a price, moves stock to auction, closes listings or alters inventory status. Management decides any action through the existing controlled workflows.


## Outlet Coverage & Controlled Sales Handoff — 6 September 2026

The management-only Slow-Moving Stock page now compares every unsold SKU against the **active central Outlet Registry**. It shows:

- outlets currently carrying an active listing;
- the number of active registry outlets not currently carrying the SKU;
- the names of those missing outlets;
- a direct handoff into the existing Sales Workbench for that exact SKU.

The strategy page remains advisory. The handoff does not automatically publish, price, close or create listings; it opens the existing controlled Sales Workbench, where staff use the established listing workflow.


## Sales Dashboard Management Attention — 6 September 2026

The existing **Sales Dashboard** remains the operational workflow centre. A compact **MANAGEMENT ATTENTION → Stock Strategy** panel is now integrated into that dashboard for authorised management users.

It summarises:

- sales-ready stock with no active listing;
- stock at 120+ days requiring auction/exit review;
- stock at 90+ days requiring urgent strategy review;
- stock at 60+ days requiring outlet, price or presentation review;
- stock at 30+ days requiring routine review.

The panel links to the detailed **Slow-Moving Stock & Outlet Strategy** page. It does not create listings, publish products, change prices, move stock or close listings.

Ordinary sales staff do not receive this management panel. The browser checks active management permission before displaying it, while the underlying strategy RPC remains database-authorised for management only.

**Developer investigation map:** [Phase 2 Retail Storefront Diagnostic Roadmap](DIAGNOSTIC-ROADMAPS/PHASE2-RETAIL-STOREFRONT.md).


---

## Pending evidence alternative-product routing — 6 September 2026

Valid evidence must not disappear merely because its original catalogue target is wrong. Any pending candidate with a package/model/variant mismatch must expose the compact **VALID EVIDENCE — ROUTE TO AN ALTERNATIVE PRODUCT** control. The routing decision is preserved through `reassign_ai_candidate(...)`; the source finding is not recreated and duplicate live evidence is not created.

The UI must not depend solely on transient rendered dropdown values to decide whether the control exists. It checks both the visible review state and the persisted candidate mismatch state, with delayed rescans for asynchronous catalogue rendering. The compact panel remains collapsed by default so large audits do not produce pages of expanded controls.


---

## Unified What Needs Doing — Task Intelligence Upgrade — 6 September 2026

The shared **What Needs Doing** board now provides a more explicit operational priority layer across the main Staff Dashboard, Purchasing Dashboard and Sales Dashboard.

It continues to read existing workflow state; it does not create a second task database.

New behaviour:

- **CRITICAL** — immediate action requiring priority treatment, currently including duplicate marketplace listings marked for closure.
- **PRIORITY** — important operational actions, including confirmed customer payments awaiting recording and repair-required inventory.
- **OVERDUE** — workflow actions waiting beyond the normal review window.
- **CURRENT** — newly raised or recent actions.
- **FOCUS NEXT** — the highest-ranked live task provides a direct handoff into the existing workflow page.
- **WORK AREA FILTERS** — staff can temporarily filter the live board by Purchasing, Inventory, Sales, Returns and other categories present in the current workload.
- duplicate task keys are collapsed so the board does not show the same actionable item repeatedly.

The task board remains advisory and navigational. Opening a task takes staff to the existing workflow; it does not automatically change item status, send payments, publish listings, dispatch stock or close marketplace listings.

**Developer investigation map:** [Phase 2 Retail Storefront Diagnostic Roadmap](DIAGNOSTIC-ROADMAPS/PHASE2-RETAIL-STOREFRONT.md).


## Pending evidence routing UI density — 6 September 2026

When many pending findings are valid evidence with a wrong catalogue target, the catalogue must not render a full routing box for every item. The routing workflow is now **lazy-open**:

1. A mismatch candidate shows one compact **ROUTE TO ALTERNATIVE PRODUCT** control inside its existing evidence card.
2. The searchable destination selector and move action are created only when that control is pressed.
3. The existing `reassign_ai_candidate(...)` RPC, reassignment audit table and preservation rules are unchanged.
4. Removing the mismatch state removes the compact control/panel.

This is a UI-density correction only. No candidate, evidence, catalogue product or learning record is changed by rendering the compact control.


### Follow-up fault — routing MutationObserver loop

A follow-up test exposed a browser freeze: pending records whose editable fields initially displayed as NOT CHECKED could be server-confirmed mismatches. The observer then alternated between removing and recreating the routing control. The routing script now caches the server route state per card and uses an in-flight check guard, preventing DOM mutation loops. Cache version is `20260906-alternative-route-5`.


### Follow-up regression — alternative-product routing disappeared after freeze repair

The freeze repair prevented the MutationObserver loop, but a separate startup race remained. The reassignment script can run before window.actionBuyerAuth.supabase is ready. In that state getCandidateRouteState() returned null, and the previous repair cached the card as not-required. That incorrectly suppressed ROUTE TO ALTERNATIVE PRODUCT for genuine pending database mismatches.

Repair: an unavailable/failed server lookup now leaves the card in unknown, with bounded retries. Only a successful database response may set required or not-required. The existing loop protection remains: required controls are not repeatedly removed/recreated. Cache version: 20260906-alternative-route-6.


### Alternative-product search performance fix — 6 September 2026

The routing panel must not preload the full active catalogue into a native select. The catalogue currently contains thousands of active products; injecting them all into the select made the page sluggish and made the search appear inactive. The panel now requires at least 2 search characters, returns a maximum of 100 matches, and reports the match count. The selected reassignment workflow and server-side RPC are unchanged. Cache version: 20260906-alternative-route-7.


### Catalogue stability fix — 6 September 2026

The alternative-product reassignment script must not rescan the entire document for every DOM mutation. The previous broad MutationObserver watched the full document and called a full catalogue scan on each mutation, including DOM changes made by the reassignment script itself. During rendering/scrolling this could create heavy repeated work and renderer instability. The observer now batches only added DOM roots and processes pending-candidate cards inside those roots. Existing initial scans and field-change handling remain in place. Cache version: 20260906-alternative-route-8.


---

## Controlled Phase 2 Test Stock — 6 September 2026

A controlled sample batch of **8 inventory assets and 4 resale listings** was created to allow the Inventory → Sales → Outlet infrastructure to be tested before genuine purchasing stock is available.

The records are linked to real quote_catalog_products and receive normal production-format SKUs. They are explicitly marked in their inventory notes as **TEST DATA**.

The existing management-only **Delete All Test Data** route uses reset_test_quote_data() and already deletes, in dependency order:

1. inventory return data;
2. customer return requests;
3. resale transactions;
4. resale listings;
5. inventory assets;
6. purchasing test records and related workflow data.

Therefore no separate sales-test deletion button was required.

The current batch covers Ready for Resale, Inspection Required, Repair Required, Sent to Sales, Draft website listing, Published Website/eBay listings, Delist Required duplicate-listing scenario, and stock ages ranging from recent to 120+ days.

These records are for system testing only and must not be treated as genuine stock or financial history.


### Alternative-product routing stability repair — 6 September 2026

The missing-routing-control and catalogue-shudder regression was traced to two separate client-side render races:

1. the reassignment script repeatedly discovered cards through startup scans/DOM observation;
2. the pending-review script repeatedly replaced the entire pending evidence section during its eight-pass startup retry loop.

The stable design is now:

- admin-catalog-pending-ai-review.js renders ROUTE TO ALTERNATIVE PRODUCT directly from the authoritative persisted candidate mismatch fields;
- admin-catalog-ai-evidence-reassignment.js only handles clicks and direct field changes;
- there is no document-wide MutationObserver, delayed full-page routing scan or per-mutation rescan;
- opening the route control still verifies the candidate server state before moving evidence;
- the pending section is rendered once per authoritative pending-data refresh, not repeatedly during startup.

Do not restore either the old repeated pending-section retry loop or a global routing observer to solve future display problems.


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


---

## Duplicate Listing Closure Control — repaired 6 September 2026

The Sales Dashboard urgent warning now opens a dedicated staff page:

`delist-actions.html`

Each outstanding **Delist Required** action shows:

- exact product;
- SKU;
- asset reference;
- the sales channel and listing reference that must be closed;
- the channel recorded as sold, where available;
- every other recorded listing/channel for the same physical SKU;
- an explicit **OPEN SALES WORKBENCH** handoff;
- an optional live-listing link when one has been recorded;
- an explicit **CONFIRM LISTING CLOSED** action.

The system does **not** attempt to close a third-party marketplace listing automatically. Staff close it on the marketplace first, then confirm closure in GearCashOut.

The closure RPC now also requires an **active** staff account, not merely a historical staff_users row.


## Catalogue consolidation rule — exact evidence only (6 September 2026)

When duplicate or overlapping catalogue package rows are removed:

1. inspect every dependent evidence/candidate/queue record before deleting the product;
2. move evidence only where the source explicitly supports the destination package/controller identity;
3. if the exact same evidence already exists on the correct destination, remove the redundant duplicate rather than creating another copy;
4. never force ambiguous model-level evidence into a remaining package merely because the duplicate row is being removed;
5. accessory-only evidence must not be merged into a drone bundle unless the source proves the bundle itself;
6. remove stale AI candidates that embody a known incorrect forced-routing decision rather than preserving them as future training examples;
7. retain the decision and reason in structured project memory/checkpoints.

### DJI Mavic 3 Classic application

The overlapping **Standard Package** and accessory-only **Fly More Kit** catalogue rows were removed after clear evidence was consolidated into:

- **Drone Only** where the official Drone Only identity was already represented;
- **Standard Package (DJI RC)** where the source explicitly identified DJI RC;
- **Fly More Combo** where the source explicitly identified the complete combo.

Generic MPB/model-level evidence and exact accessory-only Fly More Kit evidence were not reassigned to a guessed drone package. This preserves the core rule that uncertainty must remain unresolved rather than being converted into false package certainty.


---

## Valuation Catalogue Duplicate-Option Guard — 6 September 2026

A reported customer-side duplicate Mavic 3 Classic package display was investigated against the live Supabase catalogue before deleting any product.

### Database result

The live active/customer-visible DJI Mavic 3 Classic catalogue contains four distinct package identities:

- Drone Only;
- Fly More Combo;
- Standard Package (DJI RC-N1);
- Standard Package (DJI RC).

No duplicate normalised manufacturer + model + package-key rows were present. The controller-specific Standard Packages must remain separate because they represent different package identities.

### Front-end protection

The valuation wizard remains database-driven through:

`valuation.html` → `quote-reverse-basket-v5.js` → `quote_catalog_products`.

A defence-in-depth `quote-catalog-dropdown-guard.js` now removes only true duplicate dropdown identities:

- categories/product types/manufacturers/models by normalised display identity;
- packages by normalised package key.

This does not collapse legitimate controller variants. The valuation script cache version was also advanced so browsers fetch the current catalogue code rather than continuing to use an older cached script.

### Diagnostic lesson

Before deleting an apparent duplicate from the catalogue, verify the live normalised database identity and distinguish:

**same model + same package key = duplicate candidate**

from:

**same model + different controller/package key = legitimate package variant**.


---

## Repair Required → Testing → Ready for Resale repair — 6 September 2026

The Product Workbench now correctly handles a successful **post-repair test**.

Previously, if an asset was already in **Repair Required**, staff could save passing inspection/testing results, but the transition code only promoted assets when their current status was already **Testing**. The item therefore remained stuck in **Repair Required**, and the Send to Sales control stayed blocked.

The repaired flow is:

`Repair Required` → repair completed → `Testing` → post-repair tests pass → `Ready for Resale` → **Send to Sales**.

The completion panel now also explains the exact blocking reason instead of leaving staff with an apparently unresponsive disabled button.


---

## Explicit Repair Required workflow — 6 September 2026

Repair Required is now a dedicated Product Workbench workflow rather than a hidden status. When an asset is in **Repair Required**, staff see a prominent warning with the recorded fault and cannot continue normal inspection/testing by simply saving passing values.

The repair record captures the fault, repair work, repairer type/name, repair cost, completion date and optional evidence. The controlled database function `staff_complete_inventory_repair(...)` requires an **active staff user**, requires the asset to be in **Repair Required**, records the repair, optionally creates a linked `inventory_expenses` Repair cost, and moves the asset to **Testing**.

Workflow: `Repair Required` → **record completed repair** → `Testing` → **post-repair test** → `Ready for Resale` → `Sent to Sales`.

There is deliberately no generic **Clear Repair Required** button.
