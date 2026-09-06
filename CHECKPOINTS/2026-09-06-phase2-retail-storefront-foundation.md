# 2026-09-06 — Phase 2 retail storefront foundation

## Starting state inspected

- Current Supabase project memory/checkpoint.
- Current GitHub repository `wmdroneservices/Action-Buyer-UK`.
- Existing sales/inventory migration and `listing-readiness.js`.
- Existing inventory, resale listing, evidence and staff permission schema.
- Existing sold-state functions and multi-channel architecture.

## Decision

Build Phase 2 as an additive extension of the existing central inventory and multi-channel sales system. The future branded website is another sales channel, not a replacement for marketplaces.

## Implemented

- Added `inventory_assets.catalog_product_id` as a nullable exact catalogue link.
- Added `sales_storefronts`.
- Added `sales_catalog_visibility`.
- Added `catalog_sales_content`.
- Added `inventory_sales_content`.
- Added explicit staff catalogue-link RPC.
- Added sales-permission-gated read-only market-evidence RPC.
- Seeded neutral `retail` storefront placeholder.
- Added Phase 2 Diagnostic Roadmap.
- Updated both system manuals.

## Verification

Live Supabase verification confirmed:

- storefront placeholder: 1;
- catalogue link column: present;
- new Phase 2 tables: 4;
- new Phase 2 functions: 2;
- new Phase 2 RLS policies: 4.

## Important safeguards

- No existing purchasing workflow was replaced.
- No existing resale listing or sold-state logic was removed.
- No ambiguous catalogue auto-match was performed.
- Sales evidence access is read-only through the dedicated RPC.
- No public storefront read access has been opened yet.

## Next step

Trace the exact inventory-creation functions and connect known exact catalogue identity at the source where safe; then add the staff-side sales evidence/catalogue-link interface. Create the separate public repository only after the retail brand/domain is chosen.
