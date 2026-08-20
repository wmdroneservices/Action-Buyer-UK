// Inspection Workflow Management Layer
// Provides the structure for inspection scheduling,
// checklists, results and evidence linking.

const inspectionWorkflow = {
  statuses: [
    'Pending',
    'Scheduled',
    'In Progress',
    'Passed',
    'Failed',
    'Completed'
  ],

  createInspectionRecord(data) {
    return {
      quoteId: data.quoteId,
      customerId: data.customerId,
      scheduledDate: data.scheduledDate || null,
      status: 'Pending',
      checklist: [],
      evidence: [],
      createdAt: new Date().toISOString()
    };
  },

  addChecklistItem(inspection, item) {
    inspection.checklist.push({
      item,
      completed: false
    });
    return inspection;
  },

  updateInspectionStatus(inspection, status) {
    if (this.statuses.includes(status)) {
      inspection.status = status;
    }
    return inspection;
  },

  linkInspectionEvidence(inspection, documentId) {
    inspection.evidence.push(documentId);
    return inspection;
  },

  recordInspectionResult(inspection, result) {
    inspection.result = result;
    inspection.status = result === 'passed' ? 'Passed' : 'Failed';
    return inspection;
  }
};

export default inspectionWorkflow;
