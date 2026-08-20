// Warranty and After-Sales Management Layer
// Handles warranty records, support cases, returns and repair tracking.

export function createWarrantyRecord(purchase) {
  return {
    purchaseId: purchase.id,
    warrantyStatus: 'active',
    createdAt: new Date().toISOString()
  };
}

export function createSupportCase(customer, issue) {
  return {
    customerId: customer.id,
    issue,
    status: 'open',
    createdAt: new Date().toISOString()
  };
}

export function updateSupportCase(caseId, status) {
  return {
    caseId,
    status,
    updatedAt: new Date().toISOString()
  };
}

export function createReturnRequest(purchase, reason) {
  return {
    purchaseId: purchase.id,
    reason,
    status: 'pending_review',
    createdAt: new Date().toISOString()
  };
}

export function trackRepairStatus(repairId, status) {
  return {
    repairId,
    status,
    updatedAt: new Date().toISOString()
  };
}
