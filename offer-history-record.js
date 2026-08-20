// Offer history record structure
// Keeps every offer change instead of overwriting previous values.

const offerHistoryRecord = {
  offerId: null,
  quoteItemId: null,
  customerId: null,
  previousAmount: null,
  newAmount: null,
  changedBy: null,
  changeReason: null,
  status: 'created',
  createdAt: null
};

function createOfferHistoryEntry(data = {}) {
  return {
    ...offerHistoryRecord,
    ...data,
    createdAt: data.createdAt || new Date().toISOString()
  };
}

window.offerHistoryRecord = offerHistoryRecord;
window.createOfferHistoryEntry = createOfferHistoryEntry;
