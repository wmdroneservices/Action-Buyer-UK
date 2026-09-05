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
- every live SKU extracted separately using extractMpbUkUnits()

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
6. MPB exact page has multiple SKUs → verify every SKU is preserved.
7. Same price/condition duplicate → preserve SKU source identity.

## Deployment state

GitHub repository contains worker 1.4.8.

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
