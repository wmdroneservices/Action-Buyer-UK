# GearCashOut AI Market Pricing Architecture

## Purpose

Continuously collect UK market-price evidence for the existing quote catalogue without allowing automated research to alter GearCashOut buying prices or quote calculations.

## Product identity

`quote_catalog_product_identifiers` stores exact-product identifiers such as:

- manufacturer part/model number
- MPN
- EAN / GTIN
- UPC
- ASIN
- barcode
- retailer SKU
- other verified identifiers

Each identifier records its source, verification status, verification date and notes. The exact catalogue product remains the foreign-key anchor.

## Research sources

`quote_catalog_ai_sources` stores approved research sources with country, source kind, enabled state and priority. Initial UK sources include manufacturer, retailer, marketplace and used-dealer classes.

## Research runs and queue

`quote_catalog_ai_research_runs` records each research cycle and its counters.

`quote_catalog_ai_queue` holds the products selected for a run. It supports queued/processing/completed/failed/skipped states and retry tracking.

`quote_catalog_ai_candidates` stores discovered market evidence before it is accepted into the existing retailer-price evidence table. This provides a review boundary between AI discovery and trusted pricing evidence.

## Secure orchestration

Supabase Edge Function: `quote-catalog-ai-orchestrator`

Actions currently implemented:

- `create_run` — creates a staff-authorised research run and queues active catalogue products.
- `get_batch` — returns a batch of queued products together with their identifiers so an AI research worker can search exact products.

The function requires a valid authenticated staff user.

## Safety boundary

The AI research layer must not automatically modify:

- `factory_sealed_price`
- `opened_unused_price`
- `excellent_price`
- `good_price`
- `fair_price`
- quote calculation logic

The intended flow is:

`catalogue product -> identifiers -> source search -> candidate evidence -> match/confidence checks -> accepted market evidence -> quote system reads existing controlled buying prices`

## Future worker

The next layer can add source-specific web/API adapters and an AI matching/extraction worker. The worker should prefer exact identifiers, then manufacturer model/part numbers, then exact package names, and should reject ambiguous matches rather than guessing.
