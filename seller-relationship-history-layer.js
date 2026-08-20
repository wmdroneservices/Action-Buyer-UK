/**
 * Action Buyer UK - Seller Relationship History Layer
 *
 * Tracks previous seller interactions and purchase history.
 */

function createSellerProfile({
  sellerId,
  name = null,
  contactDetails = null
}) {
  return {
    sellerId,
    name,
    contactDetails,
    totalPurchases: 0,
    totalSpend: 0,
    averagePurchaseValue: 0,
    reliabilityStatus: 'New',
    createdAt: new Date().toISOString()
  };
}

function recordSellerPurchase({
  sellerProfile,
  purchaseAmount
}) {
  const amount = Number(purchaseAmount) || 0;
  const totalPurchases = sellerProfile.totalPurchases + 1;
  const totalSpend = sellerProfile.totalSpend + amount;

  return {
    ...sellerProfile,
    totalPurchases,
    totalSpend,
    averagePurchaseValue: totalSpend / totalPurchases,
    reliabilityStatus: totalPurchases >= 3 ? 'Repeat Seller' : 'Known Seller'
  };
}

function addSellerNote({
  sellerProfile,
  note
}) {
  return {
    ...sellerProfile,
    notes: [
      ...(sellerProfile.notes || []),
      {
        note,
        createdAt: new Date().toISOString()
      }
    ]
  };
}

function createSellerSummary(sellers = []) {
  return {
    totalSellers: sellers.length,
    repeatSellers: sellers.filter(
      (seller) => seller.reliabilityStatus === 'Repeat Seller'
    ).length,
    totalSellerSpend: sellers.reduce(
      (sum, seller) => sum + (Number(seller.totalSpend) || 0),
      0
    )
  };
}

module.exports = {
  createSellerProfile,
  recordSellerPurchase,
  addSellerNote,
  createSellerSummary
};
