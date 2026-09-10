# 2026-09-10 — Cross-site customer navigation

## Change

Added clear navigation between the GearCashOut purchasing/valuation site and the Gear1 Outpost retail selling site.

## Customer account

`account.html` now exposes both sides of the platform in the top navigation:

- **Sell Your Gear** → `index.html` on the GearCashOut purchasing/valuation site.
- **Shop Gear** → `https://wmdroneservices.github.io/GearCashOut-Retail-Storefront/`.

The existing current GearCashOut compass/wordmark branding and account data flow were left unchanged.

## GearCashOut homepage

`live-quote-nav.js` now adds **Shop Gear** to `.home` page navigation, using the same temporary Gear1 Outpost GitHub Pages URL. The injection runs before the staff early return and only targets pages whose body has the existing `home` class.

No valuation, quote, account, Supabase or staff workflow was changed.

## Gear1 Outpost homepage

`GearCashOut-Retail-Storefront/index.html` now exposes **Sell Your Gear** in the top navigation, pointing back to `https://gearcashout.co.uk/`.

The existing Account link continues to point to the GearCashOut customer account.

## Domain transition rule

The Gear1 Outpost GitHub Pages address is temporary until the dedicated domain is purchased and configured. Do not replace it with an assumed domain. When the domain is purchased, update the account header, GearCashOut homepage navigation and Gear1 Outpost homepage navigation together, then verify all three destinations.

## Backend impact

None. Supabase was inspected because the `sales_outlets.WEBSITE.public_base_url` field exists, but it is currently `NULL`. No schema, RPC, RLS or data was changed. The explicitly supplied and verified GitHub Pages URL is therefore used by the front-end.

## Verification

Required browser checks after GitHub Pages deployment/cache refresh:

1. Open the customer account and confirm both **Sell Your Gear** and **Shop Gear** are visible in the top bar.
2. Confirm **Shop Gear** opens the Gear1 Outpost GitHub Pages homepage.
3. Open the GearCashOut homepage and confirm **Shop Gear** appears in the navigation and opens the same retail site.
4. Open the Gear1 Outpost homepage and confirm **Sell Your Gear** returns to GearCashOut.
5. Confirm the existing account, valuation and retail-purchase sections still load normally.
