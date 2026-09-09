# Customer valuation semantic duplicate repair — 9 September 2026

## Trigger

The customer valuation product-type dropdown still showed semantic duplicates after the earlier taxonomy normalisation, including:

- `Drone` and `Camera Drones`;
- `Drone Controllers` and `Drone Remote Controllers`;
- overlapping broad lighting labels.

## Investigation order

1. Checked structured project memory checkpoint `2026-09-09 Customer valuation taxonomy normalisation`.
2. Checked the Start Your Valuation diagnostic roadmap in the System Handbook.
3. Inspected current GitHub wizard code.
4. Audited live Supabase `quote_catalog_products` taxonomy.
5. Confirmed the first remaining failure was semantic product-type presentation, not duplicate product rows.

## Minimal repair

Updated `quote-reverse-basket-v5.js` with context-aware customer product-type aliases and used the same canonical identity in:

- product-type dropdown generation;
- `scopedProducts()`;
- `findProduct()`.

Updated `valuation.html` to cache-bust the repaired wizard.

No catalogue rows or taxonomy values were rewritten in Supabase.

## Live taxonomy verification

Expected Drones product types after aliasing:

- Camera Drones
- Drone Accessories
- Drone Controllers
- Drone Filters
- Drone Goggles
- Drone Payloads
- FPV Equipment
- Underwater Drones
- Water Drones

## GitHub commits

- `51b439c348b718891266ae1bf32644f41762a20f` — semantic duplicate product-type repair
- `c1e8e49c8c51c31edf8066b25e0fecfb52e63f60` — valuation wizard cache key
- `0f826a36f86b1428868e2684cb4bd3b80bf21177` — handbook/roadmap update
- `fa38fdb83e81ef040d8018ab0807c3ead4eab04a` — AI operating manual update

## Verification still required

Open the live valuation page after deployment and confirm the repaired dropdown labels are loaded from the new cache key.
