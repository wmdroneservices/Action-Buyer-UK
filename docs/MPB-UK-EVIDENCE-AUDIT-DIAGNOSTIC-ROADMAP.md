# Developer Diagnostic Roadmap — MPB UK Deep Evidence Audit

## Purpose

Map the MPB UK evidence path so future investigation starts with the first real data failure rather than treating category pages as final evidence.

## User action / entry point

1. Staff member opens Catalogue / AI Research.
2. Research run selects catalogue products and an evidence scope.
3. Research PC worker claims queue items.
4. MPB UK is queried as a UK used-market source.
5. Exact MPB model pages are collected.
6. Each live MPB unit becomes separate evidence using its SKU.
7. Staff review or deterministic evidence rules apply the evidence to the catalogue.

## Front-end / research entry points

- admin-ai-research.js
- AI research run RPCs:
  - ai_research_create_run
  - ai_research_create_run_filtered
- Candidate review:
  - record_ai_candidate_manual_review
  - apply_accepted_ai_candidate

## Research worker

- tools/gear-ai-local-agent/agent.mjs
- Supervisor:
  - tools/gear-ai-local-agent/supervisor.mjs
- Current repository worker version after this repair: **1.5.0**

### MPB-specific path

quote_catalog_ai_sources → MPB UK source row

→ discoverFromKnownSources(...)

→ exact /en-uk/product/... page

→ extractMpbUkUnits(page)

→ one candidate per MPB SKU

→ ai_research_submit_candidate(...)

→ quote_catalog_ai_candidates

→ review/application

→ quote_catalog_retailer_prices.

## Supabase data

### Source registry

quote_catalog_ai_sources

MPB UK configuration:

- domain: mpb.com
- country: GB
- source kind: used_dealer
- scope: used_uk
- priority: 5

### Learning

quote_catalog_ai_learning

Key:

mpb_exact_model_deep_inventory_rule

### Catalogue evidence

quote_catalog_retailer_prices

Important uniqueness behaviour:

The evidence table deduplicates by product, retailer, condition, price and source URL.

Therefore two genuine MPB units with the same condition and same price must retain SKU-level source identity. The worker uses:

https://www.mpb.com/en-uk/product/model#mpb-sku-1234567

The canonical MPB model URL remains visible in notes.

## Required evidence fields

For every MPB live unit where available:

- SKU
- selling price
- cosmetic condition
- charges or shutter count
- relevant included/package details
- exact MPB UK model page
- timestamp

## Failure points / checks

### 1. MPB missing from source registry

Symptom: worker never probes MPB.

Check:

quote_catalog_ai_sources.domain = 'mpb.com'

### 2. Category or brand page stored as final evidence

Symptom: generic URL with no exact model-page evidence.

Rule: category/brand/search pages are discovery-only.

### 3. Exact page found but units collapsed

Symptom: one MPB candidate despite multiple live SKUs.

Check:

extractMpbUkUnits(page).

### 4. Same price and condition causes one unit to disappear

Symptom: duplicate-key error in quote_catalog_retailer_prices.

Fix: SKU fragment on source URL.

### 5. Package/controller mismatch

Do not automatically attach evidence to a package-specific catalogue row merely because the base model matches. Check controller and package contents.

### 6. Worker version mismatch

The Research PC can continue running an older local checkout even when GitHub has newer code.

Check quote_catalog_ai_agents.version against the repository version before starting an MPB audit.

## Known fix history

- 5 September 2026: MPB category/brand evidence identified as incomplete.
- DJI Mavic 3 corrected from two observations to seven exact live units.
- Global audit found 549 products with only generic MPB evidence.
- MPB UK was missing from the active AI source registry and was added.
- Worker 1.4.7 added deterministic SKU-level MPB unit extraction.
- Duplicate same-price/same-condition MPB units require SKU-level source identity.
- DJI Air 3 Standard Package and DJI Mini 4 Pro Standard Package were refreshed from exact MPB live inventory during verification.

## Audit rule

Never mark the historical MPB sweep complete until every product with generic-only MPB evidence has one of these outcomes:

1. exact MPB UK live evidence recorded;
2. exact MPB model page verified but currently out of stock;
3. no exact MPB model exists / product not stocked;
4. catalogue package mismatch explicitly recorded.

No generic category/brand page may remain as the sole final MPB price evidence.


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
