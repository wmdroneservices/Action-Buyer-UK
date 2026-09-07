# 7 September 2026 — Deep Source Edge queue-count regression repair

## Trigger

A matching Sony × MPB Deep Source run was created with one queue item, but the run record was immediately marked `completed`. This made lifecycle state inconsistent: the Research PC could still claim the queue row while the run was already terminal.

## First failure traced

The deployed `quote-catalog-ai-worker` Edge Function checked the queue size with:

```ts
const {data:count,error:countError}=await admin
  .from('quote_catalog_ai_queue')
  .select('id',{count:'exact',head:true})
  .eq('run_id',runId);
const productsQueued=count??0;
```

With Supabase `head:true`, `data` is null. The exact row total is returned in the separate `count` field.

Therefore every run was interpreted as zero queued products and the zero-product branch marked it completed.

## Minimal repair

Changed only the response destructuring:

```ts
const {count:queueCount,error:countError}=await admin
  .from('quote_catalog_ai_queue')
  .select('id',{count:'exact',head:true})
  .eq('run_id',runId);
const productsQueued=queueCount??0;
```

No MPB, DJI, Sony, Gemma, worker crawling or manufacturer-specific rules were changed.

## Deployment

- GitHub commit: `09087d4e082eea482d10aa12bb06a8db7f5fec9d`
- Supabase function: `quote-catalog-ai-worker`
- Deployed version: **12**
- Existing custom authentication retained.

## Historical data reconciliation

Run `5aeb67a1-9f70-4aef-95c1-731e06031fbe` was created during the regression.

Verified state:

- 1 product targeted;
- queue item was claimed once;
- queue item ended as `skipped`;
- no queue item completed or failed;
- no candidates were created.

The run record was therefore safely reconciled from erroneous `completed` to `cancelled`, with an explanatory audit note.

## Current state

The immediate lifecycle inconsistency is repaired.

The next live verification should deliberately test:

1. Sony × MPB, one matching product — run remains queued/running until terminal work completes.
2. DJI × MPB, one matching product — same lifecycle behaviour without changing Sony rules.
3. A zero-match filter — `no_matching_products`, completed run and no queue rows.
4. Targeted cancellation of a genuinely active queue-backed audit — run becomes cancelled, queue rows skipped, Research PC remains online.

## Documentation updated

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md`
