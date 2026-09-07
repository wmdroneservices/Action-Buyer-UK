# Developer Diagnostic Roadmap — Deep Source / Website Audit

## Purpose

Deep Source Audit starts from a user-supplied website or marketplace landing page and deliberately searches deeper through relevant category/subcategory paths before accepting evidence.

A landing page is **never final product evidence**.

## User action

AI Research Centre:

1. Paste the landing page URL into **Deep Source / Website Audit**.
2. Choose the normal catalogue filters and Deep Audit batch size.
3. Press **RUN DEEP SOURCE AUDIT**.
4. Edge Function creates a deep_source research run.
5. Research PC worker claims each product.
6. Worker crawls from the landing page, follows relevant same-domain category/subcategory links and uses source-specific rules.
7. Only exact product pages are returned as final evidence candidates. MPB exact pages become one range candidate rather than one candidate per unit.
8. MPB exact product pages are aggregated into one reference-only Used UK range: minimum price, maximum price, conditions represented, unit count and canonical verification URL.

## Front-end

- admin-ai-research.html
  - deep-source-url
  - deep-source-limit
  - run-deep-source-audit
- admin-ai-research.js
  - runDeepSourceAudit()

## Supabase

### Run table

quote_catalog_ai_research_runs

New fields:

- evidence_scope = deep_source
- deep_source_url
- deep_source_domain

### Run creation RPC

ai_research_create_deep_source_run(...)

### Queue

quote_catalog_ai_queue

No separate queue table is used. Deep Source runs use the normal secure worker queue.

### Edge Function

quote-catalog-ai-worker

Deployed version 8 accepts:

- evidence_scope: deep_source
- deep_source_url

and routes the request to the Deep Source RPC.

## Research PC

tools/gear-ai-local-agent/agent.mjs

Current repository version: **1.5.0**

Key path:

getRunResearchConfig()

→ detects deep_source

→ collectDeepSourceEvidence(...)

→ source rule selected by domain

→ internal site search where defined

→ breadth-first same-domain crawl from landing page

→ relevant categories/subcategories

→ exact product-page validation only

→ normal candidate submission/review flow.

## Source-specific rules

deepSourceRules

Current explicit rules:

### MPB UK

- exact page rule: /en-uk/product/...
- deterministic deep crawl from supplied landing page
- internal search attempts
- exact product pages only
- all live units extracted with `extractMpbUkUnits()` and aggregated into one reference-only From → To range per exact MPB page

### DJI

- framework rule for product/product-family URL discovery
- source-specific search attempts
- category/subcategory crawl
- exact page validation before final evidence

Other domains use the generic deep-source framework but remain review-first until a source-specific rule is added and verified.

## Non-negotiable rule

Category, manufacturer, brand, search and landing pages are:

**DISCOVERY ONLY**

They must never be stored as the sole final product price evidence.

## Failure points

1. Landing URL invalid → Edge Function rejects request.
2. deep_source rejected by run constraint → check quote_catalog_ai_research_runs_evidence_scope_check.
3. Old Research PC worker → Deep Source runs are claimed but old code cannot process them correctly.
4. Crawl stops on landing/category page → check collectDeepSourceEvidence.
5. Exact model page found but package differs → do not auto-apply.
6. MPB exact page has multiple units → verify minimum, maximum, conditions and unit count are extracted.
7. Preserve the canonical product URL as the single verification link.

## Deployment state

GitHub repository contains worker 1.5.1.

The Research PC must be updated from 1.4.7 to **1.4.8** before a live Deep Source run.


## Catalogue review hand-off

Deep Source output must enter `quote_catalog_ai_candidates` as pending evidence. It is surfaced in the main catalogue by `admin-catalog-pending-ai-review.js`.

The Deep Source worker must never bypass this review layer by writing directly to `quote_catalog_retailer_prices`.

Pending findings:

- receive a red P marker;
- are grouped into UK NEW, UK USED / OTHER and OVERSEAS;
- are visible in the catalogue warning dropdown;
- cannot affect live pricing before `apply_accepted_ai_candidate`.


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


## Persistent landing-page URL history — 6 September 2026

The Deep Source landing-page field now keeps a local persistent history for the staff dashboard:

1. Staff enters a full `http://` or `https://` landing page URL.
2. A valid URL is normalised and saved when the field is changed/left, and again when an audit is started.
3. The most recent URL appears first in the **Landing page URL** dropdown suggestions.
4. Duplicate URLs are de-duplicated and moved to the top.
5. Up to 20 recent Deep Source URLs are retained on that device/browser.

This is UI history only. The selected URL still remains the explicit `deep_source_url` sent with each Deep Source run, so saved suggestions do not silently change or broaden the audit source.


## Source filter isolation and database-backed URL suggestions — 6 September 2026

### Confirmed behaviour
Deep Source Audit is a separate execution path. runDeepSourceAudit() sends only evidence_scope: deep_source and deep_source_url; it does not send the normal research-source-filter value.

The Edge Function treats either evidence_scope === deep_source or a supplied deep_source_url as a Deep Source run and calls ai_research_create_deep_source_run(...) directly. The normal all / amazon_uk branch is therefore not entered.

The Research PC then reads the run configuration and uses deep_source_url / deep_source_domain for same-domain discovery and exact-product evidence.

### URL dropdown
The landing-page datalist is now populated from approved, enabled, live rows in quote_catalog_ai_sources.homepage_url, then supplemented by the browser previously used Deep Source URLs. The database registry therefore supplies shared approved website suggestions, while local history remains a convenience for manually entered URLs.


---

## 6 September 2026 — Shared product filters and independent workflow batch controls

### Dashboard control map

The AI Research Centre now deliberately separates **product identification** from **workflow execution**.

#### Shared product filters

These identify the catalogue products for both workflows:

- Manufacturer
- Model / search term
- Category
- Product type

The same four values are sent by:

- `runResearch()` for Regular AI Research; and
- `runDeepSourceAudit()` for Deep Source Website Audit.

They are product selectors, not source selectors and not batch controls.

#### Regular AI Research controls

Only the normal workflow uses:

- Market / condition
- All Sources / Amazon UK Only
- `research-limit` (Regular research batch size)
- Continuous mode

#### Deep Source Website Audit controls

Only the Deep Source workflow uses:

- `deep-source-url`
- `deep-source-limit` (Deep Source audit batch size)
- `RUN DEEP SOURCE AUDIT`

The normal market/source controls remain isolated from Deep Source. Deep Source still sends:

`evidence_scope: 'deep_source'`

plus the explicit selected:

`deep_source_url`

### Failure-prevention rule

Do not add a second generic batch-size control to the shared product-filter area. The two batch controls are intentionally independent:

- `research-limit` controls Regular AI Research only.
- `deep-source-limit` controls Deep Source Website Audit only.

This prevents one workflow's batch setting from silently overriding the other.


## Live-state and cancellation controls — 6 September 2026

### User action
1. Start RUN DEEP SOURCE AUDIT.
2. Dashboard detects the created Deep Source run and its active queue rows.
3. Run button becomes DEEP AUDIT RUNNING · processed/total.
4. CANCEL DEEP SOURCE AUDIT is available without scrolling to the global worker stop controls.

### Cancellation path
admin-ai-research.js
→ ai_research_cancel_run(run_id)
→ quote_catalog_ai_queue active rows become skipped
→ quote_catalog_ai_research_runs.status = cancelled
→ local worker sees cancelled status before further candidate writes.

### Important separation
Targeted Deep Source cancellation must not call ai_research_emergency_stop(). The emergency stop is intentionally global and stops all active research plus the Research PC workflow; the Deep Source cancel control affects only the selected audit run.


## Catalogue review source-page shortcuts — 6 September 2026

### User action
In the Automatic Quote Catalogue pending-evidence card, the reviewer can open the canonical candidate page directly while checking:

- price range;
- product/model/package match;
- exact product-page URL.

### Front-end path

`admin-catalog-pending-ai-review.js`

→ reads `edited_source_url ?? source_url`

→ renders **OPEN SOURCE PAGE** beside the relevant verification controls

→ opens the exact candidate page in a new tab.

The editable Exact source URL field also exposes **OPEN / VERIFY PAGE** for the current stored candidate URL. This is a UI/navigation enhancement only; it does not change Supabase data, review RPCs or application flow.


---

## Valid mismatch routing — 6 September 2026

A Deep Source finding that reaches an exact source page but belongs to a different catalogue model/package is no longer discarded.

### Route

Exact page found
→ candidate submitted with visible mismatch state
→ pending catalogue review
→ `admin-catalog-ai-evidence-reassignment.js`
→ staff selects destination product
→ `reassign_ai_candidate(...)`
→ reassignment audit row
→ normal verify / accept / apply flow.

### Failure-prevention rule

Do not convert a positive mismatch into “no evidence found”. A mismatch means the source page may still contain useful evidence for another catalogue row.


### 2026-09-06 Known UI failure fixed
The reassignment panel originally watched only Package Match / Variant Match metadata. Staff could mark **PRODUCT / MODEL / PACKAGE = AI WAS WRONG** in VERIFY EACH FIELD and see no routing control. The reassignment layer now watches that review outcome directly and refreshes immediately on change.

### 2026-09-06 Reassignment destination search improvement
The destination selector was a long non-searchable native dropdown and was additionally restricted to the current manufacturer. It now loads all active catalogue products and filters them client-side by manufacturer/model/package keywords, while preserving score-based ordering.

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


## Mavic 2 package-depth diagnostic addition — 2026-09-06

### Exact identity branches discovered on MPB

A base Mavic 2 landing result can branch into materially different catalogue identities:

- Mavic 2 Pro
- Mavic 2 Pro Fly More Combo
- Mavic 2 Pro with DJI Smart Controller
- Mavic 2 Pro Fly More Combo with Smart Controller
- Mavic 2 Zoom with RC1 Controller
- Mavic 2 Zoom with Smart Controller
- Mavic 2 Zoom ND Filter Kit
- Mavic 2 Pro ND Filters Set

### Required routing check

**Discovered URL/title**
→ classify as aircraft package or standalone accessory
→ exact catalogue identity exists?

If yes:
→ attach evidence to that identity.

If no:
→ create the missing catalogue identity first
→ then route the preserved evidence.

Never use a base-model match to merge controller packages, Fly More bundles or filter kits into a generic aircraft row.


## 6 September 2026 — Deep Source filtering vs catalogue-discovery correction (worker 1.5.3)

### First failure identified

The previous identity-depth fix searched more exact pages, but a generic catalogue package could still absorb a more specific source identity. For example, a page for **DJI Mavic 2 Zoom with RC1 Controller** could be treated as the generic **Mavic 2 Zoom Standard Package** simply because the base model matched.

### Corrected path

Landing/category page
→ deeper exact product-page discovery
→ exact base-model check
→ exact package/accessory identity check

Then:

- exact catalogue identity → normal evidence route;
- same model, wrong/more-specific identity → preserve as wrong-target evidence;
- same model, exact identity absent from catalogue → create **NEW PRODUCT CANDIDATE** with exact source URL/title;
- no automatic catalogue activation or live evidence application.

### Examples

- Mavic 2 Zoom with RC1 Controller → separate package candidate if absent.
- Mavic 2 Zoom Smart Controller → separate package candidate if absent.
- Mavic 2 Zoom ND Filter Kit → separate accessory product candidate if absent.

### Failure-prevention rule

Never use a generic package label as permission to collapse all same-model source pages into one catalogue identity. Generic rows are broad search starting points, not catch-all evidence destinations.


---

## 6 September 2026 — Mavic 3 package reassignment verification

### Trigger

The Mavic 3 MPB Deep Source batch exposed the same broad-family routing problem previously corrected for Mavic 2. Multiple exact MPB pages had been attached to **Mavic 3 — Standard Package**.

### First failure identified

The source pages were exact and valid; the failure was catalogue identity granularity/routing. A broad `Mavic 3` model token was insufficient to distinguish:

- Pro;
- Classic;
- Enterprise;
- Fly More Combo;
- Cine Premium Combo;
- controller-specific Enterprise configuration;
- battery accessory.

### Data correction completed

Exact package rows were added where absent, existing rows were reused where present, the pending candidates were reassigned and applied, and the already-applied Enterprise RC Pro evidence was moved from the generic Standard Package to the exact controller package.

### Verification outcome

The reviewed Mavic 2/Mavic 3 batch now has **0 pending findings**. One duplicate exact-page discovery was retained as rejected audit history; no valid source evidence was discarded.

### Regression test

The next Deep Source/Gemma test should deliberately use a package-heavy DJI family and confirm:

1. category/family pages are discovery-only;
2. exact MPB pages are reached;
3. page title/canonical URL controls identity;
4. known exact package rows receive the evidence;
5. missing exact identities create a new-product candidate instead of contaminating Standard Package;
6. accessories remain separate products.


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


## 6 September 2026 — Current failure/fix history

### Reassignment RLS failure
**Symptom:** MOVE TO CORRECT PRODUCT returned a row-level-security error for quote_catalog_ai_candidate_reassignments.

**First failure:** the RPC was running with invoker rights. The candidate update path was permitted, but the audit-table insert had only a staff SELECT policy and therefore failed under RLS.

**Fix:** reassign_ai_candidate(...) is now SECURITY DEFINER, retains the explicit staff_users/auth.uid() authorization check, and uses the existing controlled audit insert.

**UI containment:** mismatch routing panels are collapsed by default to prevent large audits producing pages of expanded routing controls.

### DJI audit handling rule
- Explicit model/controller/package identity → route to that exact catalogue package and apply after acceptance.
- Generic model identity with no controller/combo claim → use a generic Standard Package only where that generic catalogue product exists.
- Do not infer a specific controller, Fly More, Plus, Cine or premium bundle from a generic source title.


## 6 September 2026 — Gemma learning and duplicate-check path

### Live learning flow

1. Staff/assistant corrects, accepts, rejects or reassigns evidence.
2. Structured reasons/outcomes are stored in review feedback and `quote_catalog_ai_learning`.
3. The Research PC loads active learning for the current manufacturer/product type.
4. The learning rules are injected into the Ollama/Gemma validation prompt.
5. Gemma evaluates newly collected evidence using those prior corrections.
6. Deep Source new-product candidates run a package-aware catalogue duplicate check before creation.
7. High-confidence same-package matches are flagged as `likely_duplicate`; same-model but different controller/bundle identities remain distinct review candidates.

### DJI rules now seeded

- explicit controller identity beats generic package identity;
- generic model pages must not be assigned to unsupported premium bundles;
- **No RC → Drone Only**;
- absence of package wording alone → uncertain, not mismatch;
- MPB final evidence requires exact product pages.

### Worker version

Repository worker is now **1.5.5**. The Research PC must be updated and its heartbeat verified before relying on these new duplicate-check changes.


### Package equivalence learning layer

Before treating a differently worded retailer result as a mismatch or duplicate, compare the canonical identity components:

1. manufacturer;
2. model;
3. controller;
4. bundle/package;
5. included accessories;
6. variant.

Then consult source-aware aliases and retailer-specific naming patterns. Confirmed aliases may support matching; probable aliases require review; ambiguous descriptions remain unresolved. New wording is captured as a candidate learning pattern only when supported by exact evidence, and promoted after repeated independent evidence or explicit human confirmation.


---

## 6 September 2026 — Controller-aware exact-page decision branch

**Exact source page**
→ inspect title and canonical URL  
→ inspect observed unit contents/controller  
→ single positive controller across all observed units?
- **Yes** → match the exact controller package
- **No, mixed controllers** → keep aggregate evidence pending/ambiguous
- **Explicit No RC** → Drone Only
- **Accessory title** → exact accessory catalogue product
- **Bundle name only** → require positive bundle evidence; do not infer from controller

If the exact controller configuration is absent from the catalogue but repeatedly supported by exact evidence, add a narrowly named canonical package and record the source-specific reason.

## Completion-state diagnostic rule — 7 September 2026

After the last product logs Completed product, verify the authoritative run and queue state before diagnosing a freeze:

1. quote_catalog_ai_research_runs — terminal status and products_checked.
2. quote_catalog_ai_queue — all rows terminal (completed, failed or intentionally skipped/cancelled).
3. Only then inspect the worker loop.

The PowerShell window can continue printing independent source-monitor activity after a research run is complete. A repeated HTTP 403 from a monitored opening-soon storefront is not evidence that the research queue is stuck.


## 7 September 2026 — Live MPB hang and duplicate-worker diagnostic

### Live database verification

A new Sony 5-product MPB Deep Source run was checked directly in Supabase after the PowerShell window appeared active but did not produce research progress.

The authoritative state showed:

- run `e27ad564-de94-4e01-bd24-28475dc0dcf6` remained queued with `products_checked = 0`;
- two queue rows were simultaneously `processing`;
- both were claimed within the same second;
- the worker code is designed as a single sequential `processOne()` loop, so two simultaneous claims indicate more than one worker/supervisor process was active;
- the remaining three rows were still queued.

This was therefore a real live research stall, not the earlier completed-run monitor-noise condition.

### First failure

The current MPB discovery path can enter the Chromium fallback after MPB returns HTTP 403. The browser launch path previously had no explicit launch timeout and no stage-level logging. A hung Chromium launch could therefore leave a queue row permanently processing.

### Repair

Repository changes now:

1. add explicit Chromium launch/context/page/content time limits and stage logs;
2. add a whole-product Deep Source collection watchdog, defaulting to 180 seconds;
3. add a local single-instance lock to `supervisor.mjs` so a second Research PC launcher cannot start another worker and claim queue rows in parallel.

### Deployment state

**GitHub repaired; Research PC deployment still required.**

Do not interpret the new repository fix as already active on the Windows Research PC until the local files have been replaced and the launcher restarted.

### Immediate verification after deployment

1. Confirm only one supervisor/worker starts.
2. Start a small MPB Deep Source run.
3. Confirm only one queue row enters `processing` at a time.
4. Confirm PowerShell logs MPB fallback stages when HTTP 403 occurs.
5. Confirm a timeout becomes a clean product failure rather than a permanent `processing` row.
6. Confirm the next queued product can continue after a timeout/failure.


---

## 7 September 2026 — Candidate admission timeout repair

### Failure signature

A Sony Deep Source job logged successful MPB browser fallback collection for a series of unrelated Fujifilm product pages, then failed at the 180-second product watchdog.

### First failure point

Candidate admission, before exact-page identity validation.

The Deep Source link scorer previously allowed an exact product path to meet the candidate threshold without proving that the link belonged to the catalogue target.

### Repair

1. Exact-path status now provides only a ranking bonus.
2. Ordinary discovered candidates must still carry enough target identity to pass the threshold.
3. Explicit deterministic MPB slugs remain allowed as a source-specific discovery fast path.
4. The product watchdog now aborts the collector context, preventing further candidate iteration after timeout.

### Diagnostic rule

If one product log opens multiple unrelated manufacturers/models, inspect candidate admission before changing Gemma, Ollama, or MPB extraction.


---

## 7 September 2026 — Exact-page queue isolation and watchdog orphan follow-up

### Symptom

A Sony Alpha 1 II Deep Source run failed in Supabase after 180 seconds, yet the Research PC continued printing MPB browser fallback activity for unrelated manufacturer product URLs. The dashboard no longer showed the run as active.

### Correct interpretation

Check Supabase first:

- if the run and queue row are terminal, the dashboard is correct to remove the active state;
- continuing PowerShell browser logs then indicate a local collector that outlived its queue item.

### First failure point

`collectDeepSourceEvidence()` had two remaining paths to inspect:

1. **Internal search:** exact low-scoring product links could fall through into the crawl queue.
2. **Breadth-first crawl:** exact low-scoring product links could also fall through to the generic queue path.

Exact product pages are not category traversal pages. If they do not meet the target identity threshold, they must be rejected rather than crawled.

### Repair rule now implemented

For every discovered link:

**Exact product URL**
→ target score ≥ threshold? → candidate for final validation  
→ target score below threshold? → reject/ignore  
→ never enqueue for breadth-first crawl

**Non-exact category/subcategory URL**
→ sufficient discovery relevance? → may enter bounded crawl queue

### Abort rule

The Deep Source watchdog uses an AbortSignal. Every long-running discovery loop must check that signal before starting another fetch and after returning from a bounded fetch. A watchdog timeout must not leave a background crawler opening further URLs after the Supabase queue row has already failed.

### Current deployment marker

Repository worker version: `1.5.9-worker`.

Before live verification, confirm the Research PC heartbeat reports that version. If it still reports `1.5.8-worker`, the Windows worker has not yet been updated and any continued unrelated-MPB behaviour must not be used to judge the repository repair.


---

## 7 September 2026 — Research Centre startup/control freeze

### User action

Open AI Research Centre.

### Front-end entry

admin-ai-research.html
→ auth.js
→ admin-ai-research.js
→ start()
→ initClient()

### Failure point found

Previously:

start()
→ await initClient()
→ await actionBuyerAuth.getSession()
→ auth helper also queried profiles
→ stalled profile request
→ **no controls wired and no initial panels loaded**

### Repair path

initClient()
→ wait for actionBuyerAuth.supabase
→ assign sb
→ direct sb.auth.getSession() with timeout
→ wire controls
→ bounded initial panel loads

### Expected data/control flow

- Deep Source selector: source_registry → Edge Function → quote_catalog_ai_sources.
- Research PC status: direct Supabase → quote_catalog_ai_agents.
- Lifecycle command: dashboard → ai_agent_request_command() → quote_catalog_ai_agent_commands → persistent supervisor.mjs.
- Research PC heartbeat: supervisor/worker → quote_catalog_ai_agents.

### Known fault history

A static **Loading approved websites… / Checking…** screen is now classified as a potential **front-end startup block**, not automatically as a Research PC outage.


## Current failure history — 2026-09-07

**Observed:** Sony Deep Source batch of 5 products timed out at 180000ms, while the Research PC terminal continued launching and collecting MPB URLs. Supabase marked the queue item/run terminal, but the older local worker continued crawling and later wrote raw discoveries into the failed run. Those discoveries included unrelated manufacturers.

**Confirmed first failure:** local deployment drift plus incomplete abort propagation in the older worker. The live Research PC reported 1.5.8-worker while GitHub contained the newer repair.

**Containment repair:** release 1.5.10 propagates cancellation into the Playwright MPB fallback, closes browser resources on abort, and refuses to persist discoveries when the run is no longer active.

**Verification required:** stop the currently running old worker, update the Research PC checkout, restart only through the persistent supervisor, confirm heartbeat 1.5.10, then run a controlled one-product Deep Source test before any five-product batch.


---

## Dashboard stale 0/0 state repair — 7 September 2026

### Symptom
The AI Research Centre displayed **DEEP AUDIT RUNNING · 0/0** and exposed cancellation although Supabase had no active Deep Source queue work.

### First failure
The first durable failure was the zero-product creation path:

1. `ai_research_create_deep_source_run(...)` inserted a run as `queued`.
2. Product filters could select zero active catalogue products.
3. The queue remained empty.
4. `quote-catalog-ai-worker` then unconditionally updated the run back to `queued`.
5. The dashboard treated queued status alone as active.

### Corrected contract
The queue is authoritative. A Deep Source audit is active only when its queue contains `queued`, `claimed` or `processing` rows.

### Files / services
- `admin-ai-research.js` — active-state detection and cancellation reconciliation.
- `supabase/functions/quote-catalog-ai-worker/index.ts` — zero-product response and no forced queued status.
- `ai_research_create_deep_source_run(...)` — zero-product runs complete immediately.
- Supabase migration `fix_zero_product_deep_source_run_state` — live schema/function repair and legacy reconciliation.

### Regression checks
1. Start an audit with filters matching products → active queue row and normal progress.
2. Start an audit with filters matching zero active products → `no_matching_products`, no running lock.
3. Cancel a real active audit → active rows become skipped and controls reset.
4. Refresh the page after completion/cancellation → controls remain idle.


## 7 September 2026 — Deep Source Edge queue-count regression

### First actual failure

The zero-product stale-state repair in the Edge Function used the wrong Supabase response field when checking how many queue rows had been created.

The query used:

`select('id',{count:'exact',head:true})`

but read `data` instead of `count`.

Because `head:true` intentionally returns no row data, `data` was null. Real Deep Source runs were therefore immediately marked `completed` even though queue rows existed and the Research PC could subsequently claim them.

### Repair

`quote-catalog-ai-worker` now reads:

`const {count:queueCount,error:countError}=...`

and only enters the zero-product terminal branch when `queueCount === 0`.

### Regression test map

- Matching Sony × MPB audit: queue count > 0 → run remains queued.
- Matching DJI × MPB audit: queue count > 0 → run remains queued.
- Zero-match filter: queue count = 0 → run completes as no matching products.
- Cancel active audit: run becomes cancelled and active queue rows become skipped.
- Dashboard: active state follows actual queued/claimed/processing rows and never treats a completed run as cancellable.

### Historical reconciliation

Run `5aeb67a1-9f70-4aef-95c1-731e06031fbe` was created during the regression. Its queue row was skipped by targeted cancellation and no product completed, so the run record was reconciled from erroneous `completed` to `cancelled`.


## 7 September 2026 — Dashboard terminal-message transition

### Symptom

A five-product Sony × MPB run completed in Supabase and the Research PC logged completion, while the dashboard button correctly returned to **RUN DEEP SOURCE AUDIT**. However, the message beneath it still said **Deep Source Audit running: 4/5 products processed · 1 processing** until a manual page refresh.

### First failure point

This was not a queue or worker failure. `admin-ai-research.js` correctly detected that no active queue rows remained and reset the controls, but `setDeepSourceAuditControls(null, [])` did not replace the previous running message.

### Repair path

`loadDeepSourceAuditState()` now:

1. remembers the run ID observed as active in the current browser session;
2. reads the latest run and queue state;
3. clears active controls when no queue row is queued, claimed, or processing;
4. if that same observed run is terminal, displays completed / completed-with-errors / cancelled / failed status;
5. does not show historical completion notices after a page refresh.

### Regression check

Run a small Deep Source batch and leave the dashboard open. When the final queue row becomes terminal, the button and message must both transition without a manual refresh.
