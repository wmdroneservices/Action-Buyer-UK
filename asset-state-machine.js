/**
 * Action Buyer UK - Inventory Asset State Machine
 *
 * Keeps lifecycle transitions explicit and prevents contradictory asset states.
 */

const ASSET_STATES = Object.freeze([
  'Awaiting Receipt',
  'Received',
  'Inspection Required',
  'Testing',
  'Repair Required',
  'Ready for Resale',
  'Listed',
  'Reserved',
  'Sold',
  'Dispatched',
  'Completed',
  'Held',
  'Written Off'
]);

const TRANSITIONS = Object.freeze({
  'Awaiting Receipt': ['Received', 'Held'],
  'Received': ['Inspection Required', 'Held'],
  'Inspection Required': ['Testing', 'Repair Required', 'Held'],
  'Testing': ['Ready for Resale', 'Repair Required', 'Held'],
  'Repair Required': ['Testing', 'Held', 'Written Off'],
  'Ready for Resale': ['Listed', 'Held'],
  'Listed': ['Reserved', 'Sold', 'Held'],
  'Reserved': ['Listed', 'Sold', 'Held'],
  'Sold': ['Dispatched', 'Held'],
  'Dispatched': ['Completed', 'Held'],
  'Completed': [],
  'Held': ['Awaiting Receipt', 'Received', 'Inspection Required', 'Testing', 'Repair Required', 'Ready for Resale', 'Listed', 'Written Off'],
  'Written Off': []
});

function isValidState(state) {
  return ASSET_STATES.includes(state);
}

function canTransition(from, to) {
  return isValidState(from) && isValidState(to) && (TRANSITIONS[from] || []).includes(to);
}

function transitionAsset(asset, nextState, metadata = {}) {
  if (!asset) throw new Error('asset is required');
  const currentState = asset.status || 'Awaiting Receipt';

  if (!canTransition(currentState, nextState)) {
    throw new Error(`Invalid asset transition: ${currentState} -> ${nextState}`);
  }

  return {
    ...asset,
    status: nextState,
    previous_status: currentState,
    status_changed_at: new Date().toISOString(),
    status_change_reason: metadata.reason || null,
    status_changed_by: metadata.changedBy || null
  };
}

function getAllowedNextStates(state) {
  if (!isValidState(state)) return [];
  return [...TRANSITIONS[state]];
}

function getLifecycleProgress(state) {
  const milestones = ['Received', 'Testing', 'Ready for Resale', 'Listed', 'Sold', 'Dispatched', 'Completed'];
  const index = milestones.indexOf(state);
  if (state === 'Awaiting Receipt') return 0;
  if (index < 0) return null;
  return Math.round(((index + 1) / milestones.length) * 100);
}

module.exports = {
  ASSET_STATES,
  TRANSITIONS,
  isValidState,
  canTransition,
  transitionAsset,
  getAllowedNextStates,
  getLifecycleProgress
};
