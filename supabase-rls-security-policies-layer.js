// Supabase Row Level Security (RLS) policy planning layer
// Defines database-level access rules for Action Buyer UK.

const rlsPolicies = {
  profiles: {
    customer: ['read_own_profile'],
    admin: ['read_all_profiles', 'manage_roles']
  },

  quotes: {
    customer: ['create_quote', 'read_own_quotes', 'update_own_pending_quotes'],
    admin: ['read_all_quotes', 'update_all_quotes']
  },

  documents: {
    customer: ['upload_own_documents', 'read_own_documents'],
    admin: ['read_all_documents', 'manage_documents']
  },

  valuations: {
    customer: [],
    admin: ['create', 'read', 'update']
  },

  offers: {
    customer: ['read_own_offers'],
    admin: ['create', 'update', 'approve']
  }
};

function canAccess(role, resource, action) {
  return Boolean(
    rlsPolicies[resource] &&
    rlsPolicies[resource][role] &&
    rlsPolicies[resource][role].includes(action)
  );
}

module.exports = {
  rlsPolicies,
  canAccess
};
