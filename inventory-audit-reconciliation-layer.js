/**
 * Action Buyer UK - Inventory Audit & Stock Reconciliation Layer
 *
 * Ensures physical stock can be reconciled against internal asset records.
 * Serial numbers are treated as the primary uniqueness check where available.
 */

function normaliseSerial(serialNumber) {
  return String(serialNumber || '').trim().toUpperCase();
}

function validateAssetRecord(asset) {
  const issues = [];
  if (!asset.assetId && !asset.id) issues.push('Missing asset ID');
  if (!asset.manufacturer) issues.push('Missing manufacturer');
  if (!asset.model) issues.push('Missing model');
  if (!normaliseSerial(asset.serialNumber)) issues.push('Missing serial number');
  if (!asset.status) issues.push('Missing stock status');
  if (!asset.acquiredAt) issues.push('Missing acquisition date');
  return issues;
}

function findDuplicateSerialNumbers(assets = []) {
  const seen = new Map();
  const duplicates = [];

  assets.forEach((asset) => {
    const serial = normaliseSerial(asset.serialNumber);
    if (!serial) return;

    if (seen.has(serial)) {
      duplicates.push({
        serialNumber: serial,
        assetIds: [seen.get(serial), asset.assetId || asset.id]
      });
    } else {
      seen.set(serial, asset.assetId || asset.id);
    }
  });

  return duplicates;
}

function reconcileInventory({ assets = [], physicalStock = [] } = {}) {
  const recordedIds = new Set(assets.map((asset) => asset.assetId || asset.id));
  const physicalIds = new Set(physicalStock.map((item) => item.assetId || item.id));

  const missingFromPhysical = assets
    .filter((asset) => !physicalIds.has(asset.assetId || asset.id))
    .map((asset) => asset.assetId || asset.id);

  const unrecordedPhysical = physicalStock
    .filter((item) => !recordedIds.has(item.assetId || item.id))
    .map((item) => item.assetId || item.id);

  return {
    recordedCount: assets.length,
    physicalCount: physicalStock.length,
    matchedCount: assets.filter((asset) => physicalIds.has(asset.assetId || asset.id)).length,
    missingFromPhysical,
    unrecordedPhysical,
    reconciled: missingFromPhysical.length === 0 && unrecordedPhysical.length === 0
  };
}

function createInventoryAuditReport(assets = [], physicalStock = []) {
  const validationIssues = assets
    .map((asset) => ({
      assetId: asset.assetId || asset.id || null,
      issues: validateAssetRecord(asset)
    }))
    .filter((item) => item.issues.length > 0);

  return {
    totalAssets: assets.length,
    duplicateSerialNumbers: findDuplicateSerialNumbers(assets),
    validationIssues,
    reconciliation: reconcileInventory({ assets, physicalStock }),
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  normaliseSerial,
  validateAssetRecord,
  findDuplicateSerialNumbers,
  reconcileInventory,
  createInventoryAuditReport
};
