/**
 * Action Buyer UK - Resale Financial Ledger Layer
 *
 * Consolidates acquisition, preparation expenses and resale income into a
 * transaction-level financial view for internal management reporting.
 */

const ENTRY_TYPES = Object.freeze([
  'Purchase',
  'Expense',
  'Sale'
]);

function createLedgerEntry({
  assetId,
  type,
  amount,
  description = null,
  reference = null,
  date = new Date().toISOString()
}) {
  if (!assetId) throw new Error('assetId is required');
  if (!ENTRY_TYPES.includes(type)) throw new Error('Invalid ledger entry type');

  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('amount must be a non-negative number');
  }

  return {
    assetId,
    type,
    amount: value,
    description,
    reference,
    date,
    createdAt: new Date().toISOString()
  };
}

function calculateAssetLedger(entries = [], assetId) {
  const assetEntries = entries.filter((entry) => entry.assetId === assetId);
  const purchaseCost = assetEntries
    .filter((entry) => entry.type === 'Purchase')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expenses = assetEntries
    .filter((entry) => entry.type === 'Expense')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const salesRevenue = assetEntries
    .filter((entry) => entry.type === 'Sale')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    assetId,
    purchaseCost,
    expenses,
    totalCost: purchaseCost + expenses,
    salesRevenue,
    grossProfit: salesRevenue - purchaseCost - expenses
  };
}

function createFinancialSummary(entries = []) {
  const purchaseCost = entries
    .filter((entry) => entry.type === 'Purchase')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expenses = entries
    .filter((entry) => entry.type === 'Expense')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const salesRevenue = entries
    .filter((entry) => entry.type === 'Sale')
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    purchaseCost,
    expenses,
    totalCosts: purchaseCost + expenses,
    salesRevenue,
    grossProfit: salesRevenue - purchaseCost - expenses,
    entryCount: entries.length
  };
}

module.exports = {
  ENTRY_TYPES,
  createLedgerEntry,
  calculateAssetLedger,
  createFinancialSummary
};
