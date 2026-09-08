# Purchasing Inspection → Sales Read-Only Boundary — 8 September 2026

## User decision

The physical inspection must be performed and edited in **Purchasing**.

Sales may display the completed inspection, but only as a **read-only record**. Repairs and factual inspection changes remain controlled through Purchasing.

## First failure

After a fresh item was received, the sale entered `inspection`, but `admin-sale-next-step.js` treated that status as permission to bypass the Product Workbench and go directly to the final-offer/refusal screen.

The linked inventory asset existed and was still `Received`, so the physical inspection had not actually been completed.

## Repair

### Start Inspection

`admin-sale-next-step.js` now:

1. calls `staff_start_sale_inspection(p_sale_id)`;
2. resolves the linked inventory asset through the real `sale_items` → `inventory_assets` relationship;
3. redirects to `inventory-detail.html?id=<asset_id>`.

The editable physical inspection therefore remains in the Purchasing Product Workbench.

### Sales presentation

While inspection is incomplete, Sales:

- shows the inspection state as read-only;
- links back to Purchasing;
- does not expose the final-offer/refusal action.

If the asset is `Repair Required`, Sales keeps the inspection read-only and routes the authorised repair back through Purchasing.

Once the asset reaches `Ready for Resale` (or a later sales state), Sales shows the inspection/testing outcome as read-only and permits the final valuation decision.

### Final-offer controls

`admin-quote-final-offer-fix.js` no longer restores final-offer controls solely because the sale status is `inspection`.

It also checks the linked `inventory_assets.status` and enables the controls only after the Purchasing inspection has reached a completed state.

## Do not regress

- Do not restore a separate Sales-side editable inspection.
- Do not bypass `inventory-detail.html` after Start Inspection.
- Do not treat `sales.status='inspection'` alone as inspection completion.
- Do not allow Sales to edit repair or physical inspection history.

## Relevant files

- `admin-sale-next-step.js`
- `admin-quote-final-offer-fix.js`
- `inventory-detail.html`
- `inventory-workbench.js`
- `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`

## Verification target

Fresh received item:

`Received → Start Inspection → Purchasing Product Workbench → complete inspection/testing OR Repair Required → Sales read-only inspection → final offer/refusal only after completion`.
