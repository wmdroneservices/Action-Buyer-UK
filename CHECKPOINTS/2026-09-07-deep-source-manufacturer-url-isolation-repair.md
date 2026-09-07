# 2026-09-07 Deep Source manufacturer and URL isolation repair

## Problem

Sony Alpha 1 II exact MPB pages were successfully discovered and persisted as raw discoveries, but the run completed with zero Pending Review candidates.

## First failure

The manual-review fallback treated `deep_source` as if it were an evidence category and rejected MPB's actual `used_uk` classification.

A second guard also marked MPB/fallback URLs as handled before successful candidate persistence.

## Repair

Worker 1.5.12:

- separates research mode from evidence category;
- treats `deep_source` as a collection route only;
- preserves the current manufacturer + model as an isolated target identity;
- prevents DJI-specific URL/extraction patterns leaking into Sony;
- prevents Sony-specific suffixes leaking into DJI;
- validates retailer-specific URL shapes against the current target page rather than one manufacturer's slug;
- marks MPB/fallback URLs deduplicated only after successful persistence.

## Gemma learning

A global active rule was added to `quote_catalog_ai_learning`:

`deep_source|manufacturer_url_rules_are_target_isolated`

It applies to future manufacturers without hard-coded manufacturer branches.

## Files changed

- tools/gear-ai-local-agent/agent.mjs
- tools/gear-ai-local-agent/supervisor.mjs
- tools/gear-ai-local-agent/package.json
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
- docs/MPB-UK-EVIDENCE-AUDIT-DIAGNOSTIC-ROADMAP.md
- docs/DIAGNOSTIC-ROADMAPS/AI-RESEARCH-DEEP-SOURCE.md
- this checkpoint

## Required verification

1. Deploy 1.5.12 to the Research PC.
2. Run syntax checks and `npm install`.
3. Start the supervisor.
4. Run one Sony × MPB Deep Source regression.
5. Run one DJI × MPB regression.
6. Confirm candidates appear in Pending Review.
7. Confirm neither manufacturer's rule changes the other's URL or package handling.
