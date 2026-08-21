/** GearCashOut - Case cost reason codes */
const CASE_COST_REASONS = Object.freeze({
  'Inbound Shipping': ['Customer sent item for assessment', 'Customer sent item after quote acceptance', 'Other inbound movement'],
  'Return Shipping': ['Customer declined quote', 'Customer declined revised offer', 'Assessment failed', 'Customer cancellation', 'Other return'],
  'Inspection': ['Standard inspection', 'Additional inspection', 'Reinspection'],
  'Packaging': ['Inbound packaging', 'Return packaging', 'Protective materials'],
  'Payment Fee': ['Payment processing', 'Refund processing', 'Other payment fee'],
  'Other': ['Customer case expense', 'Administrative expense', 'Other']
});

function isValidCaseCostReason(type, reason) {
  return Boolean(CASE_COST_REASONS[type]?.includes(reason));
}

if (typeof window !== 'undefined') window.CaseCostReasons = { CASE_COST_REASONS, isValidCaseCostReason };
if (typeof module !== 'undefined') module.exports = { CASE_COST_REASONS, isValidCaseCostReason };
