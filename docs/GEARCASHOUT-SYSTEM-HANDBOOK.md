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
