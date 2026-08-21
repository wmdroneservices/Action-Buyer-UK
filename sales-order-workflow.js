/**
 * GearCashOut - Sales Order Workflow
 *
 * Internal workflow for reserving, selling and completing an asset sale.
 * External marketplace APIs remain adapters around these state changes.
 */
const SALES_STATES = Object.freeze(['Pending','Reserved','Paid','Dispatched','Collected','Completed','Cancelled']);

const SALES_TRANSITIONS = Object.freeze({
  Pending: ['Reserved','Cancelled'],
  Reserved: ['Paid','Cancelled'],
  Paid: ['Dispatched','Collected'],
  Dispatched: ['Completed'],
  Collected: ['Completed'],
  Completed: [],
  Cancelled: []
});

function canTransitionSale(from, to) {
  return SALES_STATES.includes(from) && (SALES_TRANSITIONS[from] || []).includes(to);
}

function createSaleOrder({ assetId, channel, salePrice, customerReference = null } = {}) {
  if (!assetId) throw new Error('assetId is required');
  if (!channel) throw new Error('channel is required');
  if (Number(salePrice) <= 0) throw new Error('salePrice must be positive');
  return {
    assetId,
    channel,
    salePrice: Number(salePrice),
    customerReference,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
}

function transitionSale(order, nextState, metadata = {}) {
  if (!order || !canTransitionSale(order.status, nextState)) {
    throw new Error(`Invalid sale transition: ${order?.status || 'Unknown'} -> ${nextState}`);
  }
  return {
    ...order,
    status: nextState,
    previousStatus: order.status,
    statusChangedAt: new Date().toISOString(),
    statusChangedBy: metadata.changedBy || null,
    reason: metadata.reason || null
  };
}

if (typeof window !== 'undefined') window.SalesOrderWorkflow = { SALES_STATES, SALES_TRANSITIONS, canTransitionSale, createSaleOrder, transitionSale };
if (typeof module !== 'undefined') module.exports = { SALES_STATES, SALES_TRANSITIONS, canTransitionSale, createSaleOrder, transitionSale };
