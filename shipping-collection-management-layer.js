// Shipping and Collection Management Layer
// Handles collection scheduling, courier tracking and handover confirmation.

function createCollectionRecord(data) {
  return {
    quoteId: data.quoteId,
    customerId: data.customerId,
    collectionDate: data.collectionDate || null,
    status: 'pending'
  };
}

function updateDeliveryStatus(status) {
  return {
    status,
    updatedAt: new Date().toISOString()
  };
}

function addTrackingReference(reference) {
  return {
    trackingReference: reference,
    trackingAdded: true
  };
}

function confirmHandover(details) {
  return {
    confirmed: true,
    confirmationDetails: details,
    completedAt: new Date().toISOString()
  };
}

module.exports = {
  createCollectionRecord,
  updateDeliveryStatus,
  addTrackingReference,
  confirmHandover
};
