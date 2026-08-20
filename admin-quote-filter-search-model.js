// Admin Quote Filter Search Model
// Defines dashboard filters for managing incoming purchase quotes.

const adminQuoteFilters = {
  statuses: [
    'new',
    'review',
    'valuation',
    'offer_sent',
    'awaiting_customer',
    'verification_pending',
    'completed',
    'rejected'
  ],

  priorityFilters: {
    highValue: {
      field: 'estimated_value',
      operator: 'greater_than'
    },
    urgentReview: {
      field: 'status',
      value: 'review'
    },
    awaitingInspection: {
      field: 'status',
      value: 'verification_pending'
    }
  },

  searchableFields: [
    'quote_id',
    'customer_name',
    'email',
    'manufacturer',
    'model',
    'serial_number'
  ]
};

function filterQuotes(quotes, filter) {
  return quotes.filter((quote) => {
    if (!filter) return true;

    if (filter.status && quote.status !== filter.status) {
      return false;
    }

    return true;
  });
}

module.exports = {
  adminQuoteFilters,
  filterQuotes
};
