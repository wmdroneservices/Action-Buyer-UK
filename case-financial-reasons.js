/**
 * GearCashOut - Case Financial Reasons
 * Standard reasons make failed-purchase costs reportable.
 */
const CASE_COST_REASONS = Object.freeze([
  'Customer declined quote',
  'Customer declined revised quote',
  'Item not as described',
  'Item failed inspection',
  'Item failed testing',
  'Customer cancelled before purchase',
  'Return requested by customer',
  'Duplicate shipment',
  'Address issue',
  'Other'
]);

function validateCaseCostReason(reason) {
  return CASE_COST_REASONS.includes(reason);
}

function buildCaseCostMetadata({ reason, notes = null, reference = null } = {}) {
  if (!validateCaseCostReason(reason)) throw new Error('Invalid case financial reason');
  return { reason, notes, reference };
}

if (typeof window !== 'undefined') window.CaseFinancialReasons = { CASE_COST_REASONS, validateCaseCostReason, buildCaseCostMetadata };
if (typeof module !== 'undefined') module.exports = { CASE_COST_REASONS, validateCaseCostReason, buildCaseCostMetadata };
