# GearCashOut Checkpoint — AI Review Queue and Catalogue Comparison

Date: 5 September 2026

## Change implemented

The AI Research Centre evidence review queue was reorganised to avoid a very long permanently expanded pending list.

Pending findings are now separated into:

- **Amazon findings — review, edit and decide**
- **Review, edit and decide** for all other pending findings

Both are collapsible and closed by default.

Each finding linked to a catalogue product now includes:

**COMPARE WITH CATALOGUE PRODUCT**

The CTA opens:

`admin-catalog.html?product=<catalog_product_id>`

The existing catalogue page reads this product parameter and opens the exact catalogue editor with its current comparison evidence.

## Files changed

- `admin-ai-research.js`
- `admin-ai-research.html`
- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`

## Supabase objects involved

- `quote_catalog_ai_candidates.catalog_product_id`
- `quote_catalog_products.id`
- `quote_catalog_retailer_prices.catalog_product_id`

No schema change was required.

## Safeguards preserved

- Findings remain proposed evidence.
- Compare does not automatically apply evidence.
- Research does not alter buying prices automatically.
- Existing edit, accept, deny and apply actions remain unchanged.
- Rejected and applied findings remain auditable.

## Verification completed

- Current GitHub code inspected before change.
- Current Supabase schema and project memory inspected before change.
- Existing catalogue product URL behaviour verified in `admin-catalog.js`.
- Updated `admin-ai-research.js` syntax checked successfully.

## Live verification required

1. Refresh the AI Research Centre in the browser.
2. Confirm both pending sections are collapsed.
3. Confirm Amazon findings are separated correctly.
4. Open a finding and click **COMPARE WITH CATALOGUE PRODUCT**.
5. Confirm the exact catalogue product editor opens.
6. Confirm existing comparison evidence is visible.
7. Confirm Edit, Accept, Deny and Apply still work.
