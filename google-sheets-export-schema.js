// Google Sheets export structure for quote database
// Designed for manual valuation workflow and future Supabase integration

const googleSheetsExportSchema = {
  quotes: [
    'quote_id',
    'created_date',
    'customer_id',
    'customer_name',
    'customer_email',
    'status'
  ],

  quote_items: [
    'quote_item_id',
    'quote_id',
    'category',
    'manufacturer',
    'model',
    'package_type',
    'condition',
    'sealed_status',
    'serial_number',
    'photos_received'
  ],

  valuation: [
    'market_source',
    'comparison_price',
    'source_notes',
    'suggested_value',
    'offer_amount',
    'offer_status'
  ],

  verification: [
    'arrival_checked',
    'physical_condition_verified',
    'serial_verified',
    'final_offer_confirmed'
  ]
};

export default googleSheetsExportSchema;
