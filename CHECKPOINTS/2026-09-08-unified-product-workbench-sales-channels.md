# 2026-09-08 Unified Product Workbench Sales Channels

## Change

The per-item Product Workbench is now the active place to manage an item after Sales handoff.

The separate listing-readiness / Sales Workbench route remains only as a compatibility redirect.

## Implemented

- Added inventory-sales-channels.js.
- Product Workbench now includes core product/listing fields and active sales outlets.
- WEBSITE publishes directly through the existing Published resale_listings path.
- External marketplaces use one submitted/live action instead of Draft → Ready to Upload.
- Existing central staff_mark_resale_listing_sold RPC remains available from the unified channel area.
- Product details, customer evidence, staff photographs, catalogue content and item sales content remain on the same page.
- Customer condition/exception notes are displayed explicitly rather than being visually attached only to the damage card.

## Backend truth preserved

- inventory_assets remains the physical-item source.
- sales_outlets remains the authoritative outlet registry.
- resale_listings remains the authoritative channel listing table.
- No duplicate website stock table or new channel-state store was created.
- Public retail storefront continues to derive from the existing Published WEBSITE listing path.

## Compatibility

listing-readiness.html redirects to inventory-detail.html using the same item id.

## Verification status

Repository and live Supabase schema/function state were inspected before the change.

Browser workflow still requires the next live staff test:
1. open a Sent to Sales item;
2. edit product/listing details;
3. publish WEBSITE;
4. mark one marketplace submitted/live;
5. confirm the public website and central sales dashboard reflect the same resale listing state.

## Documentation updated

- docs/GEARCASHOUT-SYSTEM-HANDBOOK.md
- docs/GEARCASHOUT-AI-OPERATING-MANUAL.md
- docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md
