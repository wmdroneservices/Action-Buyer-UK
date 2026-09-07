# GearCashOut Developer Diagnostic Roadmap — AI Research / Deep Source

## Purpose

Investigation map for the catalogue AI Research Centre, Research PC worker, Deep Source website audits and MPB exact-product collection. This is a diagnostic map, not a copy of implementation code.

## User action → front-end entry point

### Start research

- User opens the AI Research Centre.
- Front end: `admin-ai-research.html`
- Behaviour: `admin-ai-research.js`
- Research modes include normal market scopes and `deep_source`.

### Deep Source / Website Audit

- User selects or enters a landing website URL.
- The orchestrator creates a research run with:
  - `evidence_scope = 'deep_source'`
  - `deep_source_url`
  - `deep_source_domain`
- Queue rows are created for selected catalogue products.

## Front end / backend boundary

### Supabase Edge Function

- `quote-catalog-ai-orchestrator`
- Relevant actions include source registry, research-run creation and worker control status/commands.

### Supabase state

Primary operational tables/RPCs:

- `quote_catalog_ai_research_runs`
- `quote_catalog_ai_queue`
- `quote_catalog_ai_candidates`
- `quote_catalog_ai_sources`
- `quote_catalog_ai_agents`
- `quote_catalog_ai_agent_commands`
- `quote_catalog_products`
- `quote_catalog_ai_learning`

Important worker RPCs/functions include:

- `ai_research_claim_next_queue_item`
- `ai_research_complete_queue_item`
- `ai_research_recover_interrupted_queue_items`
- `ai_research_submit_candidate`
- `gearcashout_shared_research_sources`

## Research PC process chain

`Start-GearCashOut-AI.ps1`
→ `npm start`
→ `tools/gear-ai-local-agent/supervisor.mjs`
→ `tools/gear-ai-local-agent/agent.mjs`

The supervisor remains available for lifecycle control while the worker is stopped.

Release identifiers must agree across:

- `package.json`
- worker heartbeat in `agent.mjs`
- supervisor metadata in `supervisor.mjs`

## Deep Source data flow

`admin-ai-research.js`
→ research run in Supabase
→ queue item
→ Research PC `processOne()`
→ `collectDeepSourceEvidence()`
→ source-specific discovery
→ exact-page validation
→ raw discovery record
→ Ollama validation
→ pending evidence candidate
→ staff review.

## MPB-specific path

Relevant file/functions:

- `tools/gear-ai-local-agent/agent.mjs`
- `deepSourceRules['mpb.com']`
- `mpbExactProductUrls()`
- `mpbLinkHasTargetModelIdentity()`
- `deepLinkScore()`
- `collectDeepSourceEvidence()`
- `fetchMpbPage()`
- `fetchMpbExactPage()`
- `extractMpbUkUnits()`
- `deepSourceTargetIdentity()`

Expected MPB flow:

`Deep Source MPB landing`
→ deterministic exact slug and/or site-constrained search/internal search
→ target model identity gate
→ exact `/en-uk/product/...` page
→ HTTP fetch
→ HTTP 403 only: Playwright fallback
→ title/canonical URL validation
→ live MPB unit extraction
→ one reference-only From→To pending finding.

## Failure points

### 1. Front-end startup frozen

Symptoms:

- controls remain Checking;
- source selector remains Loading.

Inspect:

1. `admin-ai-research.js` startup/session path;
2. `quote_catalog_ai_agents.last_heartbeat_at`;
3. `quote_catalog_ai_agent_commands`.

### 2. Worker offline / wrong deployment

Inspect:

1. `quote_catalog_ai_agents` version/heartbeat;
2. Research PC terminal process;
3. package/worker/supervisor version alignment.

### 3. Queue stuck or duplicate processing

Inspect:

1. exact run ID;
2. queue rows and claim timestamps;
3. supervisor single-instance state;
4. stale-item recovery threshold.

Do not assume repeated terminal output means active research; source-monitor output can continue independently.

### 4. MPB HTTP 403

Expected first collection path:

`fetchText()`

Fallback only after MPB HTTP 403:

`fetchMpbPage()`
→ Playwright/Chrome or Edge.

Inspect launch/context/page stage logs before changing discovery logic.

### 5. Unrelated URLs or watchdog timeout

Inspect the first repeated URL pattern.

- unrelated exact models → candidate admission failure;
- generic MPB category/content/editorial pages → discovery breadth failure;
- repeated target exact page → collection/browser latency.

Current 1.5.11 rule: MPB generic non-exact pages are not expanded in the breadth-first crawl. Ordinary exact MPB links must visibly contain the requested model.

### 6. Queue terminal but local browser still active

Inspect:

1. abort signal propagation;
2. Playwright page/context/browser closure;
3. cooperative abort checks;
4. `ensureRunActive()` before persistence.

Do not weaken the 1.5.10 lifecycle protections when repairing discovery.

## Known fix history

### 1.5.10

Fixed orphan crawl containment:

- abort propagated into MPB Playwright fallback;
- browser resources closed on watchdog abort;
- late discovery persistence blocked for terminal runs.

### 1.5.11

Fixed remaining generic MPB crawl admission:

- no MPB non-exact breadth expansion;
- exact ordinary links require requested model identity;
- final candidates retain deterministic slug exception only.

## Test sequence after a Deep Source repair

1. Check current GitHub code and relevant project memory.
2. Check live Supabase queue/run state.
3. Confirm no duplicate worker.
4. Deploy complete control set if process architecture changed.
5. Run syntax checks.
6. Verify heartbeat versions.
7. Run one controlled product.
8. Inspect first discovery/browser URLs.
9. Confirm queue/run/database state.
10. Start a larger batch only after the one-product result is clean.
11. Update both manuals and Supabase project memory/checkpoint.


## 7 September 2026 — Regression invariant: manufacturer × source isolation

### Repair

Worker 1.5.12 separates `evidence_scope='deep_source'` from evidence categories. `deep_source` is only the selected-source collection route.

### Required invariant

For every Deep Source run, the pair **current manufacturer/model × selected source domain** is evaluated independently:

- manufacturer-specific learning applies only to that manufacturer;
- source/domain rules may be reused only when explicitly generic;
- retailer URL suffixes are not inferred from another manufacturer's successful URL;
- final-page acceptance is based on current target identity, not slug resemblance;
- exact evidence is classified into its actual market category;
- URLs are deduplicated only after successful candidate persistence.

### Regression tests

1. DJI × MPB must continue to create its valid MPB reference findings.
2. Sony × MPB must create findings from valid exact Sony pages without requiring DJI URL shapes.
3. A future manufacturer × MPB must use the same generic contract without a manufacturer-specific code branch.
