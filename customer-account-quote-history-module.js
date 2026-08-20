// Customer Account Quote History Module
// Provides customer-facing history structure for quotes and purchases.

const customerQuoteHistory = {
  getCustomerQuotes(customerId) {
    return {
      customerId,
      quotes: []
    };
  },

  statuses: [
    'submitted',
    'under_review',
    'offer_ready',
    'accepted',
    'verification',
    'completed',
    'rejected'
  ],

  visibleFields: [
    'quoteId',
    'itemSummary',
    'status',
    'createdDate',
    'offerStatus'
  ],

  hiddenInternalFields: [
    'valuationNotes',
    'supplierMargins',
    'researchSources'
  ]
};

export default customerQuoteHistory;
