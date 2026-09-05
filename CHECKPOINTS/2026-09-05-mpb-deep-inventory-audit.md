# 2026-09-05 — MPB UK Deep Inventory Evidence Audit

## User instruction

MPB should be used as a deeper UK used-market comparison source.

A broad MPB category result is only the starting point. The exact MPB model page may contain multiple live individual units with different cosmetic conditions, prices, charge counts and included accessories.

## Verified live example

Exact MPB DJI Mavic 3 page:

https://www.mpb.com/en-uk/product/dji-mavic-3

At audit time it showed 7 individual live units:

- £1,279 — Excellent — 42 charges — SKU 4144509
- £919 — Excellent — 8 charges — SKU 4080141
- £889 — Excellent — 17 charges — SKU 4096121
- £879 — Excellent — 5 charges — SKU 3962406
- £864 — Excellent — 48 charges — SKU 3799780
- £769 — Excellent — 38 charges — SKU 3965572
- £744 — Excellent — 41 charges — SKU 3953815

The previous catalogue had only two MPB rows for the Standard Package, including a generic category-page observation.

Those rows were replaced with seven exact live MPB inventory observations.

## Database audit

Initial global MPB audit:

- Active catalogue products: 3,825
- MPB evidence rows: 1,743
- Products with MPB evidence: 1,176
- Exact MPB /product/ rows: 759
- MPB category rows: 404
- MPB brand rows: 465
- Products with only generic MPB evidence: 549
- Products with only one exact MPB row: 352
- Products with multiple exact MPB rows: 109

Major affected manufacturers with only-generic MPB evidence include Sony (191), Nikon (114), Panasonic (69), Pentax (50), Olympus/OM SYSTEM (38) and DJI (28).

## Permanent source rule

MPB category, brand and search pages are discovery-only.

Final evidence must come from the exact MPB model page, with separate live units preserved separately when the page exposes them.

Capture:

- SKU where shown;
- price;
- cosmetic condition;
- charges where shown;
- relevant included/package details;
- exact MPB model URL;
- audit timestamp.

## Gemma learning

A structured active learning rule was added to `quote_catalog_ai_learning`:

`mpb_exact_model_deep_inventory_rule`

The local worker was updated to load active human learning rules into the Gemma validation prompt (worker version 1.4.6).

## Important limitation

The historical MPB dataset is not now considered fully audited. The 549 products with only generic MPB evidence require exact-model-page replacement checks, followed by the remaining exact MPB rows being refreshed against current live inventory.

Gemma is not being treated as the authority for this historical audit; the current audit must be evidence-led and exact-page verified.
