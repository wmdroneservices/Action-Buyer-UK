// Shipping and Archive Model
// Foundation for completed sales, shipping tracking, and archive records.

const shippingArchiveModel = {
  shipping: {
    saleId: null,
    carrier: null,
    trackingNumber: null,
    labelCreated: false,
    dispatchedAt: null,
    deliveredAt: null
  },

  archive: {
    saleId: null,
    status: 'active',
    completedAt: null,
    archivedAt: null,
    retentionNotes: null
  },

  statuses: [
    'awaiting-arrival',
    'inspection-complete',
    'payment-complete',
    'shipping-created',
    'dispatched',
    'delivered',
    'archived'
  ]
};

export default shippingArchiveModel;
