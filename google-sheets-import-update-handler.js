// Google Sheets Import / Update Handler
// Prevents duplicate records when spreadsheet values are updated.

export function matchExistingRecord(row, records = []) {
  return records.find(record =>
    record.quoteId === row.quoteId ||
    (record.serialNumber && record.serialNumber === row.serialNumber)
  );
}

export function prepareSheetUpdate(row, existingRecord) {
  if (!existingRecord) {
    return {
      action: 'create',
      data: row
    };
  }

  return {
    action: 'update',
    id: existingRecord.id,
    changes: {
      valuation: row.valuation,
      offerAmount: row.offerAmount,
      offerStatus: row.offerStatus,
      notes: row.notes
    }
  };
}

export function processSheetRows(rows, existingRecords) {
  return rows.map(row =>
    prepareSheetUpdate(row, matchExistingRecord(row, existingRecords))
  );
}
