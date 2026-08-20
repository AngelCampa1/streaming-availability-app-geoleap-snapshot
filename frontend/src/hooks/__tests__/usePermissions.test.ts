/**
 * Comprehensive tests for usePermissions.ts
 *
 * Coverage Target: 95%+ (security-critical hook)
 * Strategy: Test all permission checks, role checks, combined checks, navigation helpers
 */

import { renderHook } from '@testing-library/react';
import { usePermissions } from '../usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_PERMISSIONS } from '@/lib/auth';

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('usePermissions - Raw Permission Checks', () => {
  it('should expose hasPermission from auth context', () => {
    const hasPermission = jest.fn((perm: string) => perm === 'test.permission');
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: ['test.permission'],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasPermission('test.permission')).toBe(true);
    expect(result.current.hasPermission('other.permission')).toBe(false);
    expect(hasPermission).toHaveBeenCalledTimes(2);
  });

  it('should expose hasAnyPermission from auth context', () => {
    const hasAnyPermission = jest.fn(() => true);
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission,
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasAnyPermission(['perm1', 'perm2'])).toBe(true);
    expect(hasAnyPermission).toHaveBeenCalledWith(['perm1', 'perm2']);
  });

  it('should expose hasRole from auth context', () => {
    const hasRole = jest.fn((role: string) => role === 'Admin');
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole,
      permissions: [],
      roles: ['Admin'],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasRole('Admin')).toBe(true);
    expect(result.current.hasRole('User')).toBe(false);
  });

  it('should expose permissions array from auth context', () => {
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: ['permission1', 'permission2'],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.permissions).toEqual(['permission1', 'permission2']);
  });

  it('should expose roles array from auth context', () => {
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: ['User', 'Premium'],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.roles).toEqual(['User', 'Premium']);
  });
});

describe('usePermissions - Content Permissions', () => {
  it('should check basic search permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.CONTENT_SEARCH_BASIC);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canSearchBasic()).toBe(true);
    expect(hasPermission).toHaveBeenCalledWith(DEFAULT_PERMISSIONS.CONTENT_SEARCH_BASIC);
  });

  it('should check full search permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.CONTENT_SEARCH_FULL);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canSearchFull()).toBe(true);
    expect(hasPermission).toHaveBeenCalledWith(DEFAULT_PERMISSIONS.CONTENT_SEARCH_FULL);
  });

  it('should check view content details permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.CONTENT_DETAILS_VIEW);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canViewContentDetails()).toBe(true);
    expect(hasPermission).toHaveBeenCalledWith(DEFAULT_PERMISSIONS.CONTENT_DETAILS_VIEW);
  });
});

describe('usePermissions - User Permissions', () => {
  it('should check view profile permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.USER_PROFILE_VIEW);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canViewProfile()).toBe(true);
  });

  it('should check edit profile permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.USER_PROFILE_EDIT);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canEditProfile()).toBe(true);
  });

  it('should check manage watchlist permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.USER_WATCHLIST_MANAGE);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canManageWatchlist()).toBe(true);
  });

  it('should check manage preferences permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.USER_PREFERENCES_MANAGE);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canManagePreferences()).toBe(true);
  });
});

describe('usePermissions - Admin Permissions', () => {
  it('should check view users permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.ADMIN_USERS_VIEW);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canViewUsers()).toBe(true);
  });

  it('should check manage users permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.ADMIN_USERS_MANAGE);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canManageUsers()).toBe(true);
  });

  it('should check manage roles permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.ADMIN_ROLES_MANAGE);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canManageRoles()).toBe(true);
  });

  it('should check configure system permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.ADMIN_SYSTEM_CONFIGURE);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canConfigureSystem()).toBe(true);
  });

  it('should check view analytics permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.ADMIN_ANALYTICS_VIEW);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canViewAnalytics()).toBe(true);
  });
});

describe('usePermissions - Role Checks', () => {
  it('should detect guest user (no roles)', () => {
    const hasRole = jest.fn(() => false);
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole,
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isGuest()).toBe(true);
  });

  it('should detect regular user', () => {
    const hasRole = jest.fn((role: string) => role === 'User');
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole,
      permissions: [],
      roles: ['User'],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isUser()).toBe(true);
    expect(result.current.isGuest()).toBe(false);
  });

  it('should detect premium user', () => {
    const hasRole = jest.fn((role: string) => role === 'Premium');
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole,
      permissions: [],
      roles: ['Premium'],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isPremium()).toBe(true);
  });

  it('should detect admin user', () => {
    const hasRole = jest.fn((role: string) => role === 'Admin');
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole,
      permissions: [],
      roles: ['Admin'],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isAdmin()).toBe(true);
  });

  it('should detect super admin user', () => {
    const hasRole = jest.fn((role: string) => role === 'SuperAdmin');
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole,
      permissions: [],
      roles: ['SuperAdmin'],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.isSuperAdmin()).toBe(true);
    expect(result.current.isAdmin()).toBe(true); // SuperAdmin also counts as admin
  });
});

describe('usePermissions - Combined Checks', () => {
  it('should check for any admin access', () => {
    const hasAnyPermission = jest.fn(() => true);
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission,
      hasRole: jest.fn(),
      permissions: [DEFAULT_PERMISSIONS.ADMIN_USERS_VIEW],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasAnyAdminAccess()).toBe(true);
    expect(hasAnyPermission).toHaveBeenCalledWith([
      DEFAULT_PERMISSIONS.ADMIN_USERS_VIEW,
      DEFAULT_PERMISSIONS.ADMIN_USERS_MANAGE,
      DEFAULT_PERMISSIONS.ADMIN_ROLES_MANAGE,
      DEFAULT_PERMISSIONS.ADMIN_SYSTEM_CONFIGURE,
      DEFAULT_PERMISSIONS.ADMIN_ANALYTICS_VIEW,
    ]);
  });

  it('should check for full content access', () => {
    const hasPermission = jest.fn((perm: string) =>
      perm === DEFAULT_PERMISSIONS.CONTENT_SEARCH_FULL ||
      perm === DEFAULT_PERMISSIONS.CONTENT_DETAILS_VIEW
    );
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasFullContentAccess()).toBe(true);
  });

  it('should deny full content access if missing any required permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.CONTENT_SEARCH_FULL);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    // Has search but not details view
    expect(result.current.hasFullContentAccess()).toBe(false);
  });
});

describe('usePermissions - Navigation Helpers', () => {
  it('should allow admin panel access with admin permissions', () => {
    const hasAnyPermission = jest.fn(() => true);
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission,
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canAccessAdminPanel()).toBe(true);
  });

  it('should allow user settings access with any user permission', () => {
    const hasPermission = jest.fn((perm: string) => perm === DEFAULT_PERMISSIONS.USER_PROFILE_VIEW);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canAccessUserSettings()).toBe(true);
  });

  it('should deny user settings access without any user permission', () => {
    const hasPermission = jest.fn(() => false);
    mockUseAuth.mockReturnValue({
      hasPermission,
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      permissions: [],
      roles: [],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canAccessUserSettings()).toBe(false);
  });

  it('should allow premium features access for premium users', () => {
    const hasRole = jest.fn((role: string) => role === 'Premium');
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole,
      permissions: [],
      roles: ['Premium'],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canAccessPremiumFeatures()).toBe(true);
  });

  it('should allow premium features access for admins', () => {
    const hasRole = jest.fn((role: string) => role === 'Admin');
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole,
      permissions: [],
      roles: ['Admin'],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canAccessPremiumFeatures()).toBe(true);
  });

  it('should deny premium features access for regular users', () => {
    const hasRole = jest.fn((role: string) => role === 'User');
    mockUseAuth.mockReturnValue({
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole,
      permissions: [],
      roles: ['User'],
    } as any);

    const { result } = renderHook(() => usePermissions());

    expect(result.current.canAccessPremiumFeatures()).toBe(false);
  });
});
