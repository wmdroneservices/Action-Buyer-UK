# Checkpoint — 6 September 2026 — Alternative evidence routing startup regression

## Regression
After the MutationObserver freeze fix, the **ROUTE TO ALTERNATIVE PRODUCT** control could disappear completely even though the database still contained genuine pending package/variant mismatches.

## Root cause
This was not the old repeated-panel problem and the freeze repair was not reverted.

The reassignment script can start before `window.actionBuyerAuth.supabase` is ready. In that temporary state `getCandidateRouteState()` returns null. The previous state-cache logic treated that null as a successful negative result and cached `aiRouteState=not-required`. The card then stopped asking the database, so the routing control never appeared.

## Repair
- Supabase/auth unavailable = `unknown`, never `not-required`.
- Failed/empty lookup = `unknown` with bounded retry.
- Only a successful authoritative lookup can cache `required` or `not-required`.
- Existing MutationObserver loop protection is retained.
- Required controls are still not repeatedly removed/recreated.
- Cache version bumped to `20260906-alternative-route-6`.

## Verified current backend state
At inspection time, the live database contained 10 pending, unapplied candidates with package_match=mismatch and variant_match=mismatch. The existing `reassign_ai_candidate` RPC remains present and supports moving pending unapplied evidence to a different catalogue product with reassignment audit history.

## Files
- admin-catalog-ai-evidence-reassignment.js
- admin-catalog.html
- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
