/**
 * GearCashOut - Sales Handover
 * Records the final handover facts for a completed sale.
 */
function createHandoverRecord({ saleId, assetId, method, recipientName = null, recipientReference = null, conditionAccepted = false, handoverNotes = null, handedOverBy } = {}) {
  if (!saleId) throw new Error('saleId is required');
  if (!assetId) throw new Error('assetId is required');
  if (!['Collection', 'Delivery', 'Courier', 'Other'].includes(method)) throw new Error('Invalid handover method');
  if (!handedOverBy) throw new Error('handedOverBy is required');
  if (!conditionAccepted) throw new Error('Condition acceptance is required');
  return {
    saleId,
    assetId,
    method,
    recipientName,
    recipientReference,
    conditionAccepted: true,
    handoverNotes,
    handedOverBy,
    handedOverAt: new Date().toISOString()
  };
}

if (typeof window !== 'undefined') window.SalesHandover = { createHandoverRecord };
if (typeof module !== 'undefined') module.exports = { createHandoverRecord };
