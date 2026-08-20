/**
 * Action Buyer UK - Resale Pricing Recommendation Layer
 *
 * Internal pricing guidance for acquired stock. Recommendations are not
 * automatically published; an operator remains responsible for final pricing.
 */

const CONDITION_MULTIPLIERS = Object.freeze({
  Excellent: 1.0,
  Good: 0.92,
  Fair: 0.82,
  Poor: 0.68
});

function calculatePricingRecommendation({
  purchasePrice,
  additionalCosts = 0,
  marketReferencePrice,
  condition = 'Good',
  targetMarginPercentage = 20,
  minimumMarginPercentage = 10
}) {
  const purchase = Number(purchasePrice) || 0;
  const costs = Number(additionalCosts) || 0;
  const market = Number(marketReferencePrice) || 0;
  const multiplier = CONDITION_MULTIPLIERS[condition] ?? CONDITION_MULTIPLIERS.Good;
  const estimatedMarketValue = market * multiplier;
  const totalCost = purchase + costs;

  const targetPrice = Math.max(
    estimatedMarketValue,
    totalCost * (1 + Number(targetMarginPercentage) / 100)
  );

  const minimumPrice = totalCost * (1 + Number(minimumMarginPercentage) / 100);

  return {
    totalCost,
    condition,
    estimatedMarketValue,
    recommendedAskingPrice: Math.round(targetPrice),
    minimumAcceptablePrice: Math.round(minimumPrice),
    expectedProfitAtRecommendedPrice: Math.round(targetPrice - totalCost),
    expectedMarginPercentage: targetPrice > 0
      ? ((targetPrice - totalCost) / targetPrice) * 100
      : 0
  };
}

function compareChannelPricing(basePrice, channelFees = 0) {
  const price = Number(basePrice) || 0;
  const fees = Number(channelFees) || 0;

  return {
    listingPrice: price,
    estimatedFees: fees,
    estimatedNetSale: price - fees
  };
}

module.exports = {
  CONDITION_MULTIPLIERS,
  calculatePricingRecommendation,
  compareChannelPricing
};
