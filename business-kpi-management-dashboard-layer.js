/**
 * Action Buyer UK - Business KPI Management Dashboard Layer
 *
 * Consolidates operational, inventory and resale metrics for internal
 * management reporting. Calculations are advisory and do not modify records.
 */

function createBusinessKpiDashboard({
  assets = [],
  sales = [],
  ledgerEntries = [],
  ageingReport = null
} = {}) {
  const stock = assets.filter((asset) => asset.status !== 'Sold');
  const completedSales = sales.filter((sale) => sale.status === 'Sold');

  const purchaseSpend = ledgerEntries
    .filter((entry) => entry.type === 'Purchase')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expenses = ledgerEntries
    .filter((entry) => entry.type === 'Expense')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const resaleRevenue = ledgerEntries
    .filter((entry) => entry.type === 'Sale')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const grossProfit = resaleRevenue - purchaseSpend - expenses;

  return {
    stockUnits: stock.length,
    soldUnits: completedSales.length,
    purchaseSpend,
    expenses,
    resaleRevenue,
    grossProfit,
    averageProfitPerSale: completedSales.length ? grossProfit / completedSales.length : 0,
    stockPurchaseValue: stock.reduce((sum, asset) => sum + Number(asset.purchasePrice || 0), 0),
    stockAgeing: ageingReport || null,
    generatedAt: new Date().toISOString()
  };
}

function createOutstandingActions({
  ageingReport = null,
  inventoryAudit = null,
  inspections = [],
  listings = []
} = {}) {
  const actions = [];

  if (ageingReport?.pricingReview) {
    actions.push({
      type: 'Pricing Review',
      count: ageingReport.pricingReview,
      priority: 'Medium'
    });
  }

  if (ageingReport?.clearanceReview) {
    actions.push({
      type: 'Clearance Review',
      count: ageingReport.clearanceReview,
      priority: 'High'
    });
  }

  if (inventoryAudit?.duplicateSerialNumbers?.length) {
    actions.push({
      type: 'Duplicate Serial Investigation',
      count: inventoryAudit.duplicateSerialNumbers.length,
      priority: 'High'
    });
  }

  const pendingInspections = inspections.filter((item) => item.status !== 'Completed').length;
  if (pendingInspections) {
    actions.push({ type: 'Pending Inspections', count: pendingInspections, priority: 'Medium' });
  }

  const draftListings = listings.filter((item) => item.status === 'Draft').length;
  if (draftListings) {
    actions.push({ type: 'Draft Listings', count: draftListings, priority: 'Low' });
  }

  return actions;
}

module.exports = {
  createBusinessKpiDashboard,
  createOutstandingActions
};
