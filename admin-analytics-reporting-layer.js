// Admin Analytics and Reporting Layer
// Provides operational metrics for quotes, offers, purchases and revenue tracking.

export function calculateQuoteMetrics(quotes = []) {
  return {
    totalQuotes: quotes.length,
    pendingQuotes: quotes.filter(q => q.status === 'pending').length,
    completedQuotes: quotes.filter(q => q.status === 'completed').length,
    rejectedQuotes: quotes.filter(q => q.status === 'rejected').length
  };
}

export function calculateConversionRate(quotes = []) {
  if (!quotes.length) return 0;

  const completed = quotes.filter(q => q.status === 'completed').length;
  return Math.round((completed / quotes.length) * 100);
}

export function calculateOfferMetrics(offers = []) {
  return {
    totalOffers: offers.length,
    acceptedOffers: offers.filter(o => o.status === 'accepted').length,
    declinedOffers: offers.filter(o => o.status === 'declined').length
  };
}

export function calculateRevenueMetrics(purchases = []) {
  return {
    completedPurchases: purchases.length,
    totalValue: purchases.reduce((sum, purchase) => sum + (purchase.amount || 0), 0)
  };
}

export function generateAnalyticsSummary(data) {
  return {
    quotes: calculateQuoteMetrics(data.quotes),
    conversionRate: calculateConversionRate(data.quotes),
    offers: calculateOfferMetrics(data.offers),
    revenue: calculateRevenueMetrics(data.purchases)
  };
}
