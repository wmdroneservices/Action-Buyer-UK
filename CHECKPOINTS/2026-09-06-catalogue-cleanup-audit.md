# Checkpoint — 6 September 2026 — catalogue cleanup audit

## Purpose

Post-repair cleanup after the pending-evidence routing and page-stability fixes.

## Verified before cleanup

- The catalogue page directly loaded market-structure and evidence-tools scripts.
- A legacy bootstrap file also dynamically injected those same scripts with delayed retries.
- Several legacy admin-catalog scripts were no longer referenced anywhere in the repository.
- The reassignment layer still contained unreachable retry/refresh code left from the earlier discovery-based routing approach.

## Changes

### Removed duplicate bootstrap path

Removed `admin-catalog-boot-fix.js` and its page reference. The live page now has one direct script-loading path for market structure and evidence tools.

### Removed retired catalogue scripts

Deleted unreferenced files:

- admin-catalog-accordion-fix.js
- admin-catalog-accordion.js
- admin-catalog-discontinued-label.js
- admin-catalog-list-active.js
- admin-catalog-online-comparison-guard.js
- admin-catalog-online-comparison-history.js
- admin-catalog-online-comparison.js

### Simplified reassignment code

Removed the retired retryRouteState/refreshCard path and a duplicate direct route-button listener. The current ownership remains:

- pending renderer: authoritative route-button rendering;
- reassignment script: delegated interaction and direct field-change handling;
- database RPC: authoritative reassignment and audit.

## Verification

- Both active pending-review JavaScript files pass syntax parsing.
- The reassignment script contains no MutationObserver and no retired retry/refresh functions.
- No deleted legacy filename remains referenced by repository code.
- Live data audit found:
  - 12 pending unapplied candidates;
  - 12 pending mismatch candidates;
  - 0 orphan AI candidates;
  - 0 orphan retailer-price records;
  - 0 orphan reassignment records;
  - 0 duplicate active learning keys.

## Historical note

Two historical reassignment audit rows have identical from/to product IDs. The current `reassign_ai_candidate` RPC explicitly rejects same-target reassignment, so these rows cannot be reproduced through the current workflow. They were retained as historical audit data rather than silently deleting history.

## Guard

Do not restore dynamic duplicate script injection, obsolete bootstrap retries, or the retired route-state rescan path without first tracing current ownership and testing against the stable pending-routing baseline.
