// Returns and dispute workflow layer
// Handles post-inspection exceptions and customer resolution flow.

const RETURN_STATUSES = {
  OPEN: 'open',
  INSPECTION_FAILED: 'inspection_failed',
  CUSTOMER_NOTIFIED: 'customer_notified',
  RETURN_REQUESTED: 'return_requested',
  ITEM_RETURNED: 'item_returned',
  RESOLVED: 'resolved'
};

function createReturnCase(quoteId, reason) {
  return {
    quoteId,
    reason,
    status: RETURN_STATUSES.OPEN,
    createdAt: new Date().toISOString()
  };
}

function failInspection(caseData, notes) {
  return {
    ...caseData,
    status: RETURN_STATUSES.INSPECTION_FAILED,
    notes
  };
}

function completeReturn(caseData) {
  return {
    ...caseData,
    status: RETURN_STATUSES.RESOLVED,
    resolvedAt: new Date().toISOString()
  };
}

module.exports = {
  RETURN_STATUSES,
  createReturnCase,
  failInspection,
  completeReturn
};
