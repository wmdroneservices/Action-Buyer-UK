# Checkpoint — 6 September 2026 — Compact pending evidence routing

## Problem
The preserved mismatch-routing workflow was functioning, but a batch containing many wrong-target candidates rendered one collapsed **VALID EVIDENCE — ROUTE TO AN ALTERNATIVE PRODUCT** box for every candidate. This created unnecessary pages of repeated controls.

## First failure identified
The reassignment UI eagerly created the full routing `<details>` panel during the page scan for every pending mismatch. The data was safe, but the presentation was too dense.

## Fix
- mismatch candidates now show one compact **ROUTE TO ALTERNATIVE PRODUCT** button inside their existing pending-evidence card;
- the full searchable catalogue selector is created only when staff presses that button;
- the destination search still covers all active catalogue products;
- `reassign_ai_candidate(...)` and the reassignment audit remain unchanged;
- resolving/removing the mismatch removes the compact routing control.

## Data impact
None. This is a front-end density/lazy-rendering correction. Pending candidates, live evidence, catalogue products and learning records are untouched until a staff member performs the existing reassignment action.

## Live database check before change
At the time of diagnosis:
- 9 pending AI candidates existed;
- all 9 were marked as package or variant mismatches.

## Files changed
- admin-catalog-ai-evidence-reassignment.js
- admin-catalog.html
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md

## Verification
1. Open a catalogue product with a pending mismatch.
2. Confirm only the compact route button appears initially.
3. Press it and confirm the searchable alternative-product selector opens.
4. Select a destination and move the evidence.
5. Confirm the pending candidate reloads under the destination product and the reassignment audit is recorded.
