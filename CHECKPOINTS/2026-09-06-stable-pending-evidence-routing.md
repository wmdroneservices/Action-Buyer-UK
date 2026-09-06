# Checkpoint — 6 September 2026 — stable pending evidence routing

## Trigger

The catalogue page still visibly shuddered during startup and the page position could jump while the ROUTE TO ALTERNATIVE PRODUCT control sometimes disappeared. A previous observer-based repair had restored the control but later contributed to page instability.

## Verified live state before repair

- 12 pending, unapplied candidates were present in quote_catalog_ai_candidates.
- All inspected pending candidates had persisted package_match = mismatch and variant_match = mismatch.
- reassign_ai_candidate(uuid, uuid, text) remained the authoritative reassignment workflow.
- The compact route UI must preserve valid evidence and its reassignment audit trail.

## Root causes

Two independent client-side render patterns were competing:

1. admin-catalog-pending-ai-review.js repeatedly replaced the entire pending section in an eight-pass startup retry loop.
2. admin-catalog-ai-evidence-reassignment.js had been using delayed/global discovery logic to rediscover cards.

The repeated replacement could cause layout movement and destroy dynamically inserted controls. The observer/scanning approach had previously created a heavier feedback problem.

## Repair

### Pending renderer

The pending-card renderer now calculates route eligibility directly from persisted candidate mismatch fields and renders one compact ROUTE TO ALTERNATIVE PRODUCT button with the card.

The repeated eight-pass startup render loop was removed.

### Reassignment layer

The reassignment script is now event-driven:

- delegated click handling opens the lazy route panel;
- direct field changes can add/remove the compact control;
- no MutationObserver is used;
- no delayed full-document scan is used.

The destination catalogue search remains bounded and lazy-loaded.

## Files changed

- admin-catalog-pending-ai-review.js
- admin-catalog-ai-evidence-reassignment.js
- admin-catalog.html
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md

## Regression guard

Never reintroduce:

- the eight-pass startup loop that repeatedly rewrites the pending evidence section;
- a document-wide MutationObserver for alternative-product routing;
- delayed full-page routing scans.

If routing state is already present in the authoritative pending candidate data, render the compact control directly with that card and keep interaction handling event-driven.
