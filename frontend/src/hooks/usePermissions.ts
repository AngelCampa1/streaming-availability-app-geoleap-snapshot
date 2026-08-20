'use client';

import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_PERMISSIONS } from '@/lib/auth';

export function usePermissions() {
  const { hasPermission, hasAnyPermission, hasRole, permissions, roles } = useAuth();

  // Content permissions
  const canSearchBasic = () => hasPermission(DEFAULT_PERMISSIONS.CONTENT_SEARCH_BASIC);
  const canSearchFull = () => hasPermission(DEFAULT_PERMISSIONS.CONTENT_SEARCH_FULL);
  const canViewContentDetails = () => hasPermission(DEFAULT_PERMISSIONS.CONTENT_DETAILS_VIEW);

  // User profile permissions
  const canViewProfile = () => hasPermission(DEFAULT_PERMISSIONS.USER_PROFILE_VIEW);
  const canEditProfile = () => hasPermission(DEFAULT_PERMISSIONS.USER_PROFILE_EDIT);
  const canManageWatchlist = () => hasPermission(DEFAULT_PERMISSIONS.USER_WATCHLIST_MANAGE);
  const canManagePreferences = () => hasPermission(DEFAULT_PERMISSIONS.USER_PREFERENCES_MANAGE);

  // Admin permissions
  const canViewUsers = () => hasPermission(DEFAULT_PERMISSIONS.ADMIN_USERS_VIEW);
  const canManageUsers = () => hasPermission(DEFAULT_PERMISSIONS.ADMIN_USERS_MANAGE);
  const canManageRoles = () => hasPermission(DEFAULT_PERMISSIONS.ADMIN_ROLES_MANAGE);
  const canConfigureSystem = () => hasPermission(DEFAULT_PERMISSIONS.ADMIN_SYSTEM_CONFIGURE);
  const canViewAnalytics = () => hasPermission(DEFAULT_PERMISSIONS.ADMIN_ANALYTICS_VIEW);

  // Role checks
  const isGuest = () => !hasRole('User') && !hasRole('Premium') && !hasRole('Admin') && !hasRole('SuperAdmin');
  const isUser = () => hasRole('User');
  const isPremium = () => hasRole('Premium');
  const isAdmin = () => hasRole('Admin') || hasRole('SuperAdmin');
  const isSuperAdmin = () => hasRole('SuperAdmin');

  // Combined checks
  const hasAnyAdminAccess = () =>
    hasAnyPermission([
      DEFAULT_PERMISSIONS.ADMIN_USERS_VIEW,
      DEFAULT_PERMISSIONS.ADMIN_USERS_MANAGE,
      DEFAULT_PERMISSIONS.ADMIN_ROLES_MANAGE,
      DEFAULT_PERMISSIONS.ADMIN_SYSTEM_CONFIGURE,
      DEFAULT_PERMISSIONS.ADMIN_ANALYTICS_VIEW,
    ]);

  const hasFullContentAccess = () => canSearchFull() && canViewContentDetails();

  // Navigation helpers
  const canAccessAdminPanel = () => hasAnyAdminAccess();
  const canAccessUserSettings = () => canViewProfile() || canEditProfile() || canManagePreferences();
  const canAccessPremiumFeatures = () => isPremium() || isAdmin();

  return {
    // Raw permission/role checks
    hasPermission,
    hasAnyPermission,
    hasRole,
    permissions,
    roles,

    // Content permissions
    canSearchBasic,
    canSearchFull,
    canViewContentDetails,

    // User permissions
    canViewProfile,
    canEditProfile,
    canManageWatchlist,
    canManagePreferences,

    // Admin permissions
    canViewUsers,
    canManageUsers,
    canManageRoles,
    canConfigureSystem,
    canViewAnalytics,

    // Role checks
    isGuest,
    isUser,
    isPremium,
    isAdmin,
    isSuperAdmin,

    // Combined checks
    hasAnyAdminAccess,
    hasFullContentAccess,

    // Navigation helpers
    canAccessAdminPanel,
    canAccessUserSettings,
    canAccessPremiumFeatures,
  };
}
