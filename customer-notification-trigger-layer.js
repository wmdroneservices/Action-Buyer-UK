// Customer Notification Trigger Layer
// Connects workflow changes to customer-facing notifications.

export const CustomerNotificationTriggers = {
  async sendStatusUpdate(customerId, status) {
    return {
      customerId,
      status,
      notification: 'status_update_created'
    };
  },

  async sendOfferNotification(customerId, offerId) {
    return {
      customerId,
      offerId,
      notification: 'offer_ready'
    };
  },

  async requestCustomerInformation(customerId, request) {
    return {
      customerId,
      request,
      notification: 'information_requested'
    };
  },

  async sendCompletionNotification(customerId, purchaseId) {
    return {
      customerId,
      purchaseId,
      notification: 'purchase_completed'
    };
  }
};
