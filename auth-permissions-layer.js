// Authentication and permissions layer foundation
// Prepares customer/admin access separation for Action Buyer UK

const roles = {
  CUSTOMER: 'customer',
  ADMIN: 'admin'
};

const permissions = {
  customer: [
    'view_own_quotes',
    'upload_documents',
    'view_own_offers'
  ],
  admin: [
    'view_all_quotes',
    'manage_valuations',
    'approve_offers',
    'manage_inspections'
  ]
};

function hasPermission(role, permission) {
  return permissions[role]?.includes(permission) || false;
}

function canAccessQuote(user, quote) {
  if (!user || !quote) return false;

  if (user.role === roles.ADMIN) return true;

  return user.id === quote.customerId;
}

module.exports = {
  roles,
  permissions,
  hasPermission,
  canAccessQuote
};
