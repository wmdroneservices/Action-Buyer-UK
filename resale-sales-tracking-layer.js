/**
 * Action Buyer UK - Resale Sales Tracking Layer
 *
 * Internal resale-side records only. Action Buyer UK buys items from sellers
 * and may subsequently resell acquired stock. This layer tracks the resale
 * transaction without changing the seller purchase workflow.
 */

const SALE_STATUSES = Object.freeze([
  'Draft',
  'Listed',
  'Reserved',
  'Sold',
  'Cancelled'
]);

function createResaleSale({
  assetId,
  listingId = null,
  buyerId = null,
  salesChannel,
  salePrice,
  saleDate = new Date().toISOString(),
  additionalCosts = 0
}) {
  if (!assetId) throw new Error('assetId is required');
  if (!salesChannel) throw new Error('salesChannel is required');
  if (!Number.isFinite(Number(salePrice)) || Number(salePrice) < 0) {
    throw new Error('salePrice must be a non-negative number');
  }

  const price = Number(salePrice);
  const costs = Number(additionalCosts) || 0;

  return {
    assetId,
    listingId,
    buyerId,
    salesChannel,
    salePrice: price,
    additionalCosts: costs,
    grossMarginBeforeFees: null,
    saleDate,
    status: 'Sold',
    createdAt: new Date().toISOString()
  };
}

function calculateResaleProfit({ purchasePrice, salePrice, additionalCosts = 0 }) {
  const purchase = Number(purchasePrice) || 0;
  const sale = Number(salePrice) || 0;
  const costs = Number(additionalCosts) || 0;

  return {
    purchasePrice: purchase,
    salePrice: sale,
    additionalCosts: costs,
    grossProfit: sale - purchase - costs
  };
}

function calculateMarginPercentage({ purchasePrice, salePrice, additionalCosts = 0 }) {
  const purchase = Number(purchasePrice) || 0;
  const sale = Number(salePrice) || 0;
  const costs = Number(additionalCosts) || 0;
  const profit = sale - purchase - costs;

  return sale > 0 ? (profit / sale) * 100 : 0;
}

function createSalesSummary(sales = []) {
  const completed = sales.filter((sale) => sale.status === 'Sold');
  const totalSales = completed.reduce((sum, sale) => sum + (Number(sale.salePrice) || 0), 0);
  const totalCosts = completed.reduce(
    (sum, sale) => sum + (Number(sale.purchasePrice) || 0) + (Number(sale.additionalCosts) || 0),
    0
  );

  return {
    numberOfSales: completed.length,
    totalSalesValue: totalSales,
    totalCosts,
    grossProfit: totalSales - totalCosts,
    averageSaleValue: completed.length ? totalSales / completed.length : 0
  };
}

module.exports = {
  SALE_STATUSES,
  createResaleSale,
  calculateResaleProfit,
  calculateMarginPercentage,
  createSalesSummary
};
