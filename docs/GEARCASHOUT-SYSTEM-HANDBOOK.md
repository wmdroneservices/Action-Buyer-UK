# GearCashOut System Handbook and Developer Memory

**Status:** Living document  
**Purpose:** Human-readable operating and development reference for GearCashOut / Action-Buyer UK.  
**Audience:** Gary, future developers, administrators and AI assistants working on the system.

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

## Current baseline

This handbook records the system state and design direction as understood from the current repository and recent development work in September 2026. It should be expanded through a systematic repository and Supabase audit rather than relying indefinitely on conversational recollection alone.
