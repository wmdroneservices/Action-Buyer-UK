# 6 September 2026 — AI Research shared product filters and separate batch controls

## Reason for change

The AI Research Centre displayed two batch-size controls in one visual flow:

- Deep Source audit batch size; and
- the normal AI research batch size.

Although the code already used separate IDs and separate request paths, the layout made it unclear whether one batch control could override the other.

The manufacturer, model, category and product-type controls also appeared after the Deep Source section without an explicit explanation that they are shared product selectors.

## First inspection

Current GitHub and Supabase state was checked before changing the UI.

Confirmed current request paths:

### Regular AI Research

`runResearch()`

→ `research-limit`

→ manufacturer/model/category/product_type

→ normal market/source scope

→ `quote-catalog-ai-worker`

### Deep Source Website Audit

`runDeepSourceAudit()`

→ `deep-source-limit`

→ same manufacturer/model/category/product_type selectors

→ `evidence_scope: 'deep_source'`

→ explicit `deep_source_url`

→ `quote-catalog-ai-worker`

→ `ai_research_create_deep_source_run(...)`

The normal All Sources / Amazon UK Only controls are not sent as the Deep Source scope.

## Change implemented

The dashboard is now arranged as:

1. **Products to research** — shared:
   - Manufacturer
   - Model / search term
   - Category
   - Product type

2. **Regular AI Research**:
   - Market / condition
   - Source filter
   - Regular research batch size
   - Continuous mode
   - RUN SELECTED AI RESEARCH

3. **Deep Source / Website Audit**:
   - Landing page URL
   - Deep Source audit batch size
   - RUN DEEP SOURCE AUDIT

## Control ownership

- `research-limit` controls Regular AI Research only.
- `deep-source-limit` controls Deep Source Website Audit only.
- Shared product filters are deliberately used by both workflows.
- Regular market/source controls remain isolated from Deep Source.
- Deep Source source scope remains the explicit selected landing-page domain.

## Files changed

- `admin-ai-research.html`
- `admin-ai-research.js`
- `docs/DEEP-SOURCE-WEBSITE-AUDIT-DIAGNOSTIC-ROADMAP.md`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- this checkpoint

## Supabase impact

No schema, RLS, RPC or worker contract change was required.

The existing Deep Source contract remains:

`evidence_scope=deep_source + deep_source_url`

## Verification required

1. Refresh the desktop AI Research Centre.
2. Confirm the shared product filters appear once under **Products to research**.
3. Change the Regular research batch size and confirm the Deep Source audit batch remains unchanged.
4. Change the Deep Source audit batch size and confirm the Regular research batch remains unchanged.
5. Run or inspect a small normal research request and confirm it uses `research-limit`.
6. Run a small Deep Source request and confirm it uses `deep-source-limit`, the selected URL and `evidence_scope=deep_source`.
7. Confirm All Sources / Amazon UK Only still has no effect on Deep Source.
