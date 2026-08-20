// Return Management Model
// Foundation for tracking returned items separately from active sales.

const returnManagementModel = {
  returnId: null,
  saleId: null,
  customerId: null,
  quoteItemId: null,

  status: 'requested',
  reasons: [
    'customer_declined',
    'inspection_failed',
    'condition_mismatch',
    'payment_issue',
    'other'
  ],

  inspection: {
    receivedDate: null,
    notes: '',
    photosVerified: false,
    conditionChecked: false
  },

  resolution: {
    action: null,
    refundStatus: null,
    archived: false
  }
};

export default returnManagementModel;
