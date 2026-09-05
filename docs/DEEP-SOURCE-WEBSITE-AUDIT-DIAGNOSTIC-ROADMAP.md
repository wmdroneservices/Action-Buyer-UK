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
7. Only exact product pages are returned as final evidence candidates.
8. MPB exact product pages are expanded to separate live SKU observations.

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

Current repository version: **1.4.8**

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
