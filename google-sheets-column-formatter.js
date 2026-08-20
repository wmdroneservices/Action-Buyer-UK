// Google Sheets column formatter
// Keeps exported quote records consistent for manual valuation work.

const exportColumns = [
  'quote_id',
  'created_date',
  'customer_name',
  'customer_email',
  'category',
  'manufacturer',
  'model',
  'package_type',
  'condition',
  'sealed_status',
  'included_accessories',
  'market_source_1',
  'market_price_1',
  'market_source_2',
  'market_price_2',
  'market_source_3',
  'market_price_3',
  'suggested_value',
  'final_offer',
  'offer_status',
  'inspection_status',
  'notes'
];

function formatQuoteForSheet(quote) {
  return exportColumns.reduce((row, column) => {
    row[column] = quote[column] ?? '';
    return row;
  }, {});
}

module.exports = {
  exportColumns,
  formatQuoteForSheet
};
