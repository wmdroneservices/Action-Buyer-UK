// Activity Notification Centre Layer
// Provides a unified notification feed for customer and admin actions.

const notificationTypes = {
  MESSAGE: "message",
  STATUS_CHANGE: "status_change",
  OFFER_UPDATE: "offer_update",
  DOCUMENT_REQUEST: "document_request",
  PAYMENT_UPDATE: "payment_update"
};

function createNotification(userId, type, title, message, referenceId) {
  return {
    userId,
    type,
    title,
    message,
    referenceId,
    read: false,
    createdAt: new Date().toISOString()
  };
}

function getUnreadNotifications(notifications, userId) {
  return notifications.filter(
    notification => notification.userId === userId && !notification.read
  );
}

function markNotificationRead(notification) {
  return {
    ...notification,
    read: true,
    readAt: new Date().toISOString()
  };
}

module.exports = {
  notificationTypes,
  createNotification,
  getUnreadNotifications,
  markNotificationRead
};
