// Quote Change Audit Trigger
// Tracks changes from spreadsheet imports, valuations and offer updates.

const auditEvents = {
  valuationChanged: 'valuation_changed',
  offerChanged: 'offer_changed',
  statusChanged: 'status_changed',
  notesChanged: 'notes_changed'
};

function createAuditEvent(recordId, type, before, after, user = 'system') {
  return {
    recordId,
    type,
    before,
    after,
    user,
    timestamp: new Date().toISOString()
  };
}

function detectChanges(before, after) {
  const changes = [];

  Object.keys(after).forEach(key => {
    if (before[key] !== after[key]) {
      changes.push({
        field: key,
        oldValue: before[key],
        newValue: after[key]
      });
    }
  });

  return changes;
}

module.exports = {
  auditEvents,
  createAuditEvent,
  detectChanges
};
