# Live Website Status and Workflow Strip Repair — 8 September 2026

## Restore protection

The restore branch restore/sales-flow-checkpoint-2026-09-08-1931 and base commit 9e1520baa0df3c9245e1b19c3b635e0eab950455 remain untouched.

## First verified facts

TEST-ASSET-003 has an authoritative resale_listings row for WEBSITE with status Published.

The live public RPC public_storefront_stock('retail', ...) returns that exact listing, including:

- DJI Mini 5 Pro;
- Fly More Combo + RC 2;
- £749.99;
- staff condition fair.

Therefore the publishing/database path was already working. Do not repair this incident by changing listing state.

## Repairs

1. Product Workbench sales handoff now removes the obsolete inspection workflow strip from the base header. Sales handoff owns the final page, preventing two competing workflow guides.
2. Sales Channels now displays a prominent WEBSITE STATUS: LIVE ON GEARCASHOUT confirmation whenever the authoritative WEBSITE listing is Published.
3. valuation.html progress styling no longer forces a desktop horizontal scrollbar under the step pills. The progress indicator wraps as one guide.
4. Changed handoff/channel script version query strings to avoid stale browser JavaScript masking the repaired UI.

## Remaining browser verification

Open TEST-ASSET-003 after a hard reload and confirm:

- one workflow guide only on the sales-stage Product Workbench;
- WEBSITE STATUS: LIVE ON GEARCASHOUT;
- Website card itself says LIVE ON WEBSITE;
- public storefront path DJI → Mini 5 Pro shows the live unit;
- valuation page has one progress guide with no duplicate-looking scrollbar.
