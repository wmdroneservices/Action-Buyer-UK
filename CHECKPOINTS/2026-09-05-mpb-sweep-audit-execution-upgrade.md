# 2026-09-05 — MPB UK Sweep Audit Execution Upgrade

## Trigger

The user asked for the full MPB sweep audit to be completed and correctly applied after double-checking.

## Re-check before execution

- Project memory and the existing MPB checkpoint reviewed.
- Current GitHub worker inspected.
- Current Supabase source registry inspected.
- Current evidence uniqueness constraint encountered during a live correction.
- Live MPB exact product pages checked.

## New first failures found

### 1. MPB was not an active worker source

The database contained historical MPB evidence, but MPB UK was not present in quote_catalog_ai_sources as an active source. Therefore the local worker could not deliberately probe MPB as part of used_uk research.

MPB UK was added as:

- domain: mpb.com
- GB
- used_dealer
- used_uk
- priority 5

### 2. One MPB model URL could only become one candidate

The worker's normal URL-level candidate handling could not represent multiple live units from one MPB exact model page.

Worker version 1.4.7 adds deterministic extractMpbUkUnits(page) handling:

exact MPB page
→ repeated SKU extraction
→ one candidate per SKU.

Gemma is not responsible for deciding the unit count.

### 3. Duplicate genuine MPB units can collide in catalogue evidence

The quote_catalog_retailer_prices uniqueness index rejects two rows with the same:

- catalogue product;
- retailer;
- condition;
- price;
- source URL.

MPB can legitimately have two different SKUs at the same price and condition.

The fix is SKU-level source identity:

canonical exact model URL + #mpb-sku-SKU

Canonical URL is retained in notes.

## Live verified corrections applied

### DJI Air 3 Standard Package (DJI RC-N2)

Generic MPB evidence removed.

Replaced with:

- SKU 4135248
- £584
- Like new
- 5 charges
- RC-N2 Remote Controller
- exact MPB UK model page

### DJI Mini 4 Pro Standard Package

Generic MPB evidence removed.

Replaced with four exact MPB units:

- SKU 3974411 — £639 — Excellent — 10 charges — RC 2
- SKU 4018929 — £639 — Excellent — 0 charges — RC 2
- SKU 4115498 — £504 — Like new — 0 charges — RC-N2
- SKU 4144768 — £444 — Good — 35 charges — RC-N3

## Package mismatch example

DJI Air 3 Fly More Combo on MPB currently showed RC 2 units while the catalogue package is specifically labelled DJI RC-N2.

Those observations were deliberately NOT attached automatically. Exact model alone is insufficient when the catalogue row is package/controller specific.

## Sweep state

Generic-only MPB products reduced:

549 → 547

The historical sweep is NOT complete yet.

The remaining 547 products require exact-page verification or an explicit verified outcome:

1. live exact evidence;
2. exact model page but out of stock;
3. MPB does not stock the exact model;
4. package/controller mismatch.

## Worker deployment state

Repository worker is now 1.4.7.

The Research PC agent previously reported 1.4.5, so the local checkout/version must be brought up to date before using the new deterministic MPB audit path. Do not run the remaining 547 through the old worker and repeat the previous failure mode.


## 6 September 2026 — MPB Deep Source first-run discovery repair

The first live Deep Source test targeted DJI Mavic 3 Enterprise Standard Package using the MPB UK landing page. The 1.4.8 worker correctly claimed and processed the queue item, but returned **No usable web pages were collected for this product**.

This was the first failure: MPB's landing/category/internal search path was not reliably yielding exact links to the raw local crawler, despite the exact MPB UK model page existing.

Repository worker **1.4.9** adds MPB-specific exact-page discovery fallbacks before the generic crawl:

1. deterministic MPB UK product URL derived from the catalogue manufacturer + model identity;
2. external web discovery constrained to `site:mpb.com/en-uk/product`.

Both are still discovery-only. The worker must fetch and validate the exact MPB page before extracting SKU evidence.

The failed run is retained as audit history; it produced no pending candidates and changed no live evidence.


## 6 September 2026 — MPB HTTP 403 collection repair (worker 1.5.0)

The controlled retry on worker 1.4.9 proved that exact MPB discovery was now reaching the correct deterministic product URL, but the first failure remained at **collection**: direct Node HTTP retrieval of the exact MPB page returned HTTP 403.

Worker **1.5.0** keeps the existing direct HTTP collector as the first path. For MPB exact product pages only, an HTTP 403 now falls back to a local Chromium browser session through `playwright-core`, using the installed Chrome/Edge executable. This is deliberately limited to the exact-page validation stage; landing, category and subcategory pages remain discovery-only.

The worker requires `npm install` once after updating to install the new `playwright-core` dependency. If the browser fallback succeeds, normal exact-model validation and MPB SKU/unit extraction continue unchanged. No live evidence is automatically applied.
