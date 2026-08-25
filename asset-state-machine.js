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

function isValidState(state) { return ASSET_STATES.includes(state); }
function canTransition(from, to) { return isValidState(from) && isValidState(to) && TRANSITIONS[from].includes(to); }

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

const API = { ASSET_STATES, TRANSITIONS, isValidState, canTransition, transitionAsset, getAllowedNextStates, getLifecycleProgress };
if (typeof window !== 'undefined') window.AssetStateMachine = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
