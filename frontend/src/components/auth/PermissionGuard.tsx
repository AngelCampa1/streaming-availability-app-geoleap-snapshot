'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGuardProps {
  permissions?: string | string[];
  roles?: string | string[];
  requireAll?: boolean; // If true, user must have ALL permissions/roles, otherwise ANY
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permissions,
  roles,
  requireAll = false,
  fallback = null,
  loadingFallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasRole, hasAnyPermission, isAuthenticated, isLoading } = useAuth();

  // Show loading state while auth is being checked to prevent flash of "Access Denied"
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check permissions
  if (permissions) {
    const permissionArray = Array.isArray(permissions) ? permissions : [permissions];

    if (requireAll) {
      // User must have ALL permissions
      const hasAllPermissions = permissionArray.every(permission => hasPermission(permission));
      if (!hasAllPermissions) {
        return <>{fallback}</>;
      }
    } else {
      // User must have ANY of the permissions
      if (!hasAnyPermission(permissionArray)) {
        return <>{fallback}</>;
      }
    }
  }

  // Check roles
  if (roles) {
    const roleArray = Array.isArray(roles) ? roles : [roles];

    if (requireAll) {
      // User must have ALL roles
      const hasAllRoles = roleArray.every(role => hasRole(role));
      if (!hasAllRoles) {
        return <>{fallback}</>;
      }
    } else {
      // User must have ANY of the roles
      const hasAnyRole = roleArray.some(role => hasRole(role));
      if (!hasAnyRole) {
        return <>{fallback}</>;
      }
    }
  }

  return <>{children}</>;
}

// Convenience components for common use cases
interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function AdminOnly({ children, fallback = null, loadingFallback }: AdminOnlyProps) {
  // Default loading state for admin shows a subtle loading indicator
  const defaultLoading = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );

  return (
    <PermissionGuard
      roles={['Admin', 'SuperAdmin']}
      fallback={fallback}
      loadingFallback={loadingFallback ?? defaultLoading}
    >
      {children}
    </PermissionGuard>
  );
}

interface PremiumOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function PremiumOnly({ children, fallback = null, loadingFallback }: PremiumOnlyProps) {
  return (
    <PermissionGuard
      roles={['Premium', 'Admin', 'SuperAdmin']}
      fallback={fallback}
      loadingFallback={loadingFallback}
    >
      {children}
    </PermissionGuard>
  );
}

interface AuthenticatedOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function AuthenticatedOnly({ children, fallback = null, loadingFallback }: AuthenticatedOnlyProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while auth is being checked
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
