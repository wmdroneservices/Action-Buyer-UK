// Google Sheets Export Queue
// Prepares completed and updated quote records for spreadsheet export.

const exportQueue = {
  pending: [],

  add(record) {
    this.pending.push({
      exportId: Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      record
    });
  },

  markExported(exportId) {
    const item = this.pending.find(entry => entry.exportId === exportId);
    if (item) {
      item.status = 'exported';
      item.exportedAt = new Date().toISOString();
    }
  },

  getPending() {
    return this.pending.filter(entry => entry.status === 'pending');
  }
};

export default exportQueue;
