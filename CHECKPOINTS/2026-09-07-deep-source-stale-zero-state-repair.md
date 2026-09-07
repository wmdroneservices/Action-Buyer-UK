# Checkpoint — Deep Source stale 0/0 dashboard repair

Date: 7 September 2026

## Incident

The AI Research Centre showed DEEP AUDIT RUNNING · 0/0 even though the Research PC was idle and Supabase had no active Deep Source queue work. Cancellation could then report that there was no active audit.

## Trace

Live Supabase inspection showed recent Sony Deep Source runs with zero targeted products and zero queue rows.

The first durable fault was the zero-product run lifecycle:

1. ai_research_create_deep_source_run(...) inserted the run as queued.
2. Filters could select zero active catalogue products.
3. The queue remained empty.
4. quote-catalog-ai-worker unconditionally wrote the run status back to queued.
5. admin-ai-research.js treated queued/running status alone as active.

This allowed a zero-work run to render as a live audit with 0/0.

## Repair

### Front end

admin-ai-research.js

- Deep Source activity now requires an actual queue row in queued, claimed or processing.
- Cancellation always reloads authoritative database state before choosing a run ID.

### Database

Applied live migration: fix_zero_product_deep_source_run_state

- zero-product Deep Source runs now complete immediately;
- legacy zero-product queued/running Deep Source runs are reconciled to completed.

### Edge Function

quote-catalog-ai-worker deployed as Supabase version 11.

- zero queued products returns status no_matching_products;
- the function no longer forces a zero-row run back to queued.

## Verification state

At repair time, Supabase showed no active Deep Source queue rows.

The latest three zero-product Sony runs were already cancelled and are no longer treated as active by the repaired dashboard logic.

## Regression checks

1. Matching Deep Source filters must show normal queue-backed progress.
2. Zero-match filters must return no_matching_products and leave the controls ready.
3. Cancellation must work only against an authoritative active queue-backed run.
4. Refresh after completion/cancellation must remain idle.

## Documentation updated

- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
- docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md


## Controlled database regression passed

A controlled Deep Source request using manufacturer __GEARCASHOUT_ZERO_MATCH_REGRESSION__ returned run 0dd6dd42-9a7e-40a8-90e6-a91d9e68c958.

Verified result:

- status: completed
- products_targeted: 0
- queue rows: 0
- finished_at populated
- notes include no matching active catalogue products

This confirms the database side of the stale 0/0 lifecycle is fixed. The remaining operator check is a hard refresh of the browser dashboard followed by one normal matching Deep Source run.
