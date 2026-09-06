# Checkpoint — 6 September 2026 — Alternative-product evidence routing restored

## Trigger

The compact mismatch routing control disappeared from the pending evidence cards even though live candidates still carried persisted `package_match = mismatch` and `variant_match = mismatch`.

The live database check confirmed seven pending candidates in this state, including DJI Mini 3 Pro, Mini 4 Pro and Mavic 3 MPB evidence.

## First failure point

The routing UI was deciding whether to render primarily from transient card DOM state. Pending evidence and catalogue rendering are asynchronous, so the routing layer could scan before the final controls were available and never expose the route control.

## Repair

`admin-catalog-ai-evidence-reassignment.js` now:

1. checks visible review/package/variant controls;
2. independently reads the persisted candidate mismatch state;
3. retries after asynchronous rendering;
4. exposes a compact collapsed **VALID EVIDENCE — ROUTE TO AN ALTERNATIVE PRODUCT** panel whenever the candidate is still pending and the mismatch is persisted;
5. searches all active catalogue products and reassigns the existing candidate through `reassign_ai_candidate(...)`.

The evidence is moved, not duplicated. Its source URL, candidate history and reassignment audit trail are preserved.

## Cache repair

`admin-catalog.html` now uses a new cache version for the reassignment script.

## Supabase learning

Added active learning key:

`evidence_routing|valid_wrong_target_preserve_and_route`

It teaches Gemma that valid evidence with a wrong initial target should be preserved and routed using manufacturer → model → controller → bundle/package → included accessories → variant.

## Documentation updated

- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md

## Verification

Refresh the Automatic Quote Catalogue and open one of the seven pending mismatch candidates. The compact alternative-product routing summary should be visible above **VERIFY EACH FIELD**. Open it, search for the exact catalogue identity and move the candidate. The page should reload with the candidate under the new target while retaining the reassignment audit trail.
