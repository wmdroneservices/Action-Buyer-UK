# 2026-09-10 — Live Website Staff Access

## Requirement

Provide the retail WEBSITE visibility dashboard from the main staff dashboard so Sales and Purchasing staff can access it, while keeping visibility changes under Management control.

## Investigation

The existing Live Website Control feature already used the authoritative `sales_catalog_visibility` table and management-only RPCs. The page itself required `can_manage_staff=true`, so Sales and Purchasing staff could not inspect the current storefront visibility from the main dashboard.

The existing staff permission model provides `can_access_purchasing`, `can_access_sales` and `can_manage_staff` and was inspected before the change.

## Repair

- Added a `LIVE WEBSITE` card to `admin.html`.
- Added a `storefront` dashboard permission in `admin-dashboard.js` so active Management, Sales or Purchasing staff can see the card.
- Changed `admin-live-website.js` so active Sales/Purchasing staff can open the page read-only.
- Management staff retain the existing manufacturer/category/product controls.
- Sales and Purchasing staff see the current visibility state but cannot save changes; visibility RPCs remain Management-only.
- Added an explicit read-only notice to `admin-live-website.html`.
- Added cache-busting to the dashboard JavaScript reference.

## Security boundary

No Supabase write policy or visibility RPC was relaxed. `staff_set_storefront_visibility(...)` and `staff_set_storefront_scope_mode(...)` still require active management staff (`can_manage_staff=true`).

This means Sales/Purchasing access is observational only, while Management remains the only role able to alter what customers see.

## Preservation

- No catalogue products were deactivated.
- No `sales_catalog_visibility` rows were created or changed.
- No inventory, listings, sales or customer records were changed.
- No pricing permissions were changed.

## Verification status

Code changes committed to the default branch. Supabase schema/RLS and existing visibility overrides were rechecked; `sales_catalog_visibility` remains at zero overrides.

Browser verification remains required for:

1. Management sees the LIVE WEBSITE card and can edit visibility.
2. Sales staff sees the LIVE WEBSITE card and receives read-only access.
3. Purchasing staff sees the LIVE WEBSITE card and receives read-only access.
4. Sales/Purchasing cannot change manufacturer/category/product visibility.
5. Management changes continue to propagate through the existing public storefront RPCs.
6. Existing Sales, Purchasing and Research permissions remain unchanged.

## Related roadmap

`docs/DIAGNOSTIC-ROADMAPS/LIVE-WEBSITE-VISIBILITY-CONTROL.md`
