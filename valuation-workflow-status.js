// Valuation workflow status definitions
// Keeps staff review, offer and sales stages consistent.

const valuationWorkflowStatus = {
  quoteReceived: 'quote_received',
  underReview: 'under_review',
  researchingPrice: 'researching_price',
  offerPrepared: 'offer_prepared',
  offerSent: 'offer_sent',
  customerAccepted: 'customer_accepted',
  customerRefused: 'customer_refused',
  awaitingArrival: 'awaiting_arrival',
  inspectionComplete: 'inspection_complete',
  completedSale: 'completed_sale',
  returnedItem: 'returned_item',
  archived: 'archived'
};

function getNextValuationStatus(currentStatus, action) {
  const transitions = {
    quote_received: { review: 'under_review' },
    under_review: { research: 'researching_price', prepareOffer: 'offer_prepared' },
    offer_prepared: { send: 'offer_sent' },
    offer_sent: { accept: 'customer_accepted', refuse: 'customer_refused' },
    customer_accepted: { ship: 'awaiting_arrival' },
    awaiting_arrival: { inspect: 'inspection_complete' },
    inspection_complete: { complete: 'completed_sale' }
  };

  return transitions[currentStatus]?.[action] || currentStatus;
}

window.valuationWorkflowStatus = valuationWorkflowStatus;
window.getNextValuationStatus = getNextValuationStatus;
