// Google Sheets Export Mapper
// Converts quote database records into spreadsheet-ready rows.

export function mapQuoteToSheetRow(quote) {
  return {
    quote_id: quote.id || '',
    created_date: quote.createdDate || '',
    customer_name: quote.customer?.name || '',
    customer_email: quote.customer?.email || '',
    item_category: quote.item?.category || '',
    manufacturer: quote.item?.manufacturer || '',
    model: quote.item?.model || '',
    package_type: quote.item?.package || '',
    condition: quote.item?.condition || '',
    sealed_status: quote.item?.sealedStatus || '',
    serial_number: quote.item?.serialNumber || '',
    photos_received: quote.item?.photosReceived || false,
    market_comparison: quote.valuation?.marketComparison || '',
    suggested_value: quote.valuation?.suggestedValue || '',
    offer_amount: quote.offer?.amount || '',
    offer_status: quote.offer?.status || ''
  };
}

export function mapQuoteItemsToSheetRows(items = []) {
  return items.map(item => mapQuoteToSheetRow({ item }));
}
