/**
 * Action Buyer UK - Stock Ageing & Inventory Alert Layer
 *
 * Flags stock that has remained unsold beyond configurable thresholds.
 * Alerts are advisory and do not automatically change listing prices.
 */

const AGE_THRESHOLDS_DAYS = Object.freeze({
  watch: 14,
  review: 30,
  clearance: 60
});

function calculateStockAge(acquiredAt, now = new Date()) {
  const acquired = new Date(acquiredAt);
  const current = new Date(now);

  if (Number.isNaN(acquired.getTime())) {
    throw new Error('acquiredAt must be a valid date');
  }

  return Math.max(0, Math.floor((current - acquired) / 86400000));
}

function getStockAgeStatus(ageDays, thresholds = AGE_THRESHOLDS_DAYS) {
  const age = Number(ageDays) || 0;

  if (age >= thresholds.clearance) return 'Clearance Review';
  if (age >= thresholds.review) return 'Pricing Review';
  if (age >= thresholds.watch) return 'Watch';
  return 'Fresh Stock';
}

function createStockAgeAlert(asset, now = new Date(), thresholds = AGE_THRESHOLDS_DAYS) {
  const ageDays = calculateStockAge(asset.acquiredAt, now);
  const status = getStockAgeStatus(ageDays, thresholds);

  return {
    assetId: asset.assetId || asset.id || null,
    model: asset.model || null,
    acquiredAt: asset.acquiredAt,
    ageDays,
    status,
    requiresAction: status !== 'Fresh Stock'
  };
}

function createAgeingReport(assets = [], now = new Date(), thresholds = AGE_THRESHOLDS_DAYS) {
  const alerts = assets.map((asset) => createStockAgeAlert(asset, now, thresholds));

  return {
    totalStock: alerts.length,
    freshStock: alerts.filter((item) => item.status === 'Fresh Stock').length,
    watchStock: alerts.filter((item) => item.status === 'Watch').length,
    pricingReview: alerts.filter((item) => item.status === 'Pricing Review').length,
    clearanceReview: alerts.filter((item) => item.status === 'Clearance Review').length,
    alerts
  };
}

module.exports = {
  AGE_THRESHOLDS_DAYS,
  calculateStockAge,
  getStockAgeStatus,
  createStockAgeAlert,
  createAgeingReport
};
