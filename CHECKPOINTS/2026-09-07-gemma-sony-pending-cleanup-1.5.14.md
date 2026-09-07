# 2026-09-07 — Gemma Sony Pending Review cleanup and 1.5.14 package-identity hardening

## Scope

Historical Sony × MPB Pending Review candidates were audited before the next research run.

## Database result

- 32 candidates reviewed.
- 24 accepted and applied to reference-only UK used-market evidence.
- 8 rejected with explicit audit reasons.
- FX2 Body Only corrected to the verified £2,129 observation rather than the mixed £2,129–£2,499 model-page range.
- No accepted evidence was allowed to alter automatic pricing.

## Root cause repaired

deepSourceTargetIdentity() treated the absence of a catalogue package phrase from a generic retailer title/canonical URL as proof of mismatch. This contradicted existing active learning rules and caused false mismatch labels for Body Only and Accessory targets.

## 1.5.14 repair

- generic Accessory taxonomy label is no longer treated as literal package wording;
- explicit package wording remains exact;
- explicit competing suffix remains mismatch;
- generic exact-model pages without package proof are uncertain and preserved for unit-level/manual verification.

## Release contract

- package 1.5.14
- worker 1.5.14-worker
- supervisor 1.5.14-supervisor

## Before next batch

Deploy the three Research PC files, run syntax checks, verify the heartbeat release, then run one Sony × MPB regression and one explicit package-conflict regression before a larger batch.
