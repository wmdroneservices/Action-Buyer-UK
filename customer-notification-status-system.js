// Customer notification status system
// Controls customer-facing updates during the quote lifecycle.

const customerStatuses = {
  received: {
    title: 'Quote received',
    message: 'Your quote has been received and is waiting for review.'
  },
  reviewing: {
    title: 'Quote under review',
    message: 'We are checking your item details and current market value.'
  },
  offer_ready: {
    title: 'Offer ready',
    message: 'Your offer has been prepared and is ready for your response.'
  },
  verification: {
    title: 'Verification stage',
    message: 'Your item is being checked before final confirmation.'
  },
  completed: {
    title: 'Purchase completed',
    message: 'Your purchase has been completed.'
  }
};

function getCustomerStatus(status) {
  return customerStatuses[status] || null;
}

module.exports = {
  customerStatuses,
  getCustomerStatus
};
