# Checkpoint — 6 September 2026 — Pending evidence routing freeze fix

## Fault
After the compact-routing change, the staff catalogue could freeze with Chrome reporting **This page isn't responding**. The screenshot still showed repeated route-to-alternative panels while the page was locked.

## First failure
The MutationObserver repeatedly scanned pending cards. For cards where the editable controls initially showed NOT CHECKED but the database confirmed a mismatch, `refreshCard()` alternated between:
1. removing the existing route control because the DOM did not currently show mismatch; and
2. asynchronously reading the server state and recreating it because the database did show mismatch.

Each add/remove mutated the DOM, which retriggered the observer, creating a loop.

## Repair
- cache `aiRouteState=required/not-required` on each card after server confirmation;
- guard concurrent server checks with `aiRouteChecking`;
- once the server confirms routing is required, keep the compact control without removing/recreating it on every observer scan;
- retain the existing reassignment RPC and audit path;
- bump the script cache version to `20260906-alternative-route-5`.

## Verification
Current GitHub code contains the server-state cache and in-flight guard; the previous eager add/remove branch is absent; `admin-catalog.html` references the new cache version.
