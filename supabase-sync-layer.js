// Supabase Sync Layer
// Handles loading and updating quote data between the application and database.

const SupabaseSyncLayer = {
  async loadQuote(quoteId, client) {
    return client.from('quotes').select('*').eq('id', quoteId).single();
  },

  async updateOfferStatus(offerId, status, client) {
    return client.from('offers').update({ status }).eq('id', offerId);
  },

  async saveManualValuation(valuation, client) {
    return client.from('valuations').upsert(valuation);
  },

  async prepareExportData(quoteId, client) {
    const { data } = await client
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId);

    return data || [];
  }
};

export default SupabaseSyncLayer;
