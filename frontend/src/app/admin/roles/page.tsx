'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { DEFAULT_PERMISSIONS } from '@/lib/auth';

interface Role {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  priority: number;
  createdAt: string;
  permissions: string[];
  userCount: number;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await apiCall<Role[]>('/api/admin/roles');
      setRoles(data || []);
    } catch (error) {
       
      console.error('Failed to load roles:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await apiCall<Permission[]>('/api/admin/permissions');
      setPermissions(data || []);
    } catch (error) {
       
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'SuperAdmin':
        return 'bg-error/10 text-error';
      case 'Admin':
        return 'bg-warning/10 text-warning';
      case 'Premium':
        return 'bg-primary/20 text-primary';
      case 'User':
        return 'bg-primary/10 text-primary';
      case 'Guest':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-foreground">Roles & Permissions</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage system roles and their associated permissions</p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {roles.map(role => (
          <div key={role.id} className="bg-card shadow rounded-lg">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${getRoleBadgeColor(role.name)}`}
                  >
                    {role.name}
                  </span>
                  {role.isSystemRole && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      System Role
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>
            </div>

            <div className="px-6 py-4">
              <h4 className="text-sm font-medium text-foreground mb-3">Permissions ({role.permissions.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {role.permissions.map(permissionName => {
                  const permission = permissions.find(p => p.name === permissionName);
                  return (
                    <div key={permissionName} className="flex items-center space-x-2 text-sm">
                      <svg className="h-4 w-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-mono text-xs text-foreground">{permissionName}</span>
                      {permission && <span className="text-muted-foreground">({permission.description})</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <PermissionGuard permissions={DEFAULT_PERMISSIONS.ADMIN_ROLES_MANAGE}>
        <div className="mt-8 bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-warning">Role Management</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                System roles are protected and cannot be modified through this interface. Custom role creation and
                modification features will be available in a future update.
              </p>
            </div>
          </div>
        </div>
      </PermissionGuard>

      {/* Permissions Reference */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-foreground mb-4">All Available Permissions</h2>
        <div className="bg-card shadow rounded-lg">
          <div className="divide-y divide-border">
            {permissions.map(permission => (
              <div key={permission.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-foreground font-mono">{permission.name}</h4>
                    <p className="text-sm text-muted-foreground">{permission.description}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{permission.resource}</span> • <span>{permission.action}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
