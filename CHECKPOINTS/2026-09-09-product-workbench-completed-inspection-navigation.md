# Product Workbench Completed Inspection Navigation — 9 September 2026

## User-reported problem

After a customer item had been received and physically inspected, the Product Workbench still presented generic **INVENTORY / SALES / SOLD ITEMS** navigation and described the next stage as **Send to Sales**.

That was misleading because the linked customer purchase had not yet completed. The correct next action after a successful inspection was the customer final-offer/refusal decision.

## Investigation order

Project memory/checkpoints → Inventory Repair and Sales Workflow Diagnostic Roadmap → current Product Workbench code → live Supabase sale/asset state.

## First verified failure

The navigation in `inventory-detail.html` was generic rather than workflow-aware.

In `inventory-workbench.js`, `Ready for Resale` represented a completed physical inspection, but the presentation still implied the next stage was Sales.

Live verification for `GCO-AEAA94E839` confirmed the distinction:

- asset status: `Ready for Resale`
- original valuation link exists
- the customer purchase was still unfinished at the time the fault was identified

## Repair

### Navigation

- Removed Product Workbench links to generic Sales and Sold Items.
- Replaced the page-level route with **PURCHASING DASHBOARD**.

### Contextual next action

When:

- the asset is `Ready for Resale`;
- the linked purchase is actually awaiting its final offer; and
- the original valuation exists;

the Product Workbench now shows **OPEN CUSTOMER FINAL OFFER** → `admin-quote.html?id=<valuation_id>`.

### Workflow presentation

The progress step now shows:

- **Final offer & payment** while the customer final offer is the next action;
- **Complete customer purchase** when inspection is complete but the purchase is already in a later unfinished state such as payment;
- **Send to Sales** only after the customer purchase has completed and the existing Sales handoff gate can legitimately apply.

### Guard

The final-offer CTA is not shown solely because an asset is `Ready for Resale`. The linked `sales.status` and `sales.payment_status` must still indicate that the purchase is awaiting the final offer.

## Preserved behaviour

- Physical inspection remains in Purchasing.
- Sales does not regain an editable inspection workflow.
- `staff_send_inventory_to_sales` remains the authoritative backend handoff gate.
- No database workflow records, statuses, RLS or RPC definitions were changed.

## Verification

Current GitHub verification confirmed:

- Product Workbench header no longer links to generic Sales/Sold Items.
- Purchasing Dashboard is the neutral return route.
- Final-offer routing resolves through the real `quote_items.valuation_id`.
- Final-offer display is gated by the live purchase state.
- The existing completed-and-paid Sales handoff gate remains unchanged.

## Documentation updated

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`
