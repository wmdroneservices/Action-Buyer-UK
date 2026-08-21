/**
 * GearCashOut - Listing Readiness
 *
 * Validates an asset before it can be exposed on a sales channel.
 */
function validateListingReadiness(asset, preparation = null) {
  const checks = {
    statusReady: asset?.status === 'Ready for Resale',
    serialRecorded: Boolean(asset?.serial_number),
    conditionRecorded: Boolean(asset?.condition_grade),
    purchasePriceRecorded: Number(asset?.purchase_price) >= 0,
    resalePriceApproved: Number(asset?.approved_resale_price || 0) > 0,
    packageRecorded: Boolean(asset?.package_name),
    preparationCompleted: Boolean(preparation)
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    ready: failedChecks.length === 0,
    checks,
    failedChecks
  };
}

if (typeof window !== 'undefined') window.ListingReadiness = { validateListingReadiness };
if (typeof module !== 'undefined') module.exports = { validateListingReadiness };
