/**
 * GearCashOut - Inventory Asset State Machine
 * Browser-safe and Node-compatible.
 */

const ASSET_STATES = Object.freeze([
  'Awaiting Receipt', 'Received', 'Inspection Required', 'Testing',
  'Repair Required', 'Ready for Resale', 'Sent to Sales', 'Listed', 'Reserved', 'Sold', 'Returned',
  'Dispatched', 'Completed', 'Held', 'Written Off'
]);

const TRANSITIONS = Object.freeze({
  'Awaiting Receipt': ['Received', 'Held'],
  'Received': ['Inspection Required', 'Held'],
  'Inspection Required': ['Testing', 'Repair Required', 'Held'],
  'Testing': ['Ready for Resale', 'Repair Required', 'Held'],
  'Repair Required': ['Testing', 'Held', 'Written Off'],
  'Ready for Resale': ['Sent to Sales', 'Held'],
  'Sent to Sales': ['Listed', 'Held'],
  'Listed': ['Reserved', 'Sold', 'Sent to Sales', 'Held'],
  'Reserved': ['Listed', 'Sold', 'Sent to Sales', 'Held'],
  'Sold': ['Returned', 'Dispatched', 'Held'],
  'Returned': [],
  'Dispatched': ['Completed', 'Held'],
  'Completed': [],
  'Held': ['Awaiting Receipt', 'Received', 'Inspection Required', 'Testing', 'Repair Required', 'Ready for Resale', 'Sent to Sales', 'Listed', 'Written Off'],
  'Written Off': []
});

const NEXT_ACTIONS = Object.freeze({
  'Awaiting Receipt': { label: 'AWAITING RECEIPT', detail: 'Wait for the customer item to arrive.', tone: 'info' },
  'Received': { label: 'READY FOR INSPECTION', detail: 'Inspect the item and record its staff condition.', tone: 'action' },
  'Inspection Required': { label: 'READY FOR TESTING', detail: 'Complete inspection, then move the item into Testing.', tone: 'action' },
  'Testing': { label: 'TESTING REQUIRED', detail: 'Test the item and record the result.', tone: 'action' },
  'Repair Required': { label: 'REPAIR REQUIRED', detail: 'Repair the item before returning it to Testing.', tone: 'warning' },
  'Ready for Resale': { label: 'READY TO SEND TO SALES', detail: 'Complete preparation, then use Send to Sales.', tone: 'action' },
  'Sent to Sales': { label: 'READY TO LIST FOR SALE', detail: 'Create and publish the required sales-channel listing.', tone: 'action' },
  'Listed': { label: 'LISTED — AWAITING SALE', detail: 'Monitor active listings and respond to reservations or sales.', tone: 'info' },
  'Reserved': { label: 'RESERVED — SALE IN PROGRESS', detail: 'Complete the sale or return the item to Listed if the reservation ends.', tone: 'info' },
  'Sold': { label: 'SOLD — NEXT STEP: DISPATCH', detail: 'Dispatch the sold item and record the shipment.', tone: 'action' },
  'Returned': { label: 'RETURNED', detail: 'Review the return and decide the next controlled disposition.', tone: 'warning' },
  'Dispatched': { label: 'AWAITING COMPLETION', detail: 'Confirm completion when the transaction is finished.', tone: 'info' },
  'Completed': { label: 'COMPLETE', detail: 'No further action required.', tone: 'success' },
  'Held': { label: 'HELD — REVIEW REQUIRED', detail: 'Review why the item is held and choose the appropriate next state.', tone: 'warning' },
  'Written Off': { label: 'WRITTEN OFF', detail: 'No further workflow action required.', tone: 'warning' }
});

function isValidState(state) { return ASSET_STATES.includes(state); }
function canTransition(from, to) { return isValidState(from) && isValidState(to) && TRANSITIONS[from].includes(to); }
function getNextAction(state) { return NEXT_ACTIONS[state] || { label: 'ACTION REQUIRED', detail: 'Review this item and determine its next workflow step.', tone: 'warning' }; }

function transitionAsset(asset, nextState, metadata = {}) {
  if (!asset) throw new Error('asset is required');
  const currentState = asset.status || 'Awaiting Receipt';
  if (!canTransition(currentState, nextState)) throw new Error(`Invalid asset transition: ${currentState} -> ${nextState}`);
  return {
    ...asset,
    status: nextState,
    previous_status: currentState,
    status_changed_at: new Date().toISOString(),
    status_change_reason: metadata.reason || null,
    status_changed_by: metadata.changedBy || null
  };
}

function getAllowedNextStates(state) { return isValidState(state) ? [...TRANSITIONS[state]] : []; }
function getLifecycleProgress(state) {
  const milestones = ['Received', 'Testing', 'Ready for Resale', 'Sent to Sales', 'Listed', 'Sold', 'Returned', 'Dispatched', 'Completed'];
  if (state === 'Awaiting Receipt') return 0;
  const index = milestones.indexOf(state);
  return index < 0 ? null : Math.round(((index + 1) / milestones.length) * 100);
}

const API = { ASSET_STATES, TRANSITIONS, NEXT_ACTIONS, isValidState, canTransition, getNextAction, transitionAsset, getAllowedNextStates, getLifecycleProgress };
if (typeof window !== 'undefined') window.AssetStateMachine = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
