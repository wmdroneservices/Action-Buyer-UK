// Offer Audit History Layer
// Records changes to quotes, valuations and offers.

const auditEvents = [
  'quote_created',
  'item_added',
  'valuation_updated',
  'offer_generated',
  'offer_adjusted',
  'offer_sent',
  'offer_accepted',
  'offer_rejected',
  'inspection_completed',
  'final_payment_confirmed'
];

function createAuditRecord({ entityId, entityType, action, user, details }) {
  return {
    timestamp: new Date().toISOString(),
    entityId,
    entityType,
    action,
    user,
    details
  };
}

function isValidAuditAction(action) {
  return auditEvents.includes(action);
}

module.exports = {
  auditEvents,
  createAuditRecord,
  isValidAuditAction
};
