// Email Template Management Layer
// Stores editable customer communication templates.

export const EmailTemplates = {
  quoteReceived: {
    subject: 'Your drone quote has been received',
    body: 'Thank you for submitting your drone details. We are reviewing your quote.'
  },

  offerReady: {
    subject: 'Your drone offer is ready',
    body: 'Your valuation has been completed and your offer is ready to review.'
  },

  informationRequest: {
    subject: 'More information required for your quote',
    body: 'Please provide the requested details so we can continue processing your quote.'
  },

  purchaseCompleted: {
    subject: 'Your drone purchase is complete',
    body: 'Your purchase has been completed successfully.'
  }
};

export function getEmailTemplate(type) {
  return EmailTemplates[type] || null;
}

export function updateEmailTemplate(type, template) {
  if (!EmailTemplates[type]) {
    return { status: 'template_not_found' };
  }

  EmailTemplates[type] = template;

  return {
    status: 'template_updated',
    type
  };
}
