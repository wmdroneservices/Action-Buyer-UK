# Change Note — Unified Customer Account: Purchasing and Sales

**Date:** 2026-09-09

## Reason

The customer account previously concentrated on the sell-to-GearCashOut journey. GearCashOut also needs a clear customer-facing record of equipment the customer buys from the business.

## Investigation

The existing customer identity is `auth.users.id` / `profiles.id`. Sell-to-us history is already linked through `sales.user_id` and the existing valuation/account workflow. Retail resale records did not have a canonical authenticated buyer link, so the first structural gap was identified in `resale_transactions`.

No retail checkout implementation was assumed or invented.

## Changes

- Added `resale_transactions.buyer_user_id uuid references auth.users(id)`.
- Added an index on `(buyer_user_id, sale_date desc)`.
- Added `customer_retail_purchase_history()` as a security-definer RPC scoped to `auth.uid()`.
- Extended `staff_customer_profile()` with `retail_purchases`.
- Added `account-retail-purchases.js` and a dedicated **BUYING FROM GEARCASHOUT** section to `account.html`.
- Added `admin-customer-retail-purchases.js` and a dedicated retail purchase section to the staff customer account.
- Existing sell-to-us account flow remains separate and unchanged in its underlying tables.
- Added the diagnostic roadmap `docs/DIAGNOSTIC-ROADMAPS/CUSTOMER-ACCOUNT-PURCHASING-AND-SALES.md`.

## Safety / privacy

The customer-facing retail RPC returns only transactions whose `buyer_user_id` equals the authenticated customer's `auth.uid()`. It does not expose another customer's retail history.

## Verification

- Database migration applied successfully.
- Retail history RPC executes successfully and currently returns no linked transactions because there are currently zero `resale_transactions` rows with `buyer_user_id` populated.
- Both new JavaScript files pass Node syntax checking.
- Browser verification remains required on the live customer account and staff customer account.

## Follow-on requirement

When retail checkout is implemented, it must create/update the corresponding `resale_transactions` row with the authenticated buyer's `buyer_user_id` as well as the transaction's existing customer snapshot fields. This is the identity bridge that makes purchases appear in the customer account.

## Documentation note

The current GitHub handbook and AI operating manual contain later project history than the older mounted copies supplied in the conversation. They were not overwritten with stale copies. This change note and the dedicated diagnostic roadmap preserve the change until the current handbook/manual text can be amended safely without replacing newer material.
