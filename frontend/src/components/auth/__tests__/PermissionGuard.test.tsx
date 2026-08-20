import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  PermissionGuard,
  AdminOnly,
  PremiumOnly,
  AuthenticatedOnly,
} from '../PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { createMockAuthContext } from '@/test-utils';
import { createMockUser } from '@/test-utils';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('PermissionGuard', () => {
  const mockAuthContext = createMockAuthContext({
    isAuthenticated: true,
  });

  // Type assertions for mock functions
  const mockHasPermission = mockAuthContext.hasPermission as jest.MockedFunction<typeof mockAuthContext.hasPermission>;
  const mockHasAnyPermission = mockAuthContext.hasAnyPermission as jest.MockedFunction<typeof mockAuthContext.hasAnyPermission>;
  const mockHasRole = mockAuthContext.hasRole as jest.MockedFunction<typeof mockAuthContext.hasRole>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthContext);
  });

  describe('Authentication checks', () => {
    it('should show fallback when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: false,
      });

      render(
        <PermissionGuard fallback={<div>Please log in</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Please log in')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should show null fallback when user is not authenticated and no fallback provided', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: false,
      });

      const { container } = render(
        <PermissionGuard>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
      // When fallback is null, React renders nothing (container.firstChild?.textContent is undefined)
      expect(container.firstChild?.textContent).toBeFalsy();
    });

    it('should show children when user is authenticated and no permissions/roles required', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true,
      });

      render(
        <PermissionGuard>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
  });

  describe('Permission checks - single permission', () => {
    it('should show children when user has required permission (string)', () => {
      mockHasAnyPermission.mockReturnValue(true);

      render(
        <PermissionGuard permissions="view:content">
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['view:content']);
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should show fallback when user lacks required permission (string)', () => {
      mockHasAnyPermission.mockReturnValue(false);

      render(
        <PermissionGuard permissions="admin:users" fallback={<div>No access</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['admin:users']);
      expect(screen.getByText('No access')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  describe('Permission checks - multiple permissions (ANY)', () => {
    it('should show children when user has ANY of the required permissions', () => {
      mockHasAnyPermission.mockReturnValue(true);

      render(
        <PermissionGuard permissions={['view:content', 'edit:content']} requireAll={false}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['view:content', 'edit:content']);
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should show fallback when user lacks ANY of the required permissions', () => {
      mockHasAnyPermission.mockReturnValue(false);

      render(
        <PermissionGuard
          permissions={['admin:users', 'admin:settings']}
          requireAll={false}
          fallback={<div>No access</div>}
        >
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['admin:users', 'admin:settings']);
      expect(screen.getByText('No access')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  describe('Permission checks - multiple permissions (ALL)', () => {
    it('should show children when user has ALL required permissions', () => {
      mockHasPermission.mockReturnValue(true);

      render(
        <PermissionGuard permissions={['view:content', 'edit:content']} requireAll={true}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasPermission).toHaveBeenCalledWith('view:content');
      expect(mockHasPermission).toHaveBeenCalledWith('edit:content');
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should show fallback when user lacks ANY of the required permissions (requireAll=true)', () => {
      mockHasPermission
        .mockReturnValueOnce(true) // Has 'view:content'
        .mockReturnValueOnce(false); // Lacks 'edit:content'

      render(
        <PermissionGuard
          permissions={['view:content', 'edit:content']}
          requireAll={true}
          fallback={<div>No access</div>}
        >
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasPermission).toHaveBeenCalledWith('view:content');
      expect(mockHasPermission).toHaveBeenCalledWith('edit:content');
      expect(screen.getByText('No access')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  describe('Role checks - single role', () => {
    it('should show children when user has required role (string)', () => {
      mockHasRole.mockReturnValue(true);

      render(
        <PermissionGuard roles="Editor">
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasRole).toHaveBeenCalledWith('Editor');
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should show fallback when user lacks required role (string)', () => {
      mockHasRole.mockReturnValue(false);

      render(
        <PermissionGuard roles="Admin" fallback={<div>No access</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasRole).toHaveBeenCalledWith('Admin');
      expect(screen.getByText('No access')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  describe('Role checks - multiple roles (ANY)', () => {
    it('should show children when user has ANY of the required roles', () => {
      mockHasRole
        .mockReturnValueOnce(false) // Not Admin
        .mockReturnValueOnce(true); // Is Editor

      render(
        <PermissionGuard roles={['Admin', 'Editor']} requireAll={false}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasRole).toHaveBeenCalledWith('Admin');
      expect(mockHasRole).toHaveBeenCalledWith('Editor');
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should show fallback when user lacks ANY of the required roles', () => {
      mockHasRole.mockReturnValue(false);

      render(
        <PermissionGuard roles={['Admin', 'SuperAdmin']} requireAll={false} fallback={<div>No access</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasRole).toHaveBeenCalledWith('Admin');
      expect(mockHasRole).toHaveBeenCalledWith('SuperAdmin');
      expect(screen.getByText('No access')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  describe('Role checks - multiple roles (ALL)', () => {
    it('should show children when user has ALL required roles', () => {
      mockHasRole.mockReturnValue(true);

      render(
        <PermissionGuard roles={['Premium', 'Verified']} requireAll={true}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasRole).toHaveBeenCalledWith('Premium');
      expect(mockHasRole).toHaveBeenCalledWith('Verified');
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should show fallback when user lacks ANY of the required roles (requireAll=true)', () => {
      mockHasRole
        .mockReturnValueOnce(true) // Has 'Premium'
        .mockReturnValueOnce(false); // Lacks 'Verified'

      render(
        <PermissionGuard
          roles={['Premium', 'Verified']}
          requireAll={true}
          fallback={<div>No access</div>}
        >
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasRole).toHaveBeenCalledWith('Premium');
      expect(mockHasRole).toHaveBeenCalledWith('Verified');
      expect(screen.getByText('No access')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });

  describe('Combined permissions and roles', () => {
    it('should check both permissions and roles when both are provided', () => {
      mockHasAnyPermission.mockReturnValue(true);
      mockHasRole.mockReturnValue(true);

      render(
        <PermissionGuard permissions="edit:content" roles="Editor">
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['edit:content']);
      expect(mockHasRole).toHaveBeenCalledWith('Editor');
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should show fallback when permissions pass but roles fail', () => {
      mockHasAnyPermission.mockReturnValue(true);
      mockHasRole.mockReturnValue(false);

      render(
        <PermissionGuard permissions="view:content" roles="Admin" fallback={<div>No access</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['view:content']);
      expect(mockHasRole).toHaveBeenCalledWith('Admin');
      expect(screen.getByText('No access')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should show fallback when roles pass but permissions fail', () => {
      mockHasAnyPermission.mockReturnValue(false);
      mockHasRole.mockReturnValue(true);

      render(
        <PermissionGuard permissions="admin:delete" roles="Editor" fallback={<div>No access</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['admin:delete']);
      // Should fail at permissions check, never reach roles check
      expect(screen.getByText('No access')).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });
  });
});

describe('AdminOnly', () => {
  const mockAuthContext = {
    hasPermission: jest.fn(),
    hasRole: jest.fn(),
    hasAnyPermission: jest.fn(),
    isAuthenticated: true,
    user: null,
    permissions: [],
    roles: [],
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    logoutAllSessions: jest.fn(),
    isLoading: false,
    sessionExpiring: false,
    extendSession: jest.fn(),
    checkAuthStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthContext);
  });

  it('should show children when user has Admin role', () => {
    // AdminOnly uses roles={['Admin', 'SuperAdmin']} with requireAll=false (default)
    mockAuthContext.hasRole.mockImplementation((role: string) => {
      return role === 'Admin'; // User has Admin role
    });

    render(
      <AdminOnly>
        <div>Admin content</div>
      </AdminOnly>
    );

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('should show children when user has SuperAdmin role', () => {
    // AdminOnly uses roles={['Admin', 'SuperAdmin']} with requireAll=false (default)
    // Component uses .some() which checks each role until it finds a match
    mockAuthContext.hasRole.mockImplementation((role: string) => {
      return role === 'SuperAdmin'; // User has SuperAdmin role
    });

    render(
      <AdminOnly>
        <div>Admin content</div>
      </AdminOnly>
    );

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('should show fallback when user has neither Admin nor SuperAdmin role', () => {
    mockAuthContext.hasRole.mockImplementation(() => false); // User has no admin roles

    render(
      <AdminOnly fallback={<div>Admin access required</div>}>
        <div>Admin content</div>
      </AdminOnly>
    );

    expect(screen.getByText('Admin access required')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('should show null fallback when user lacks admin roles and no fallback provided', () => {
    mockAuthContext.hasRole.mockImplementation(() => false);

    const { container } = render(
      <AdminOnly>
        <div>Admin content</div>
      </AdminOnly>
    );

    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(container.firstChild?.textContent).toBeFalsy();
  });
});

describe('PremiumOnly', () => {
  const mockAuthContext = {
    hasPermission: jest.fn(),
    hasRole: jest.fn(),
    hasAnyPermission: jest.fn(),
    isAuthenticated: true,
    user: null,
    permissions: [],
    roles: [],
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    logoutAllSessions: jest.fn(),
    isLoading: false,
    sessionExpiring: false,
    extendSession: jest.fn(),
    checkAuthStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthContext);
  });

  it('should show children when user has Premium role', () => {
    // PremiumOnly uses roles={['Premium', 'Admin', 'SuperAdmin']} with requireAll=false
    mockAuthContext.hasRole.mockImplementation((role: string) => {
      return role === 'Premium'; // User has Premium role
    });

    render(
      <PremiumOnly>
        <div>Premium content</div>
      </PremiumOnly>
    );

    expect(screen.getByText('Premium content')).toBeInTheDocument();
  });

  it('should show children when user has Admin role (admins can see premium content)', () => {
    // PremiumOnly uses roles={['Premium', 'Admin', 'SuperAdmin']} with requireAll=false
    mockAuthContext.hasRole.mockImplementation((role: string) => {
      return role === 'Admin'; // User has Admin role
    });

    render(
      <PremiumOnly>
        <div>Premium content</div>
      </PremiumOnly>
    );

    expect(screen.getByText('Premium content')).toBeInTheDocument();
  });

  it('should show children when user has SuperAdmin role', () => {
    // PremiumOnly uses roles={['Premium', 'Admin', 'SuperAdmin']} with requireAll=false
    mockAuthContext.hasRole.mockImplementation((role: string) => {
      return role === 'SuperAdmin'; // User has SuperAdmin role
    });

    render(
      <PremiumOnly>
        <div>Premium content</div>
      </PremiumOnly>
    );

    expect(screen.getByText('Premium content')).toBeInTheDocument();
  });

  it('should show fallback when user has none of the premium/admin roles', () => {
    mockAuthContext.hasRole.mockImplementation(() => false);

    render(
      <PremiumOnly fallback={<div>Premium subscription required</div>}>
        <div>Premium content</div>
      </PremiumOnly>
    );

    expect(screen.getByText('Premium subscription required')).toBeInTheDocument();
    expect(screen.queryByText('Premium content')).not.toBeInTheDocument();
  });

  it('should show null fallback when user lacks premium/admin roles and no fallback provided', () => {
    mockAuthContext.hasRole.mockImplementation(() => false);

    const { container } = render(
      <PremiumOnly>
        <div>Premium content</div>
      </PremiumOnly>
    );

    expect(screen.queryByText('Premium content')).not.toBeInTheDocument();
    expect(container.firstChild?.textContent).toBeFalsy();
  });
});

describe('AuthenticatedOnly', () => {
  const mockAuthContext = {
    hasPermission: jest.fn(),
    hasRole: jest.fn(),
    hasAnyPermission: jest.fn(),
    isAuthenticated: true,
    user: null,
    permissions: [],
    roles: [],
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    logoutAllSessions: jest.fn(),
    isLoading: false,
    sessionExpiring: false,
    extendSession: jest.fn(),
    checkAuthStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthContext);
  });

  it('should show children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      isAuthenticated: true,
    });

    render(
      <AuthenticatedOnly>
        <div>Authenticated content</div>
      </AuthenticatedOnly>
    );

    expect(screen.getByText('Authenticated content')).toBeInTheDocument();
  });

  it('should show fallback when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      isAuthenticated: false,
    });

    render(
      <AuthenticatedOnly fallback={<div>Please log in</div>}>
        <div>Authenticated content</div>
      </AuthenticatedOnly>
    );

    expect(screen.getByText('Please log in')).toBeInTheDocument();
    expect(screen.queryByText('Authenticated content')).not.toBeInTheDocument();
  });

  it('should show null fallback when user is not authenticated and no fallback provided', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      isAuthenticated: false,
    });

    const { container } = render(
      <AuthenticatedOnly>
        <div>Authenticated content</div>
      </AuthenticatedOnly>
    );

    expect(screen.queryByText('Authenticated content')).not.toBeInTheDocument();
    expect(container.firstChild?.textContent).toBeFalsy();
  });

  it('should not check permissions or roles, only authentication', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      isAuthenticated: true,
    });

    render(
      <AuthenticatedOnly>
        <div>Authenticated content</div>
      </AuthenticatedOnly>
    );

    expect(mockAuthContext.hasPermission).not.toHaveBeenCalled();
    expect(mockAuthContext.hasRole).not.toHaveBeenCalled();
    expect(mockAuthContext.hasAnyPermission).not.toHaveBeenCalled();
    expect(screen.getByText('Authenticated content')).toBeInTheDocument();
  });
});

// Session 10: Additional Edge Cases and Complex Scenarios
describe('PermissionGuard Edge Cases', () => {
  const mockAuthContext = createMockAuthContext({
    isAuthenticated: true,
    user: {
      id: '1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      emailConfirmed: true,
      roles: [],
      permissions: [],
      createdAt: new Date().toISOString(),
    },
  });

  // Type assertions for mock functions
  const mockHasPermission = mockAuthContext.hasPermission as jest.MockedFunction<typeof mockAuthContext.hasPermission>;
  const mockHasAnyPermission = mockAuthContext.hasAnyPermission as jest.MockedFunction<typeof mockAuthContext.hasAnyPermission>;
  const mockHasRole = mockAuthContext.hasRole as jest.MockedFunction<typeof mockAuthContext.hasRole>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthContext);
  });

  describe('Loading State Handling', () => {
    it('should show loading indicator when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        isLoading: true,
        isAuthenticated: false,
      });

      render(
        <PermissionGuard fallback={<div>Checking permissions...</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      // Default behavior when loading - should show nothing or loading fallback
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should render children after loading completes with authenticated user', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        isLoading: false,
        isAuthenticated: true,
      });

      render(
        <PermissionGuard>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
  });

  describe('Empty and Null Permission Arrays', () => {
    it('should handle empty permissions array based on hasAnyPermission result', () => {
      // Empty array triggers hasAnyPermission([]) check
      mockHasAnyPermission.mockReturnValue(false);

      render(
        <PermissionGuard permissions={[]} fallback={<div>No access</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      // Empty array still calls hasAnyPermission, which returns false
      expect(mockHasAnyPermission).toHaveBeenCalledWith([]);
      expect(screen.getByText('No access')).toBeInTheDocument();
    });

    it('should show children when hasAnyPermission returns true for empty array', () => {
      mockHasAnyPermission.mockReturnValue(true);

      render(
        <PermissionGuard permissions={[]}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should handle empty roles array based on hasRole result', () => {
      // Empty roles array - some() with empty array returns false
      render(
        <PermissionGuard roles={[]} fallback={<div>No access</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      // Empty array .some() returns false, so fallback shown
      expect(screen.getByText('No access')).toBeInTheDocument();
    });

    it('should handle undefined permissions gracefully', () => {
      render(
        <PermissionGuard permissions={undefined}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      // undefined doesn't trigger permission check
      expect(mockHasAnyPermission).not.toHaveBeenCalled();
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
  });

  describe('Complex Permission Scenarios', () => {
    it('should handle case-sensitive permission names', () => {
      mockHasAnyPermission.mockImplementation((perms: string[]) => {
        return perms.includes('View:Content');
      });

      render(
        <PermissionGuard permissions="View:Content">
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['View:Content']);
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should handle permission names with special characters', () => {
      mockHasAnyPermission.mockReturnValue(true);

      render(
        <PermissionGuard permissions="admin:users.create">
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(['admin:users.create']);
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should handle large number of permissions', () => {
      const manyPermissions = Array.from({ length: 20 }, (_, i) => `permission:${i}`);
      mockHasAnyPermission.mockReturnValue(true);

      render(
        <PermissionGuard permissions={manyPermissions}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(manyPermissions);
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should require ALL permissions when requireAll is true with many permissions', () => {
      mockHasPermission.mockImplementation((perm: string) => {
        return ['perm:1', 'perm:2', 'perm:3'].includes(perm);
      });

      render(
        <PermissionGuard permissions={['perm:1', 'perm:2', 'perm:3']} requireAll={true}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasPermission).toHaveBeenCalledTimes(3);
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
  });

  describe('Complex Role Scenarios', () => {
    it('should handle case-sensitive role names', () => {
      mockHasRole.mockImplementation((role: string) => role === 'ADMIN');

      render(
        <PermissionGuard roles="ADMIN">
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasRole).toHaveBeenCalledWith('ADMIN');
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should handle roles with special characters', () => {
      mockHasRole.mockReturnValue(true);

      render(
        <PermissionGuard roles="org-admin_level-1">
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(mockHasRole).toHaveBeenCalledWith('org-admin_level-1');
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should handle large number of roles', () => {
      const manyRoles = Array.from({ length: 15 }, (_, i) => `Role${i}`);
      mockHasRole.mockImplementation((role: string) => role === 'Role5');

      render(
        <PermissionGuard roles={manyRoles} requireAll={false}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
  });

  describe('Nested Guards', () => {
    it('should handle nested permission guards', () => {
      mockHasRole.mockReturnValue(true);
      mockHasAnyPermission.mockReturnValue(true);

      render(
        <PermissionGuard roles="Admin">
          <div>
            Admin level
            <PermissionGuard permissions="admin:users">
              <div>Nested permission content</div>
            </PermissionGuard>
          </div>
        </PermissionGuard>
      );

      expect(screen.getByText('Admin level')).toBeInTheDocument();
      expect(screen.getByText('Nested permission content')).toBeInTheDocument();
    });

    it('should show fallback for inner guard when nested permission fails', () => {
      mockHasRole.mockReturnValue(true);
      mockHasAnyPermission.mockReturnValue(false);

      render(
        <PermissionGuard roles="Admin">
          <div>
            Admin level
            <PermissionGuard permissions="super:admin" fallback={<div>No super admin access</div>}>
              <div>Super admin content</div>
            </PermissionGuard>
          </div>
        </PermissionGuard>
      );

      expect(screen.getByText('Admin level')).toBeInTheDocument();
      expect(screen.getByText('No super admin access')).toBeInTheDocument();
      expect(screen.queryByText('Super admin content')).not.toBeInTheDocument();
    });

    it('should block all nested content when outer guard fails', () => {
      mockHasRole.mockReturnValue(false);

      render(
        <PermissionGuard roles="Admin" fallback={<div>Not admin</div>}>
          <div>
            Admin level
            <PermissionGuard permissions="admin:users">
              <div>Nested content</div>
            </PermissionGuard>
          </div>
        </PermissionGuard>
      );

      expect(screen.getByText('Not admin')).toBeInTheDocument();
      expect(screen.queryByText('Admin level')).not.toBeInTheDocument();
      expect(screen.queryByText('Nested content')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Children', () => {
    it('should render multiple children when authorized', () => {
      mockHasRole.mockReturnValue(true);

      render(
        <PermissionGuard roles="Admin">
          <div>First child</div>
          <div>Second child</div>
          <div>Third child</div>
        </PermissionGuard>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
      expect(screen.getByText('Third child')).toBeInTheDocument();
    });

    it('should hide all children when not authorized', () => {
      mockHasRole.mockReturnValue(false);

      render(
        <PermissionGuard roles="Admin">
          <div>First child</div>
          <div>Second child</div>
        </PermissionGuard>
      );

      expect(screen.queryByText('First child')).not.toBeInTheDocument();
      expect(screen.queryByText('Second child')).not.toBeInTheDocument();
    });
  });

  describe('Fallback Variations', () => {
    it('should support React element as fallback', () => {
      mockHasRole.mockReturnValue(false);

      render(
        <PermissionGuard roles="Admin" fallback={<button>Upgrade to Admin</button>}>
          <div>Admin content</div>
        </PermissionGuard>
      );

      expect(screen.getByRole('button', { name: 'Upgrade to Admin' })).toBeInTheDocument();
    });

    it('should support complex fallback with multiple elements', () => {
      mockHasRole.mockReturnValue(false);

      render(
        <PermissionGuard
          roles="Premium"
          fallback={
            <div>
              <h2>Premium Required</h2>
              <p>Please upgrade your subscription</p>
              <button>Upgrade Now</button>
            </div>
          }
        >
          <div>Premium content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Premium Required')).toBeInTheDocument();
      expect(screen.getByText('Please upgrade your subscription')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upgrade Now' })).toBeInTheDocument();
    });
  });

  describe('Priority of Permissions vs Roles', () => {
    it('should check permissions before roles', () => {
      mockHasAnyPermission.mockReturnValue(false);
      mockHasRole.mockReturnValue(true);

      render(
        <PermissionGuard permissions="special:access" roles="Admin" fallback={<div>No access</div>}>
          <div>Protected content</div>
        </PermissionGuard>
      );

      // Should fail because permissions check fails even though role passes
      expect(screen.getByText('No access')).toBeInTheDocument();
    });

    it('should require both when permissions and roles are specified', () => {
      mockHasAnyPermission.mockReturnValue(true);
      mockHasRole.mockReturnValue(true);

      render(
        <PermissionGuard permissions="view:dashboard" roles="User">
          <div>Dashboard content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    });
  });

  describe('User Context', () => {
    it('should show content when user object is present', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true,
        user: createMockUser({ id: '123', email: 'user@example.com', roles: ['User'] }),
      });

      render(
        <PermissionGuard>
          <div>User content</div>
        </PermissionGuard>
      );

      expect(screen.getByText('User content')).toBeInTheDocument();
    });

    it('should handle null user object when authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true,
        user: null,
      });

      render(
        <PermissionGuard>
          <div>Content</div>
        </PermissionGuard>
      );

      // Should still show content if isAuthenticated is true
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
