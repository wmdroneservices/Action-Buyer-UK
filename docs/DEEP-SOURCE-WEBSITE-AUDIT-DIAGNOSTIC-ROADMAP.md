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
