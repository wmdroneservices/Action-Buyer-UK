// Database table map foundation
// Prepared for Supabase migration and Google Sheets export.

const databaseTableMap = {
  customers: {
    primaryKey: 'customer_id',
    fields: ['name', 'email', 'phone', 'address', 'created_at']
  },
  quotes: {
    primaryKey: 'quote_id',
    fields: ['customer_id', 'status', 'submitted_at']
  },
  quote_items: {
    primaryKey: 'quote_item_id',
    fields: ['quote_id', 'equipment_type', 'manufacturer', 'model', 'condition']
  },
  offers: {
    primaryKey: 'offer_id',
    fields: ['quote_item_id', 'amount', 'status', 'created_at']
  },
  sales: {
    primaryKey: 'sale_id',
    fields: ['offer_id', 'inspection_status', 'shipping_status']
  },
  returns: {
    primaryKey: 'return_id',
    fields: ['sale_id', 'reason', 'resolution']
  }
};

window.databaseTableMap = databaseTableMap;
