/**
 * GearCashOut - Pricing Approval
 *
 * Calculates a proposed resale outcome and records the approval payload.
 * Persistence is handled by the calling page once the corresponding
 * database columns/table are available.
 */
function calculatePricing({ purchasePrice = 0, additionalCosts = 0, targetSalePrice = 0, sellingFees = 0, shippingCost = 0 } = {}) {
  const cost = Number(purchasePrice) + Number(additionalCosts) + Number(shippingCost);
  const sale = Number(targetSalePrice);
  const fees = Number(sellingFees);
  const netSale = sale - fees;
  const profit = netSale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  return {
    totalCost: cost,
    targetSalePrice: sale,
    sellingFees: fees,
    netSale,
    expectedProfit: profit,
    expectedMarginPercent: Number(margin.toFixed(2))
  };
}

function createPricingApproval({ assetId, pricing, approvedBy, notes = null } = {}) {
  if (!assetId) throw new Error('assetId is required');
  if (!approvedBy) throw new Error('approvedBy is required');
  if (!pricing || Number(pricing.targetSalePrice) <= 0) throw new Error('A positive target sale price is required');
  return {
    assetId,
    ...pricing,
    approvedBy,
    approvedAt: new Date().toISOString(),
    notes
  };
}

if (typeof window !== 'undefined') window.PricingApproval = { calculatePricing, createPricingApproval };
if (typeof module !== 'undefined') module.exports = { calculatePricing, createPricingApproval };
