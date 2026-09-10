# Customer Account — Purchasing and Sales Diagnostic Roadmap

## Purpose

The GearCashOut customer account must show both sides of the customer relationship without mixing them:

1. **Selling to GearCashOut** — valuations, offers, accepted sell-to-us transactions and payment history.
2. **Buying from GearCashOut** — retail purchases, fulfilment/delivery status and customer return status where recorded.

The customer account is customer-facing at `account.html`. The staff-side customer record is `admin-customer-details.html`.

## Current front-end flow

### Customer-facing account

User action → `account.html` → `auth.js` (`window.actionBuyerAuth`) → existing account scripts → `account-retail-purchases.js` → `customer_retail_purchase_history()`.

The existing sell-to-us workflow remains in the existing account scripts and tables. The new retail section is deliberately separate so existing valuation/payment behaviour is not rewritten.

### Customer-facing brand/navigation

Customer account logo click → `account.html` header brand link → `index.html` → current GearCashOut homepage brand asset `images/gearcashout-brand.svg`.

The account header must use the same current brand asset as the homepage. Do not restore the legacy text-only `.logo` header or any retired GearCashOut logo SVG. The header reserves the image dimensions and preloads the SVG so the legacy logo cannot appear during navigation.

### Cross-site customer navigation

The customer-facing account header now exposes both sides of the connected platform:

- **Sell Your Gear** → the GearCashOut purchasing/valuation homepage (`index.html` on the Action-Buyer-UK site).
- **Shop Gear** → the temporary GitHub Pages Gear1 Outpost retail site: `https://wmdroneservices.github.io/GearCashOut-Retail-Storefront/`.

The GearCashOut homepage also exposes **Shop Gear** to the Gear1 Outpost retail site. This is currently injected by the existing `live-quote-nav.js` homepage navigation layer so the link remains part of the current homepage navigation without replacing the existing homepage markup.

The Gear1 Outpost homepage exposes **Sell Your Gear** back to the live GearCashOut purchasing site at `https://gearcashout.co.uk/`.

The temporary retail GitHub Pages URL is authoritative until the Gear1 Outpost domain is purchased. Do not invent or substitute a future retail domain before it is configured and verified.

### Staff customer account

Staff action → `admin-customers.html` → `admin-customer-details.html?user_id=...` → `admin-customer-details.js` → `staff_customer_profile(p_user_id)` → `admin-customer-retail-purchases.js`.

## Data sources

### Customer identity

- `auth.users.id` is the canonical authenticated customer identity.
- `profiles.id` is the customer profile identity.
- `sales.user_id` links the existing sell-to-us transaction flow to the customer.

### Retail purchase identity

- `resale_transactions.buyer_user_id` is the canonical authenticated buyer identity added for the retail side.
- `resale_transactions.asset_id` identifies the physical inventory item.
- `resale_transactions.listing_id` identifies the resale listing where available.
- `resale_listings` supplies listing title/reference/URL.
- `inventory_assets` supplies SKU/manufacturer/model.
- `sales_fulfillments` supplies fulfilment/tracking state for the physical asset/listing.
- `sales_customer_returns` supplies the latest customer return case for the physical asset.

## Customer-facing RPC

`public.customer_retail_purchase_history()` is `SECURITY DEFINER` and returns only rows where `resale_transactions.buyer_user_id = auth.uid()`.

The function is executable by authenticated users and returns safe purchase/fulfilment/return fields for the account page. It does not expose another customer's retail transactions.

## Staff RPC

`public.staff_customer_profile(p_user_id)` now includes a `retail_purchases` array in addition to the existing `customer`, `valuations` and `sales` data.

Staff access remains restricted by the function's existing staff-user check.

## Stage / display rules

### Selling to GearCashOut

Use the existing valuation and `sales` workflow as the authoritative customer sell-to-us history. Do not duplicate or migrate those records into `resale_transactions`.

### Buying from GearCashOut

A retail purchase is displayed when a `resale_transactions` row is linked to the customer's `buyer_user_id`.

A purchase may additionally display:

- product/listing identity;
- sale date and sale price;
- sales channel;
- fulfilment/tracking status;
- latest return case and refund/replacement information.

If no retail purchase exists, the customer account shows a clear empty state rather than an error.

## Branding / navigation failure checkpoints

1. Customer account header briefly shows a legacy GearCashOut logo: inspect `account.html` header markup and ensure it uses `images/gearcashout-brand.svg` rather than the legacy `.logo` text.
2. Current homepage and account logos differ: inspect the account image source and customer footer branding asset; the current approved public brand is `images/gearcashout-brand.svg`.
3. Logo flashes during navigation: verify the account header reserves fixed image dimensions and preloads the SVG; do not add JavaScript logo swapping.
4. A retired logo asset is referenced: search GitHub for the filename before deleting anything and confirm the current asset has replaced every live reference.
5. Customer footer shows an older brand: inspect `customer-footer.css`; it must reference the current `images/gearcashout-brand.svg`.
6. Customer account does not show the sister retail link: inspect the static account header in `account.html` and confirm `Shop Gear` points to the temporary GitHub Pages Gear1 Outpost URL.
7. GearCashOut homepage does not show the sister retail link: inspect `live-quote-nav.js` and confirm `addHomepageSisterSiteLink()` runs before the staff early return and only targets `.home` pages.
8. Gear1 Outpost homepage does not link back: inspect `GearCashOut-Retail-Storefront/index.html` and confirm `Sell Your Gear` points to `https://gearcashout.co.uk/`.
9. The retail domain changes: update all three current navigation locations together and verify the new public URL before retiring the GitHub Pages URL.

## Failure checkpoints

1. Customer account does not load: verify `auth.js`, authenticated session and `account-retail-purchases.js`.
2. Sell-to-us history missing: inspect existing `account-page.js`, `account-sales.js`, `valuations`, `sales` and existing RPC/data paths; do not replace them with retail logic.
3. Retail history missing: inspect `customer_retail_purchase_history()` and `resale_transactions.buyer_user_id`.
4. Retail data appears for the wrong customer: stop and inspect the RPC predicate `buyer_user_id = auth.uid()` before changing front-end code.
5. Fulfilment missing: inspect `sales_fulfillments.asset_id` and `listing_id` linkage.
6. Return status missing: inspect `sales_customer_returns.asset_id` and latest-case ordering.
7. Staff customer account missing retail data: inspect `staff_customer_profile()` and `admin-customer-retail-purchases.js`.

## Known current state

- No existing `resale_transactions` rows are currently linked to a customer through `buyer_user_id` at the time of this change.
- The account therefore currently shows the new retail section with an empty state until retail checkout starts creating buyer-linked transactions.
- No storefront checkout implementation was invented or changed by this repair.
- The customer account header now uses the current GearCashOut compass/wordmark asset and no longer uses the retired text-only `.logo` header.
- The shared customer footer CSS now uses the same current brand asset.
- Retired standalone GearCashOut logo SVG variants that had no live references were removed from the repository.
- The temporary Gear1 Outpost public URL is `https://wmdroneservices.github.io/GearCashOut-Retail-Storefront/` until a dedicated domain is purchased and configured.
- No Supabase schema, RPC, RLS or data was changed for cross-site navigation; the `sales_outlets.WEBSITE.public_base_url` remains unconfigured, so the front-end uses the explicitly verified GitHub Pages URL rather than inventing a database-derived URL.

## Verification required

Browser verification should cover:

1. Customer account with no retail purchase: sell-to-us history still works and retail section shows the empty state.
2. Authenticated customer with a buyer-linked retail transaction: only that customer's purchase is shown.
3. Staff customer detail page: retail purchase section appears without disturbing existing customer/valuation/sell-to-us information.
4. Existing sell-to-us valuation, offer, payment and return behaviour remains unchanged.
5. Future retail checkout must write both the buyer's authenticated user ID (`buyer_user_id`) and the existing customer snapshot fields used by the transaction record.
6. Customer account header shows the current GearCashOut logo immediately with no legacy logo flash; clicking it lands on the current branded homepage.
7. Customer footer and homepage use the same current `images/gearcashout-brand.svg` asset.
8. Customer account top bar visibly contains both `Sell Your Gear` and `Shop Gear`, with `Shop Gear` opening the temporary Gear1 Outpost GitHub Pages site.
9. GearCashOut homepage visibly contains `Shop Gear` and opens the same temporary Gear1 Outpost URL.
10. Gear1 Outpost homepage visibly contains `Sell Your Gear` and returns to `https://gearcashout.co.uk/`.
