# 2026-09-05 — Deep Source / Website Audit Built

## Trigger

The user required a source audit that starts from a landing page but searches deeply through relevant categories and subcategories rather than returning the landing/category listing as evidence.

## Architecture added

### Front-end

AI Research Centre now contains:

- Deep Source / Website Audit
- landing page URL input
- Deep Audit batch size
- RUN DEEP SOURCE AUDIT button

Normal product filters are reused so the audit can be narrowed by manufacturer, model, category and product type.

### Supabase

quote_catalog_ai_research_runs now has:

- deep_source_url
- deep_source_domain

evidence_scope now permits:

- deep_source

New RPC:

ai_research_create_deep_source_run(...)

The existing queue is reused.

### Edge Function

quote-catalog-ai-worker deployed as version 8.

Deep Source requests are routed to ai_research_create_deep_source_run.

### Research PC worker

Repository worker upgraded to 1.4.8.

New path:

getRunResearchConfig
→ deep_source
→ collectDeepSourceEvidence

The worker:

1. starts from the supplied landing page;
2. uses source-specific internal search attempts;
3. breadth-first crawls relevant same-domain category/subcategory links;
4. rejects landing/category/search pages as final evidence;
5. fetches and validates exact product pages only;
6. continues into normal candidate submission/review.

## Explicit source rules

### MPB UK

Exact /en-uk/product/... pages.

MPB exact pages continue through deterministic SKU extraction, so one model page can produce many separate inventory observations.

### DJI

Initial source-specific product/category crawl framework added.

Other sites use the generic framework until their live navigation structure has been inspected and a source-specific rule is justified.

## Critical rule

Landing, category, brand and search pages are DISCOVERY ONLY.

They cannot be accepted as the sole final product price evidence.

## First failure fixed during build

The existing quote_catalog_ai_research_runs evidence-scope check rejected deep_source.

The constraint was updated before the feature was considered usable.

## Smoke test

The Deep Source RPC was tested with a deliberately non-matching manufacturer so it created no queue work, then the test run was cleaned up.

## Deployment state

- GitHub UI: updated
- GitHub Edge Function source: tracked
- Supabase Edge Function: version 8 active
- Supabase schema/RPC: updated
- Repository worker: 1.4.8

## Required next step

The Research PC currently reports 1.4.7 and must be updated to 1.4.8 before running a live Deep Source batch.

Do not run the new mode through the old worker.
