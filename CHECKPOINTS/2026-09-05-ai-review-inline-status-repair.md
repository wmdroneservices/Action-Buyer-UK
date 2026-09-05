# 2026-09-05 — AI Evidence Review Inline Processing Status Repair

## Trigger

The user reported that **SUBMIT TO CATALOGUE EVIDENCE** and **DENY WITH REASON** appeared to do nothing, making it unclear whether processing had started or whether the backend decision succeeded.

## Investigation

Current GitHub and Supabase were inspected before changing the workflow.

- Front-end authority: `admin-ai-research.js`
- Manual decision RPC: `record_ai_candidate_manual_review(uuid,text,text,jsonb)`
- Live evidence application: `apply_accepted_ai_candidate(uuid)`
- Existing catalogue evidence table: `quote_catalog_retailer_prices`
- Current database confirmed both manual-review and apply functions exist.
- Current retailer evidence table has authenticated staff UPDATE policy.
- Existing checkpoint already documented queue reload and inline evidence editing.

## First failure found

`manualReviewAction(...)` attempted to locate and update:

`.ai-manual-review-status`

However, `manualReviewMarkup(...)` did not render that element.

This meant the action had a backend path and changed the clicked button label, but its intended dedicated inline processing/status surface did not exist.

## Minimal repair

Added:

```html
<div class="ai-manual-review-status" role="status" aria-live="polite"></div>
```

inside each manual review panel, immediately before the decision buttons.

No Supabase schema, RPC, RLS or evidence-application logic was changed.

## Expected flow

1. Click Submit or Deny.
2. Button disables and changes to a processing label.
3. Inline status reports the actual processing stage.
4. `record_ai_candidate_manual_review(...)` saves the decision.
5. The queue reloads and the item leaves Requires Attention.
6. For direct submit, `apply_accepted_ai_candidate(uuid)` runs separately.
7. Any apply failure is reported without pretending the review decision failed.

## Verification state

- Current GitHub inspected.
- Current Supabase functions and RLS presence inspected.
- JavaScript markup/handler mismatch identified.
- Minimal front-end repair committed.
- Live authenticated browser decision test remains required to verify the complete end-to-end transition with a real staff session.
