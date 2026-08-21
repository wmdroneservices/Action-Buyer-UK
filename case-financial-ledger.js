/**
 * GearCashOut - Case Financial Ledger
 *
 * Tracks financial events against a valuation/purchase case. A declined or
 * returned customer item can therefore record real costs without becoming
 * inventory or revenue.
 */
const CASE_COST_TYPES = Object.freeze([
  'Inbound Shipping',
  'Return Shipping',
  'Inspection',
  'Packaging',
  'Payment Fee',
  'Other'
]);

const CASE_INCOME_TYPES = Object.freeze([
  'Purchase Revenue Adjustment',
  'Other Income'
]);

function createCaseFinancialEntry({ caseId, type, amount, direction = 'cost', description = null, reference = null, recordedBy = null } = {}) {
  if (!caseId) throw new Error('caseId is required');
  if (!Number.isFinite(Number(amount)) || Number(amount) < 0) throw new Error('amount must be zero or greater');
  if (!['cost', 'income'].includes(direction)) throw new Error('direction must be cost or income');
  if (direction === 'cost' && !CASE_COST_TYPES.includes(type)) throw new Error('Invalid case cost type');
  if (direction === 'income' && !CASE_INCOME_TYPES.includes(type)) throw new Error('Invalid case income type');
  return {
    caseId,
    type,
    amount: Number(amount),
    direction,
    description,
    reference,
    recordedBy,
    recordedAt: new Date().toISOString()
  };
}

function calculateCaseOutcome(entries = []) {
  const costs = entries.filter(e => e.direction === 'cost').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const income = entries.filter(e => e.direction === 'income').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  return {
    totalCosts: Number(costs.toFixed(2)),
    totalIncome: Number(income.toFixed(2)),
    netOutcome: Number((income - costs).toFixed(2)),
    isLoss: income - costs < 0
  };
}

function buildRejectedQuoteCaseCosts({ inboundShipping = 0, returnShipping = 0, inspection = 0, packaging = 0, other = 0 } = {}) {
  return [
    ['Inbound Shipping', inboundShipping],
    ['Return Shipping', returnShipping],
    ['Inspection', inspection],
    ['Packaging', packaging],
    ['Other', other]
  ].filter(([, amount]) => Number(amount) > 0).map(([type, amount]) => ({ type, amount: Number(amount), direction: 'cost' }));
}

if (typeof window !== 'undefined') window.CaseFinancialLedger = {
  CASE_COST_TYPES,
  CASE_INCOME_TYPES,
  createCaseFinancialEntry,
  calculateCaseOutcome,
  buildRejectedQuoteCaseCosts
};
if (typeof module !== 'undefined') module.exports = {
  CASE_COST_TYPES,
  CASE_INCOME_TYPES,
  createCaseFinancialEntry,
  calculateCaseOutcome,
  buildRejectedQuoteCaseCosts
};
