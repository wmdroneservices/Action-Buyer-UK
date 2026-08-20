// Payment Processing Integration Layer
// Provides the structure for purchase payments, transaction tracking,
// refunds and payment status management.

const paymentStatus = {
  pending: 'pending',
  authorised: 'authorised',
  paid: 'paid',
  refunded: 'refunded',
  failed: 'failed'
};

function createPaymentRecord(payment) {
  return {
    quoteId: payment.quoteId,
    customerId: payment.customerId,
    amount: payment.amount,
    status: paymentStatus.pending,
    createdAt: new Date().toISOString()
  };
}

function updatePaymentStatus(paymentId, status) {
  return {
    paymentId,
    status,
    updatedAt: new Date().toISOString()
  };
}

function createRefundRecord(paymentId, amount, reason) {
  return {
    paymentId,
    amount,
    reason,
    status: paymentStatus.refunded,
    createdAt: new Date().toISOString()
  };
}

function getTransactionHistory(customerId) {
  return {
    customerId,
    transactions: []
  };
}

module.exports = {
  createPaymentRecord,
  updatePaymentStatus,
  createRefundRecord,
  getTransactionHistory
};
