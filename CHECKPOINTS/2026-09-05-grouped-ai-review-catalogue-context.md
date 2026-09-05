# Checkpoint — Grouped AI Review Catalogue Context

**Date:** 5 September 2026

## Reason

Live review feedback showed that the grouped product review was working structurally, but the matched catalogue-product information was too limited for fast decision making.

The reviewer wanted the grouped review to show the useful information already available in the Quote Catalogue without repeatedly opening another page.

## Current implementation inspected

- `admin-ai-research.js`
- `admin-ai-research.html`
- `admin-catalog.js`
- `quote_catalog_products`
- `quote_catalog_retailer_prices`
- current Supabase project-memory checkpoint
- current grouped-review close-state implementation

## Changes made

### 1. Catalogue product fields loaded into AI review

The grouped review now loads the automatic buying-price ladder from `quote_catalog_products`:

- Factory Sealed
- Opened / Unused
- Excellent
- Good
- Fair

### 2. Quote Catalogue online-comparison summary mirrored

The grouped review now calculates and displays:

- UK New evidence record count;
- lowest UK New selling price;
- highest UK New selling price;
- UK used / other evidence count;
- total current evidence count.

The calculation follows the current Quote Catalogue rule:

- GBP;
- UK evidence region;
- `new` and `new_sale` are the UK New comparison records;
- other UK evidence remains reference context.

### 3. Full current evidence context expanded

The current catalogue evidence table now includes:

- retailer;
- evidence type;
- condition;
- sell price;
- buy price;
- availability;
- buy method;
- region;
- exact source URL;
- notes;
- checked timestamp.

### 4. Product review summary expanded

The matched catalogue-product review header now includes the automatic buying-price ladder and online-comparison summary, so the reviewer can understand the current catalogue position before opening or while reviewing the evidence.

### 5. Cache version updated

`admin-ai-research.html` now references a new versioned AI Research JavaScript asset.

## Preserved behaviour

No Supabase schema changes were made.

The following workflows remain unchanged:

- grouped pending findings by `catalog_product_id`;
- individual finding editing;
- manual review feedback for Gemma;
- deny with reason;
- submit to catalogue evidence;
- `record_ai_candidate_manual_review(...)`;
- `apply_accepted_ai_candidate(...)`;
- accepted/rejected/applied audit sections.

## Verification

- Current GitHub implementation inspected before change.
- Current Supabase table structure inspected before change.
- Current Quote Catalogue summary logic inspected in `admin-catalog.js`.
- Current DJI Mini 3 evidence rows inspected.
- JavaScript syntax check passed after the change.

## Live browser verification still required

1. Open a grouped review with multiple findings.
2. Confirm the header shows the automatic buying prices and comparison summary.
3. Confirm CURRENT CATALOGUE EVIDENCE shows the same context plus the full evidence list.
4. Confirm exact source links open correctly.
5. Confirm the review can still close and another grouped review can be opened.
6. Confirm save, deny and submit workflows remain unchanged.

## GitHub commits

- `5143f95cc6675af6f44309a50f4c1cc1b1ed9e70` — AI review catalogue context
- `4f6a55c87101c351e182ad0b75156634b1180215` — review CSS and cache version
- `42db22404ac25e54d823b307ebe45d48c666a7e8` — System Handbook
- `f65929be87e6cad01cb6cec60d8373656dcfa974` — AI Operating Manual
