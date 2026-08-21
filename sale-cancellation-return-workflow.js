/**
 * GearCashOut - Cancellation & Return Workflow
 *
 * Keeps sale cancellation/return handling explicit and prevents an asset
 * from becoming available again without a controlled inspection.
 */
const RETURN_STATES = Object.freeze(['Cancellation Requested','Cancelled','Return Received','Return Inspection Required','Returned to Stock','Written Off']);

const RETURN_TRANSITIONS = Object.freeze({
  'Cancellation Requested': ['Cancelled','Return Received'],
  'Cancelled': [],
  'Return Received': ['Return Inspection Required'],
  'Return Inspection Required': ['Returned to Stock','Written Off'],
  'Returned to Stock': [],
  'Written Off': []
});

function canTransitionReturn(from, to) {
  return RETURN_STATES.includes(from) && (RETURN_TRANSITIONS[from] || []).includes(to);
}

function createReturnCase({ saleId, assetId, reason, requestedBy } = {}) {
  if (!saleId) throw new Error('saleId is required');
  if (!assetId) throw new Error('assetId is required');
  if (!reason) throw new Error('return reason is required');
  if (!requestedBy) throw new Error('requestedBy is required');
  return { saleId, assetId, reason, requestedBy, status: 'Cancellation Requested', createdAt: new Date().toISOString() };
}

function transitionReturn(returnCase, nextState, metadata = {}) {
  if (!returnCase || !canTransitionReturn(returnCase.status, nextState)) {
    throw new Error(`Invalid return transition: ${returnCase?.status || 'Unknown'} -> ${nextState}`);
  }
  return {
    ...returnCase,
    status: nextState,
    previousStatus: returnCase.status,
    statusChangedAt: new Date().toISOString(),
    statusChangedBy: metadata.changedBy || null,
    notes: metadata.notes || null
  };
}

function assetStatusAfterReturn(returnState) {
  if (returnState === 'Returned to Stock') return 'Inspection Required';
  if (returnState === 'Written Off') return 'Written Off';
  if (returnState === 'Cancelled') return 'Listed';
  return null;
}

if (typeof window !== 'undefined') window.SaleCancellationReturns = { RETURN_STATES, RETURN_TRANSITIONS, canTransitionReturn, createReturnCase, transitionReturn, assetStatusAfterReturn };
if (typeof module !== 'undefined') module.exports = { RETURN_STATES, RETURN_TRANSITIONS, canTransitionReturn, createReturnCase, transitionReturn, assetStatusAfterReturn };
