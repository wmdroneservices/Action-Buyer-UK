// Admin Valuation Dashboard Model
// Defines the data structure required for reviewing incoming quotes,
// researching values, adjusting offers and approving purchases.

const adminDashboardSections = {
  incomingQuotes: {
    fields: [
      'quoteId',
      'createdDate',
      'customerName',
      'itemCount',
      'status'
    ]
  },

  itemReview: {
    fields: [
      'category',
      'manufacturer',
      'model',
      'package',
      'condition',
      'photosReceived'
    ]
  },

  valuationReview: {
    fields: [
      'marketSources',
      'comparisonPrices',
      'suggestedValue',
      'manualAdjustment',
      'reviewNotes'
    ]
  },

  offerApproval: {
    fields: [
      'suggestedOffer',
      'finalOffer',
      'approvalStatus',
      'verificationRequired'
    ]
  }
};

module.exports = adminDashboardSections;
