// Email Notification Service Layer
// Handles customer email events triggered by quote workflow changes.

export const EmailNotificationService = {
  async sendQuoteReceivedEmail(customer, quoteId) {
    return {
      type: 'quote_received',
      customer,
      quoteId,
      status: 'queued'
    };
  },

  async sendOfferEmail(customer, offerData) {
    return {
      type: 'offer_ready',
      customer,
      offerData,
      status: 'queued'
    };
  },

  async sendInformationRequest(customer, requestData) {
    return {
      type: 'information_required',
      customer,
      requestData,
      status: 'queued'
    };
  },

  async sendCompletionEmail(customer, purchaseData) {
    return {
      type: 'purchase_completed',
      customer,
      purchaseData,
      status: 'queued'
    };
  }
};
