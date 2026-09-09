# Staff Top-Bar GearCashOut Logo Routing — 9 September 2026

## Requirement

Every GearCashOut logo in a staff workflow top bar must return to the appropriate main dashboard for that workflow, rather than always going to the generic main staff dashboard or the public homepage.

## Investigation

Checked:

- current Supabase project-memory checkpoints;
- current shared staff navigation architecture;
- staff workflow group definitions;
- current GitHub headers and logo links;
- special staff pages outside shared navigation.

## First failure

`staff-navigation.js` already knew the four workflow dashboard groups, but its logo logic always forced:

`admin.html`

This meant Research, Purchasing, Sales and Customer staff pages all returned to the generic main dashboard.

Several static staff pages also had legacy links to `index.html` or intermediate inventory pages.

## Repair

Shared routing now uses:

`logo.href = dashboards[section]`

Therefore:

- Research pages → `admin-research-pricing.html`
- Purchasing pages → `admin-purchasing.html`
- Sales pages → `admin-sales-dashboard.html`
- Customer pages → `admin-customers.html`

Additional Sales workflow pages were added to the shared Sales group:

- `sales-archive.html`
- `delist-actions.html`
- `sales-customer-returns.html`

Special static pages were corrected separately:

- Product Workbench → Purchasing Dashboard
- Ready for Resale → Sales Dashboard
- Customer Details → Customer Dashboard

The shared navigation cache version was refreshed across the staff pages using it.

## Verification

Confirmed:

- central shared logo assignment uses the workflow dashboard;
- representative Research, Purchasing, Sales and Customer pages load the refreshed navigation version;
- Product Workbench has the explicit Purchasing Dashboard fallback;
- Customer Details has the explicit Customer Dashboard fallback;
- Sales special pages are included in the shared Sales group.

## Documentation

Updated:

- `docs/GEARCASHOUT-SYSTEM-HANDBOOK.md`
- `docs/GEARCASHOUT-AI-OPERATING-MANUAL.md`
- `docs/DIAGNOSTIC-ROADMAPS/INVENTORY-REPAIR-AND-SALES-WORKFLOW.md`
