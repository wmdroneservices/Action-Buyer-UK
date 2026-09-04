# GearCashOut Checkpoint — AI Evidence Manual-Review Preservation

Date: 4 September 2026

## Change implemented

The local research worker no longer treats Ollama as the sole gatekeeper for collected evidence.

When a search or approved-source fallback collects a live page with exact or strong product identity, but the automated validation layer does not return that page as a candidate, the worker now preserves it as a lower-confidence **Pending Review** finding.

This addresses the observed situation where PowerShell reported results such as:

- approved-source fallback returned results;
- direct source probes returned results;

but the dashboard received no corresponding finding.

## Safeguards retained

The fallback does **not** accept everything blindly.

It still rejects:

- search-result URLs;
- generic pages;
- suspicious non-product URLs;
- error/404/captcha pages;
- weak product matches;
- proven variant mismatches.

Package wording remains non-disqualifying unless a materially different package is positively proven.

A fallback finding can remain reviewable even when automatic price extraction failed, provided the live page has exact or strong product identity. The live URL and an explicit manual-review note are retained.

## Implementation

- File: `tools/gear-ai-local-agent/agent.mjs`
- Worker version: `1.4.1`
- GitHub commit: `87cc76102cdca8f075901b3368b95fb7cf111de0`

## Project memory

The connected Supabase project-memory database was updated with:

- an active decision covering preservation of omitted collected evidence;
- an implementation entry;
- the exact-product validation task moved to monitoring;
- a new current checkpoint.

## Verification still required

The Windows Research PC runs a local working copy, so the local file must be updated/restarted before this change can be considered verified live.

Expected live behaviour:

`Collected result → normal validation candidate if strong → otherwise exact/strong fallback → Pending Review`

No evidence is automatically applied to the live catalogue.
