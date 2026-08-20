// Sale conversion model
// Converts accepted offers into tracked sales records.

const saleConversionModel = {
  sale: {
    saleId: null,
    quoteId: null,
    customerId: null,
    status: 'awaiting-arrival'
  },
  inspection: {
    status: 'pending',
    photosChecked: false,
    serialChecked: false,
    conditionVerified: false
  },
  shipping: {
    status: 'not-started',
    labelCreated: false,
    trackingNumber: null
  },
  outcomes: {
    completed: 'completed-sale',
    returned: 'returned-item',
    archived: 'archived'
  }
};

window.saleConversionModel = saleConversionModel;
