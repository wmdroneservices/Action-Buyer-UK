/**
 * Action Buyer UK - Inventory Location & Movement Layer
 *
 * Tracks where each acquired asset is physically located and records movement
 * history for internal stock control.
 */

const LOCATION_STATUSES = Object.freeze([
  'Received Area',
  'Testing Bench',
  'Storage',
  'Photography',
  'Dispatch',
  'Sold / Awaiting Handover'
]);

function createLocationRecord({ assetId, location, movedAt = new Date().toISOString(), movedBy = null, note = null }) {
  if (!assetId) throw new Error('assetId is required');
  if (!location) throw new Error('location is required');

  return {
    assetId,
    location,
    movedAt,
    movedBy,
    note
  };
}

function moveAsset(asset, { location, movedBy = null, note = null, movedAt = new Date().toISOString() }) {
  if (!asset || !(asset.assetId || asset.id)) throw new Error('asset with an ID is required');
  if (!location) throw new Error('location is required');

  const movement = createLocationRecord({
    assetId: asset.assetId || asset.id,
    location,
    movedAt,
    movedBy,
    note
  });

  return {
    ...asset,
    currentLocation: location,
    lastMovedAt: movedAt,
    movementHistory: [...(asset.movementHistory || []), movement]
  };
}

function getCurrentLocation(asset) {
  return asset?.currentLocation || null;
}

function getMovementHistory(asset) {
  return [...(asset?.movementHistory || [])];
}

function createLocationSummary(assets = []) {
  return assets.reduce((summary, asset) => {
    const location = getCurrentLocation(asset) || 'Unknown';
    summary[location] = (summary[location] || 0) + 1;
    return summary;
  }, {});
}

module.exports = {
  LOCATION_STATUSES,
  createLocationRecord,
  moveAsset,
  getCurrentLocation,
  getMovementHistory,
  createLocationSummary
};
