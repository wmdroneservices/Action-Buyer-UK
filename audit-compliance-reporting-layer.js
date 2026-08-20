// Audit Compliance Reporting Layer
// Tracks operational history, approvals, and compliance records.

export const auditEvents = {
  quoteCreated: 'QUOTE_CREATED',
  valuationUpdated: 'VALUATION_UPDATED',
  offerChanged: 'OFFER_CHANGED',
  paymentApproved: 'PAYMENT_APPROVED',
  disputeOpened: 'DISPUTE_OPENED',
  disputeResolved: 'DISPUTE_RESOLVED'
};

export function createAuditRecord({ userId, action, recordId, details }) {
  return {
    userId,
    action,
    recordId,
    details,
    timestamp: new Date().toISOString()
  };
}

export function getAuditHistory(records, recordId) {
  return records.filter(record => record.recordId === recordId);
}

export function generateComplianceReport(records) {
  return {
    totalActions: records.length,
    recentActions: records.slice(-10),
    generatedAt: new Date().toISOString()
  };
}
