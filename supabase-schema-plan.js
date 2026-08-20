// Supabase database structure plan
// Keeps quote system, valuation records and exports organised.

const supabaseTables = {
  customers: [
    'id',
    'name',
    'email',
    'phone',
    'created_at'
  ],

  quotes: [
    'id',
    'customer_id',
    'status',
    'created_at'
  ],

  quote_items: [
    'id',
    'quote_id',
    'category',
    'manufacturer',
    'model',
    'package_type',
    'condition',
    'sealed_status'
  ],

  valuations: [
    'id',
    'quote_item_id',
    'source',
    'market_price',
    'notes',
    'created_at'
  ],

  offers: [
    'id',
    'quote_item_id',
    'suggested_amount',
    'final_amount',
    'status',
    'created_at'
  ],

  audit_history: [
    'id',
    'record_type',
    'record_id',
    'action',
    'details',
    'created_at'
  ]
};

export default supabaseTables;
