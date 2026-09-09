# 9 September 2026 — Live Stock & Sales Workflow

## Change

The Sales Dashboard Step 1 **Inventory** destination was changed because `inventory.html` is a purchase-inventory-only view. Once stock had moved into Sales, the page could correctly show no purchase inventory and therefore appeared to do nothing from the Sales Dashboard.

Step 1 now opens `sales-stock-workflow.html`.

## Diagnostic roadmap

See `docs/DIAGNOSTIC-ROADMAPS/SALES-STOCK-WORKFLOW.md`.

## Live data model

The new view reads the existing authoritative tables:

- `inventory_assets` — one physical SKU and its operational status;
- `resale_listings` — channel/listing lifecycle;
- `sales_fulfillments` — post-sale fulfilment state.

No duplicate stock table was introduced and no existing status transitions were changed.

## UI rule

Each physical product appears once in a collapsible product record. The record shows its stock status, Sales state, channel listings and post-sale fulfilment information.

A `Published` or `Reserved` `resale_listings` row makes the product a **Live sale** even if the physical asset remains `Sent to Sales`. A `Sent to Sales` asset with no active listing is shown as **Sent to Sales — awaiting listing**.

## Verification state

GitHub implementation commits:

- `182cdd3fd5ef1b22376fead0ee5a67d02bbfb6a0`
- `9211da6a9ca69b9c4b3a2ff4157fb190e607febf`
- `144f6d4a3dd8344635428fe92f74f4d9a6fff2a6`
- `cffe13bb1ae92bcfbd1d2dd47c80de798ac21516`

Live Supabase state was inspected on 9 September 2026. Browser verification remains the next step.

## Manual merge note

The repository's current Human/Developer System Handbook and AI Operating Manual contain later material than the mounted document copies available during this change. Those mounted copies were therefore not used to overwrite the current GitHub manuals. This change note and the dedicated diagnostic roadmap preserve the exact documentation update without risking regression of newer manual content; the section should be merged into both manuals during the next documentation maintenance pass.
