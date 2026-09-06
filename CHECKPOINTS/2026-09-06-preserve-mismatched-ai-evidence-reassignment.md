# Checkpoint — 6 September 2026 — Preserve mismatched AI evidence and reassign

## Problem
Valid MPB/retailer evidence could be lost when package or variant matching identified a mismatch against the catalogue product originally being researched.

The live ai_research_submit_candidate(...) function explicitly rejected mismatch findings before human review.

## Change
- mismatch findings are now allowed into the pending review queue;
- candidate records preserve their original target through original_catalog_product_id;
- reassign_ai_candidate(...) moves a pending, unapplied candidate to the correct catalogue product;
- quote_catalog_ai_candidate_reassignments records every routing change;
- the catalogue loads admin-catalog-ai-evidence-reassignment.js, which exposes a MOVE TO CORRECT PRODUCT workflow for visible package/variant mismatches.

## Data preservation rule
The same candidate record retains the source URL, title, price/range, condition, availability and notes. Reassignment changes the catalogue relationship; it does not recreate the research.

## Backend verification
Supabase migration applied successfully.
The old mismatch rejection text is absent from the live ai_research_submit_candidate(...) definition.
The reassignment RPC and audit table were created.

## Files
- supabase/migrations/20260906160000_preserve_mismatched_ai_evidence_and_reassignment.sql
- admin-catalog-ai-evidence-reassignment.js
- admin-catalog.html
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
- docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md

## Live verification still required
1. Run or retain a candidate with package/variant mismatch.
2. Confirm the routing panel appears.
3. Move it to the correct catalogue product.
4. Confirm it disappears from the old product and appears under the destination.
5. Verify reassignment audit row.
6. Accept and apply only after normal field review.
