# 2026-09-10 — Customer Account Branding Flash Repair

## Trigger

The customer reported that clicking the GearCashOut logo from the customer account caused the old GearCashOut logo to appear briefly before the current logo appeared.

## Investigation

Current GitHub state was inspected before changing anything.

The customer account `account.html` still used the legacy text-only header:

`<a class="logo" href="index.html">GEARCASHOUT</a>`

while the current GearCashOut homepage uses the approved `images/gearcashout-brand.svg` compass/wordmark asset.

The shared customer footer CSS also referenced the older `images/gearcashout-brand-pro.svg` asset. Three older standalone logo SVG variants were present but had no live code references.

The current Supabase project-memory checkpoint was also inspected. No database or authentication change was required for this UI repair.

## First actual failure

The customer account was still carrying legacy branding markup/assets after the public GearCashOut homepage had moved to the current compass/wordmark brand. The mismatch allowed the legacy logo to be rendered during account-to-home navigation.

## Repair

1. Updated `account.html`:
   - replaced the legacy `.logo` text header with the current `images/gearcashout-brand.svg` asset;
   - added fixed image dimensions to reserve the logo area;
   - preloaded the SVG to reduce first-paint/logo-loading variation;
   - kept the existing account navigation and all customer account JavaScript/data paths unchanged;
   - updated the account footer to use the same current brand asset.
2. Updated `customer-footer.css` to reference `images/gearcashout-brand.svg` instead of the retired `gearcashout-brand-pro.svg` asset.
3. Removed confirmed-unused legacy logo files:
   - `images/gearcashout-brand-pro.svg`
   - `images/gearcashout-logo.svg`
   - `images/gearcashout-logo-fixed2.svg`
   - `images/gearcashout-logo-spacing.svg`
4. Updated the customer-account diagnostic roadmap with the branding/navigation path and failure checkpoints.

## Safety boundary

No Supabase tables, RPCs, authentication rules, valuation logic, purchasing logic, retail purchase logic, sales logic or customer-account data paths were changed.

The existing account JavaScript was preserved. The unrelated `fixValuationUpdateLabel` observer remains because this repair did not establish that it is obsolete.

## Verification status

Static GitHub verification completed:

- `account.html` references the current brand asset.
- account header no longer contains the legacy `.logo` text markup.
- `customer-footer.css` references the current brand asset.
- the retired brand asset and three unused logo variants are removed.
- current homepage `index.html` continues to use `images/gearcashout-brand.svg`.

Live browser verification remains required to confirm the visible navigation has no legacy logo flash after GitHub Pages deployment/cache refresh.

## Diagnostic roadmap

`docs/DIAGNOSTIC-ROADMAPS/CUSTOMER-ACCOUNT-PURCHASING-AND-SALES.md`

## Main files changed

- `account.html`
- `customer-footer.css`
- `docs/DIAGNOSTIC-ROADMAPS/CUSTOMER-ACCOUNT-PURCHASING-AND-SALES.md`
- `docs/CHANGE-NOTES/2026-09-10-customer-account-brand-flash.md`

## Documentation note

The main Human/Developer System Handbook and AI Operating Manual were inspected. Their current GitHub versions are materially larger living documents; they were not overwritten with stale mounted copies. The focused diagnostic roadmap and change note above record this repair without risking loss of newer manual content.
