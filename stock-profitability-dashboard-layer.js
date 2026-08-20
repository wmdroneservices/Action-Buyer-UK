/**
 * Action Buyer UK - Stock Profitability Dashboard Layer
 *
 * Internal reporting layer joining acquired assets with resale data.
 */

function calculateAssetEconomics({
  purchasePrice = 0,
  preparationCosts = 0,
  otherCosts = 0,
  expectedSalePrice = 0,
  actualSalePrice = null
}) {
  const purchase = Number(purchasePrice) || 0;
  const preparation = Number(preparationCosts) || 0;
  const other = Number(otherCosts) || 0;
  const expected = Number(expectedSalePrice) || 0;
  const sale = actualSalePrice === null ? null : Number(actualSalePrice);
  const totalCost = purchase + preparation + other;

  return {
    purchasePrice: purchase,
    preparationCosts: preparation,
    otherCosts: other,
    totalCost,
    expectedSalePrice: expected,
    expectedProfit: expected - totalCost,
    actualSalePrice: sale,
    actualProfit: sale === null ? null : sale - totalCost
  };
}

function createStockDashboard(assets = [], sales = []) {
  const stock = assets.filter((asset) => asset.status !== 'Sold');
  const sold = assets.filter((asset) => asset.status === 'Sold');

  const stockCost = stock.reduce((sum, asset) => sum + (Number(asset.purchasePrice) || 0), 0);
  const soldCost = sold.reduce((sum, asset) => sum + (Number(asset.purchasePrice) || 0), 0);
  const resaleRevenue = sales
    .filter((sale) => sale.status === 'Sold')
    .reduce((sum, sale) => sum + (Number(sale.salePrice) || 0), 0);

  return {
    stockUnits: stock.length,
    soldUnits: sold.length,
    stockCost,
    soldCost,
    resaleRevenue,
    grossProfit: resaleRevenue - soldCost,
    averageStockCost: stock.length ? stockCost / stock.length : 0
  };
}

function calculateStockTurnover({ purchasedUnits = 0, soldUnits = 0 }) {
  const purchased = Number(purchasedUnits) || 0;
  const sold = Number(soldUnits) || 0;
  return purchased > 0 ? (sold / purchased) * 100 : 0;
}

function rankStockByExpectedProfit(assets = []) {
  return [...assets].sort(
    (a, b) => (Number(b.expectedProfit) || 0) - (Number(a.expectedProfit) || 0)
  );
}

module.exports = {
  calculateAssetEconomics,
  createStockDashboard,
  calculateStockTurnover,
  rankStockByExpectedProfit
};
