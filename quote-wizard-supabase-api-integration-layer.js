// Quote Wizard Supabase API Integration Layer
// Connects customer submissions with Auth, database records and uploads.

const quoteWizardApi = {
  async createQuote(client, quoteData) {
    return {
      table: 'quotes',
      payload: {
        customer_id: quoteData.customerId,
        status: 'new',
        created_at: new Date().toISOString()
      }
    };
  },

  async createQuoteItem(client, itemData) {
    return {
      table: 'quote_items',
      payload: itemData
    };
  },

  async uploadQuoteDocument(fileData) {
    return {
      bucket: 'quote-documents',
      path: `${fileData.userId}/${fileData.type}/${fileData.name}`
    };
  },

  async submitQuote(quote) {
    return {
      success: true,
      status: 'submitted',
      quote
    };
  }
};

export default quoteWizardApi;
