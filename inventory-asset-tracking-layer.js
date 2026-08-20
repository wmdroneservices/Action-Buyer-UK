// Inventory and Asset Tracking Layer
// Action Buyer UK internal stock management

const inventoryStatuses = [
  'Purchased',
  'Inspection Pending',
  'Tested',
  'Prepared for Resale',
  'Listed',
  'Sold'
];

function createAssetRecord(asset) {
  return {
    id: asset.id,
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serialNumber,
    purchasePrice: asset.purchasePrice,
    condition: asset.condition,
    accessories: asset.accessories || [],
    status: 'Purchased',
    createdAt: new Date().toISOString()
  };
}

function updateAssetStatus(assetId, status) {
  if (!inventoryStatuses.includes(status)) {
    throw new Error('Invalid inventory status');
  }

  return {
    assetId,
    status,
    updatedAt: new Date().toISOString()
  };
}

function addAccessory(assetId, accessory) {
  return {
    assetId,
    accessory,
    addedAt: new Date().toISOString()
  };
}

function createInventorySummary(asset) {
  return {
    item: `${asset.manufacturer} ${asset.model}`,
    serialNumber: asset.serialNumber,
    condition: asset.condition,
    status: asset.status
  };
}

module.exports = {
  inventoryStatuses,
  createAssetRecord,
  updateAssetStatus,
  addAccessory,
  createInventorySummary
};
