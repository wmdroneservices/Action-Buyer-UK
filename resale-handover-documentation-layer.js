/**
 * Action Buyer UK - Resale Handover Documentation Layer
 *
 * Internal records for completed resale transactions. This is separate from
 * the original seller purchase workflow and does not create warranty terms.
 */

const HANDOVER_STATUSES = Object.freeze([
  'Pending',
  'Ready for Handover',
  'Handover Complete',
  'Cancelled'
]);

function createHandoverRecord({
  saleId,
  assetId,
  buyerId = null,
  invoiceReference = null,
  salePrice,
  handoverMethod = null,
  scheduledAt = null
}) {
  if (!saleId) throw new Error('saleId is required');
  if (!assetId) throw new Error('assetId is required');

  return {
    saleId,
    assetId,
    buyerId,
    invoiceReference,
    salePrice: Number(salePrice) || 0,
    handoverMethod,
    scheduledAt,
    status: 'Pending',
    completedAt: null,
    transferReference: null,
    createdAt: new Date().toISOString()
  };
}

function markReadyForHandover(record) {
  if (!record) throw new Error('handover record is required');
  return { ...record, status: 'Ready for Handover' };
}

function completeHandover(record, { transferReference = null, completedAt = new Date().toISOString() } = {}) {
  if (!record) throw new Error('handover record is required');

  return {
    ...record,
    status: 'Handover Complete',
    transferReference,
    completedAt
  };
}

function createSaleDocumentationSummary(records = []) {
  return {
    totalRecords: records.length,
    pending: records.filter((record) => record.status === 'Pending').length,
    ready: records.filter((record) => record.status === 'Ready for Handover').length,
    completed: records.filter((record) => record.status === 'Handover Complete').length,
    cancelled: records.filter((record) => record.status === 'Cancelled').length
  };
}

module.exports = {
  HANDOVER_STATUSES,
  createHandoverRecord,
  markReadyForHandover,
  completeHandover,
  createSaleDocumentationSummary
};
