/**
 * Action Buyer UK - Duplicate Sale Protection Layer
 *
 * Prevents one physical asset from remaining sellable across multiple channels
 * after a reservation or completed sale. It returns actions for adapters/UI to
 * apply; it does not directly call external marketplaces.
 */

function getActiveListingsForAsset(listings = [], assetId) {
  return listings.filter((listing) =>
    listing.assetId === assetId &&
    ['Draft', 'Ready', 'Published', 'Reserved'].includes(listing.status)
  );
}

function createSaleLock(asset, sale = {}) {
  const assetId = asset?.assetId || asset?.id;
  if (!assetId) throw new Error('asset with an ID is required');
  if (!sale.saleId) throw new Error('saleId is required');

  return {
    assetId,
    saleId: sale.saleId,
    status: sale.status || 'Reserved',
    lockedAt: sale.lockedAt || new Date().toISOString()
  };
}

function createListingClosurePlan({ listings = [], assetId, saleStatus = 'Reserved' } = {}) {
  const activeListings = getActiveListingsForAsset(listings, assetId);

  return activeListings.map((listing) => ({
    listingId: listing.listingId || listing.listingReference || null,
    channel: listing.channel,
    currentStatus: listing.status,
    nextStatus: saleStatus === 'Sold' ? 'Removed' : 'Reserved',
    reason: saleStatus === 'Sold'
      ? 'Asset sold through another channel'
      : 'Asset reserved through another channel'
  }));
}

function checkDuplicateSaleRisk({ asset, sale, listings = [] } = {}) {
  const assetId = asset?.assetId || asset?.id;
  if (!assetId) throw new Error('asset with an ID is required');

  const activeListings = getActiveListingsForAsset(listings, assetId);
  const alreadySold = asset?.status === 'Sold' || sale?.status === 'Sold';
  const alreadyReserved = asset?.status === 'Reserved' || sale?.status === 'Reserved';

  return {
    assetId,
    risk: alreadySold ? 'HIGH' : alreadyReserved ? 'MEDIUM' : 'LOW',
    alreadySold,
    alreadyReserved,
    activeListingCount: activeListings.length,
    requiresListingClosure: alreadySold || alreadyReserved
  };
}

module.exports = {
  getActiveListingsForAsset,
  createSaleLock,
  createListingClosurePlan,
  checkDuplicateSaleRisk
};
