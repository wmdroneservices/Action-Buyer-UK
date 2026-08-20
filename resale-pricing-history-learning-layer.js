/**
 * Action Buyer UK - Resale Pricing History & Learning Layer
 *
 * Uses completed internal sales to measure pricing performance. This layer
 * reports historical outcomes; it does not automatically change live prices.
 */

function recordPricingOutcome({
  assetId,
  manufacturer,
  model,
  condition = null,
  purchasePrice,
  totalCost,
  listedPrice,
  actualSalePrice,
  salesChannel,
  daysToSell = null,
  soldAt = new Date().toISOString()
}) {
  return {
    assetId,
    manufacturer,
    model,
    condition,
    purchasePrice: Number(purchasePrice) || 0,
    totalCost: Number(totalCost) || 0,
    listedPrice: Number(listedPrice) || 0,
    actualSalePrice: Number(actualSalePrice) || 0,
    salesChannel,
    daysToSell,
    grossProfit: (Number(actualSalePrice) || 0) - (Number(totalCost) || 0),
    soldAt,
    createdAt: new Date().toISOString()
  };
}

function analysePricingOutcomes(outcomes = []) {
  if (!outcomes.length) {
    return {
      sales: 0,
      averageSalePrice: 0,
      averageProfit: 0,
      averageDaysToSell: null,
      averageDiscountFromList: 0
    };
  }

  const validDays = outcomes
    .map((item) => Number(item.daysToSell))
    .filter((value) => Number.isFinite(value));

  const totalSales = outcomes.reduce((sum, item) => sum + (Number(item.actualSalePrice) || 0), 0);
  const totalProfit = outcomes.reduce((sum, item) => sum + (Number(item.grossProfit) || 0), 0);
  const discounts = outcomes
    .filter((item) => Number(item.listedPrice) > 0)
    .map((item) => ((Number(item.listedPrice) - Number(item.actualSalePrice)) / Number(item.listedPrice)) * 100);

  return {
    sales: outcomes.length,
    averageSalePrice: totalSales / outcomes.length,
    averageProfit: totalProfit / outcomes.length,
    averageDaysToSell: validDays.length
      ? validDays.reduce((sum, value) => sum + value, 0) / validDays.length
      : null,
    averageDiscountFromList: discounts.length
      ? discounts.reduce((sum, value) => sum + value, 0) / discounts.length
      : 0
  };
}

function groupPricingOutcomes(outcomes = [], field = 'model') {
  return outcomes.reduce((groups, outcome) => {
    const key = outcome[field] || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(outcome);
    return groups;
  }, {});
}

function createPricingLearningReport(outcomes = []) {
  const groups = groupPricingOutcomes(outcomes, 'model');

  return Object.entries(groups).map(([model, modelOutcomes]) => ({
    model,
    ...analysePricingOutcomes(modelOutcomes)
  }));
}

module.exports = {
  recordPricingOutcome,
  analysePricingOutcomes,
  groupPricingOutcomes,
  createPricingLearningReport
};
