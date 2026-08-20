/**
 * Action Buyer UK - Purchase Expense Tracking Layer
 * Tracks real acquisition costs attached to individual drone assets.
 */

const EXPENSE_TYPES = Object.freeze([
  'Collection',
  'Postage',
  'Accessories',
  'Replacement Parts',
  'Cleaning',
  'Testing',
  'Preparation',
  'Other'
]);

function createExpenseRecord({
  assetId,
  expenseType,
  amount,
  description = '',
  date = new Date().toISOString()
}) {
  if (!assetId) throw new Error('assetId is required');
  if (!expenseType) throw new Error('expenseType is required');

  return {
    assetId,
    expenseType,
    amount: Number(amount) || 0,
    description,
    date,
    createdAt: new Date().toISOString()
  };
}

function calculateAssetTotalCosts({ purchasePrice = 0, expenses = [] }) {
  const additionalCosts = expenses.reduce(
    (total, expense) => total + (Number(expense.amount) || 0),
    0
  );

  return {
    purchasePrice: Number(purchasePrice) || 0,
    additionalCosts,
    totalCost: (Number(purchasePrice) || 0) + additionalCosts
  };
}

function groupExpensesByType(expenses = []) {
  return expenses.reduce((summary, expense) => {
    const type = expense.expenseType || 'Other';
    summary[type] = (summary[type] || 0) + (Number(expense.amount) || 0);
    return summary;
  }, {});
}

module.exports = {
  EXPENSE_TYPES,
  createExpenseRecord,
  calculateAssetTotalCosts,
  groupExpensesByType
};
