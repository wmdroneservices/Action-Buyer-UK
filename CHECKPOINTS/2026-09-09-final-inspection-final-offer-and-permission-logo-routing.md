# Final Inspection Next Action + Staff Logo Permission Routing — 9 September 2026

## Requirements

1. After final inspection/testing is complete, the Product Workbench must show **INSPECTION COMPLETE** and move staff to **MAKE FINAL OFFER** when the linked customer purchase is awaiting its final offer.
2. Every staff top-bar GearCashOut logo must return to the central Staff Dashboard, which shows only dashboards pre-authorised for the signed-in staff member in Staff Management.

## Investigation order

Project memory/checkpoints → Inventory Repair and Sales Workflow Roadmap → current GitHub → live Supabase schema/state.

## Inspection finding

The existing state machine correctly transitions a passed inspection/testing flow:

`Received → Inspection Required → Testing → Ready for Resale`

The existing Product Workbench already knew how to detect:

- asset `Ready for Resale`;
- linked purchase awaiting final offer;
- linked valuation available.

However, the inspection form continued to display **SAVE INSPECTION & TESTING**, and the lower handoff section still exposed an Inventory return / Sales-oriented completion UI.

## Repair

`inventory-workbench.js` now:

- derives `inspectionComplete` from `Ready for Resale`;
- changes the completed inspection control to **INSPECTION COMPLETE**;
- shows **MAKE FINAL OFFER** when `finalOfferReady` is true;
- routes the final offer to the linked `admin-quote.html?id=<valuation>`;
- changes the lower handoff heading to **Final offer & payment** in this state;
- replaces the Inventory/Sales action with **MAKE FINAL OFFER** and **RETURN TO PURCHASING DASHBOARD**;
- suppresses the misleading Sales-workflow blocked message while the final offer is the correct next action;
- preserves the existing purchase-finalisation gate before Sales handoff.

## Staff logo finding

The previous implementation incorrectly interpreted “appropriate dashboard” as the dashboard for the current workflow. `staff-navigation.js` therefore redirected the logo based on page group, which could send staff to Sales.

The actual requirement is:

**GearCashOut logo → central Staff Dashboard → only the signed-in staff member's authorised dashboards are displayed.**

`admin-dashboard.js` already reads:

- `can_access_research`
- `can_access_purchasing`
- `can_access_sales`
- `can_access_customers`
- `can_manage_staff`
- `can_access_mail`

from `staff_users` and hides unauthorised dashboard areas.

## Logo repair

- shared `staff-navigation.js` now always sets the logo to `admin.html`;
- cache references were refreshed across all pages using shared staff navigation;
- special/static staff pages with legacy workflow/public logo targets were checked and changed to `admin.html`;
- customer/public logo behaviour was not changed.

## Verification

Confirmed current GitHub:

- shared staff logo assignment is `admin.html`;
- checked static staff logo targets are all `admin.html`;
- completed inspection state exists;
- **INSPECTION COMPLETE** exists;
- **MAKE FINAL OFFER** exists;
- final offer targets the linked valuation;
- completed-final-offer state provides Purchasing return rather than Inventory/Sales as the primary next action;
- Product Workbench cache version was refreshed.

## Documentation

Updated:

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`