// Customer Quote Status Timeline Component
// Displays the customer's quote progress through each workflow stage.

const quoteStages = [
  { id: 'submitted', label: 'Quote Submitted' },
  { id: 'review', label: 'Under Review' },
  { id: 'valuation', label: 'Valuation Complete' },
  { id: 'offer', label: 'Offer Sent' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'completed', label: 'Completed' }
];

function getTimelineStatus(currentStatus) {
  const currentIndex = quoteStages.findIndex(
    stage => stage.id === currentStatus
  );

  return quoteStages.map((stage, index) => ({
    ...stage,
    completed: index < currentIndex,
    current: index === currentIndex,
    pending: index > currentIndex
  }));
}

function createQuoteTimeline(quote) {
  return {
    quoteId: quote.id,
    status: quote.status,
    timeline: getTimelineStatus(quote.status),
    updatedAt: new Date().toISOString()
  };
}

module.exports = {
  quoteStages,
  getTimelineStatus,
  createQuoteTimeline
};
