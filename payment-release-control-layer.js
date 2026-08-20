// Payment Release Control Layer
// Ensures payment cannot be completed before inspection approval.

const PAYMENT_STATES = {
  HOLD: 'hold',
  READY: 'ready_for_payment',
  COMPLETED: 'payment_completed',
  BLOCKED: 'blocked'
};

function canReleasePayment(item) {
  if (!item) return false;

  return (
    item.inspectionStatus === 'approved' &&
    item.verificationComplete === true &&
    item.finalOfferApproved === true
  );
}

function getPaymentState(item) {
  if (!canReleasePayment(item)) {
    return PAYMENT_STATES.HOLD;
  }

  if (item.paymentCompleted === true) {
    return PAYMENT_STATES.COMPLETED;
  }

  return PAYMENT_STATES.READY;
}

module.exports = {
  PAYMENT_STATES,
  canReleasePayment,
  getPaymentState
};
