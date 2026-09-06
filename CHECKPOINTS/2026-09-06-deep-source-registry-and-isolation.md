# Checkpoint — 6 September 2026 — Deep Source registry dropdown and source-filter isolation

## What changed

The Deep Source / Website Audit landing-page URL dropdown now uses the approved GearCashOut research-source registry as its primary suggestion source.

The UI also retains the existing browser-local history of manually used Deep Source URLs.

## Source of dropdown values

`quote_catalog_ai_sources` rows are used when they are:

- enabled;
- not blocked;
- site_status = live;
- carrying a valid `homepage_url`.

Approved registry URLs are shown first. Local previously used URLs are appended without duplication.

MPB UK is already present in the live registry:

- source_name: MPB UK
- domain: mpb.com
- homepage_url: https://www.mpb.com/en-uk
- enabled: true
- site_status: live

## Investigation: All Sources / Amazon UK Only interaction

The normal source selector does **not** interfere with Deep Source Audit.

Verified current path:

`admin-ai-research.js`
→ `runDeepSourceAudit()`
→ sends `evidence_scope: 'deep_source'` and explicit `deep_source_url`
→ `quote-catalog-ai-worker`
→ detects Deep Source and calls `ai_research_create_deep_source_run(...)`
→ stores Deep Source run configuration
→ Research PC reads `deep_source_url` / `deep_source_domain`
→ `collectDeepSourceEvidence(...)`.

The normal `all` / `amazon_uk` branch is only used when the request is not a Deep Source run.

The previous Amazon scope bug, where `amazon_uk` could be persisted as `all`, was a normal research-run issue and does not apply to the Deep Source execution branch.

## Files changed

- admin-ai-research.html
- admin-ai-research.js
- docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md

## Next test

1. Refresh the desktop AI Research Centre.
2. Open the Deep Source landing-page dropdown.
3. Confirm MPB UK URL appears from the database registry.
4. Select MPB UK and run a small Deep Source batch.
5. Confirm the resulting research run stores `evidence_scope = deep_source` and the MPB URL/domain, regardless of the visible normal source-filter setting.
