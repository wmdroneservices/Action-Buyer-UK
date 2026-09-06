# Checkpoint — 6 September 2026 — Alternative product search appeared inactive

## Symptom
The alternative-product routing panel opened correctly, but entering a term such as Mavic 3 appeared not to activate the search.

## Root cause
The routing code was loading the entire active catalogue into the native select before any search term was entered. The live catalogue has 3,839 active products. Creating thousands of option elements caused UI lag and made the search appear inactive.

This is separate from:
- the earlier MutationObserver add/remove freeze;
- the Supabase/auth startup race that hid the routing control.

## Repair
- Empty search no longer renders all products.
- At least 2 characters are required before results render.
- Results are capped at 100.
- The UI reports result counts and asks the user to refine broad searches.
- The select remains disabled until a meaningful search exists.
- The existing reassignment RPC and audit workflow are unchanged.

## Live catalogue verification
The database contained 202 relevant active records for a Mavic 3-style query at inspection time, confirming that the catalogue data exists and the issue was client-side rendering/performance.

## Files
- admin-catalog-ai-evidence-reassignment.js
- admin-catalog.html
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md

Cache version: 20260906-alternative-route-7.
