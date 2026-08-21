/**
 * GearCashOut - Pre-Purchase Quote Return Workflow
 *
 * This is deliberately separate from post-sale customer returns. A drone that
 * the customer does not sell to us remains the customer's property and must
 * never become inventory stock.
 */
const QUOTE_RETURN_STATES = Object.freeze([
  'Quote Offered',
  'Quote Accepted',
  'Quote Declined',
  'Return Required',
  'Return Arranged',
  'Returned to Customer',
  'Case Closed'
]);

const QUOTE_RETURN_TRANSITIONS = Object.freeze({
  'Quote Offered': ['Quote Accepted', 'Quote Declined'],
  'Quote Accepted': [],
  'Quote Declined': ['Return Required'],
  'Return Required': ['Return Arranged', 'Returned to Customer'],
  'Return Arranged': ['Returned to Customer'],
  'Returned to Customer': ['Case Closed'],
  'Case Closed': []
});

function canTransitionQuoteReturn(from, to) {
  return QUOTE_RETURN_STATES.includes(from) && (QUOTE_RETURN_TRANSITIONS[from] || []).includes(to);
}

function transitionQuoteReturn(caseRecord, nextState, metadata = {}) {
  if (!caseRecord || !canTransitionQuoteReturn(caseRecord.status, nextState)) {
    throw new Error(`Invalid quote return transition: ${caseRecord?.status || 'Unknown'} -> ${nextState}`);
  }

  return {
    ...caseRecord,
    status: nextState,
    previousStatus: caseRecord.status,
    statusChangedAt: new Date().toISOString(),
    statusChangedBy: metadata.changedBy || null,
    reason: metadata.reason || null
  };
}

function isCustomerProperty(caseRecord) {
  return caseRecord?.status !== 'Quote Accepted';
}

function canCreateInventoryAsset(caseRecord) {
  return caseRecord?.status === 'Quote Accepted';
}

if (typeof window !== 'undefined') {
  window.QuoteReturnWorkflow = {
    QUOTE_RETURN_STATES,
    QUOTE_RETURN_TRANSITIONS,
    canTransitionQuoteReturn,
    transitionQuoteReturn,
    isCustomerProperty,
    canCreateInventoryAsset
  };
}

if (typeof module !== 'undefined') module.exports = {
  QUOTE_RETURN_STATES,
  QUOTE_RETURN_TRANSITIONS,
  canTransitionQuoteReturn,
  transitionQuoteReturn,
  isCustomerProperty,
  canCreateInventoryAsset
};
