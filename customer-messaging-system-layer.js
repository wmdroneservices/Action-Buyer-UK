// Customer Messaging System Layer
// Provides quote-linked communication between customers and administrators.

const messageTypes = {
  CUSTOMER_MESSAGE: 'customer_message',
  ADMIN_MESSAGE: 'admin_message',
  INFORMATION_REQUEST: 'information_request',
  SYSTEM_UPDATE: 'system_update'
};

function createMessage({ quoteId, senderId, message, type }) {
  return {
    quoteId,
    senderId,
    message,
    type: type || messageTypes.CUSTOMER_MESSAGE,
    createdAt: new Date().toISOString(),
    read: false
  };
}

function getQuoteMessages(messages, quoteId) {
  return messages.filter(message => message.quoteId === quoteId);
}

function markMessageRead(message) {
  return {
    ...message,
    read: true
  };
}

module.exports = {
  messageTypes,
  createMessage,
  getQuoteMessages,
  markMessageRead
};
