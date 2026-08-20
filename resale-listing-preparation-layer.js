// Resale Listing Preparation Layer
// Converts tested inventory assets into marketplace-ready listings.

const LISTING_STATUS = {
  DRAFT: 'Draft',
  READY: 'Ready For Listing',
  PUBLISHED: 'Published',
  SOLD: 'Sold'
};

function createResaleListing(asset) {
  return {
    assetId: asset.id,
    title: `${asset.manufacturer} ${asset.model}`,
    description: generateListingDescription(asset),
    condition: asset.condition,
    accessories: asset.accessories || [],
    testReport: asset.testReport || null,
    status: LISTING_STATUS.DRAFT,
    createdAt: new Date().toISOString()
  };
}

function generateListingDescription(asset) {
  return {
    overview: `${asset.manufacturer} ${asset.model} professionally tested and prepared for resale.`,
    condition: asset.condition,
    includedItems: asset.accessories || [],
    verification: 'Tested by Action Buyer UK'
  };
}

function attachTestReport(listing, report) {
  return {
    ...listing,
    testReport: report
  };
}

function updateListingStatus(listing, status) {
  return {
    ...listing,
    status
  };
}

module.exports = {
  createResaleListing,
  generateListingDescription,
  attachTestReport,
  updateListingStatus,
  LISTING_STATUS
};
