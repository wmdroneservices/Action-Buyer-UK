/*
 * Valuation comparison record foundation
 *
 * Stores the information needed for manual pricing decisions.
 * Designed for future database storage and Google Sheets export.
 */

const valuationComparisonRecord = {
  quoteItemId: null,
  researchEntries: [],
  suggestedValue: null,
  staffOffer: null,
  notes: '',
  createdBy: null,
  createdAt: null
};

function addMarketComparison(record, source, value, notes = '') {
  record.researchEntries.push({
    source,
    value,
    notes,
    date: new Date().toISOString()
  });

  return record;
}

window.ValuationComparisonRecord = {
  create: () => ({ ...valuationComparisonRecord, researchEntries: [] }),
  addMarketComparison
};
