// Admin operations dashboard summary layer
// Provides grouped operational views for quote management.

const dashboardSummary = {
  queues: {
    newQuotes: [],
    offersAwaitingReply: [],
    inspectionsPending: [],
    blockedPayments: [],
    openReturns: []
  },

  counters(records = []) {
    return {
      total: records.length,
      newQuotes: records.filter(r => r.status === 'new').length,
      pendingInspection: records.filter(r => r.status === 'inspection_pending').length,
      paymentBlocked: records.filter(r => r.status === 'blocked').length,
      disputes: records.filter(r => r.status === 'dispute_open').length
    };
  },

  createSummary(records = []) {
    return {
      generatedAt: new Date().toISOString(),
      counters: this.counters(records),
      priorityItems: records.filter(r => r.priority === 'high')
    };
  }
};

export default dashboardSummary;
