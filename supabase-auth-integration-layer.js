// Supabase Authentication Integration Layer
// Provides the structure for connecting users, sessions and permissions.

const AuthIntegration = {
  createUserProfile(user) {
    return {
      authId: user.id,
      email: user.email,
      role: 'customer',
      createdAt: new Date().toISOString()
    };
  },

  assignRole(profile, role) {
    const allowedRoles = ['customer', 'admin'];

    if (!allowedRoles.includes(role)) {
      throw new Error('Invalid role');
    }

    profile.role = role;
    return profile;
  },

  checkSession(session) {
    return Boolean(session && session.user);
  },

  canAccess(profile, resourceOwnerId) {
    if (profile.role === 'admin') return true;
    return profile.authId === resourceOwnerId;
  }
};

export default AuthIntegration;
