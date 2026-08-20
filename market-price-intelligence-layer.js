/**
 * Action Buyer UK - Market Price Intelligence Layer
 *
 * Stores comparable market observations used by the internal pricing system.
 * Observations should be based on actual research or recorded transactions;
 * this layer does not scrape or publish third-party data automatically.
 */

function createMarketObservation({
  manufacturer,
  model,
  condition = null,
  channel,
  observedPrice,
  observationType = 'Listing',
  observedAt = new Date().toISOString(),
  sourceReference = null
}) {
  if (!manufacturer || !model || !channel) {
    throw new Error('manufacturer, model and channel are required');
  }

  const price = Number(observedPrice);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('observedPrice must be a non-negative number');
  }

  return {
    manufacturer,
    model,
    condition,
    channel,
    observedPrice: price,
    observationType,
    observedAt,
    sourceReference,
    createdAt: new Date().toISOString()
  };
}

function calculateMarketSummary(observations = []) {
  if (!observations.length) {
    return { count: 0, averagePrice: 0, lowestPrice: 0, highestPrice: 0 };
  }

  const prices = observations
    .map((item) => Number(item.observedPrice))
    .filter((price) => Number.isFinite(price));

  if (!prices.length) {
    return { count: 0, averagePrice: 0, lowestPrice: 0, highestPrice: 0 };
  }

  return {
    count: prices.length,
    averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices)
  };
}

function filterComparableObservations(observations = [], { manufacturer, model, condition, channel } = {}) {
  return observations.filter((item) =>
    (!manufacturer || item.manufacturer === manufacturer) &&
    (!model || item.model === model) &&
    (!condition || item.condition === condition) &&
    (!channel || item.channel === channel)
  );
}

function getMarketReferencePrice(observations = []) {
  const summary = calculateMarketSummary(observations);
  return summary.count ? summary.averagePrice : null;
}

module.exports = {
  createMarketObservation,
  calculateMarketSummary,
  filterComparableObservations,
  getMarketReferencePrice
};
