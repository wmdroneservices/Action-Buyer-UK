// Customer History Model
// Prepares customer backend structure.
// Designed for future database integration.

const customerHistoryModel = {
  customer: {
    id: null,
    name: '',
    email: '',
    phone: '',
    address: null
  },

  history: {
    quotes: [],
    acceptedOffers: [],
    refusedOffers: [],
    completedSales: [],
    returnedItems: []
  },

  permissions: {
    storePaymentDetails: false,
    paymentDetailsRetention: null
  }
};

if (typeof window !== 'undefined') {
  window.customerHistoryModel = customerHistoryModel;
}

export default customerHistoryModel;
