'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/lib/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { DEFAULT_PERMISSIONS } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailConfirmed: boolean;
  createdAt: string;
  lastLoginAt?: string;
  roles: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await apiCall<{ users: User[] }>('/api/admin/users');
      setUsers(data.users || []);
    } catch (error) {
      alert('Failed to load users: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const loadRoles = async () => {
    try {
      const data = await apiCall<Role[]>('/api/admin/roles');
      setRoles(data || []);
    } catch (error) {
      alert('Failed to load roles: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, roleName: string) => {
    try {
      await apiCall(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleName }),
      });

      // Refresh users list
      await loadUsers();
      setShowRoleModal(false);
    } catch (error) {
      alert('Failed to assign role: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const removeRole = async (userId: string, roleName: string) => {
    try {
      await apiCall(`/api/admin/users/${userId}/roles/${roleName}`, {
        method: 'DELETE',
      });

      // Refresh users list
      await loadUsers();
    } catch (error) {
      alert('Failed to remove role: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage user accounts and role assignments</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                        <div>
                          <div className="text-sm font-medium text-foreground truncate">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                        <div className="flex items-center">
                          <div
                            className={`h-2 w-2 rounded-full mr-2 ${user.isActive ? 'bg-success' : 'bg-error'}`}
                          ></div>
                          <span className="text-sm text-foreground">{user.isActive ? 'Active' : 'Inactive'}</span>
                          {user.emailConfirmed && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                              Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap max-w-sm">
                        <div className="flex flex-wrap gap-1 truncate">
                          {user.roles.map(role => (
                            <span
                              key={role}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary truncate"
                            >
                              {role}
                              <PermissionGuard permissions={DEFAULT_PERMISSIONS.ADMIN_USERS_MANAGE}>
                                <button
                                  onClick={() => removeRole(user.id, role)}
                                  className="ml-1 text-primary hover:text-primary/80"
                                >
                                  ×
                                </button>
                              </PermissionGuard>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground max-w-xs truncate">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground max-w-xs truncate">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium max-w-xs truncate">
                        <PermissionGuard permissions={DEFAULT_PERMISSIONS.ADMIN_USERS_MANAGE}>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRoleModal(true);
                            }}
                            className="text-primary hover:text-primary/80"
                          >
                            Assign Role
                          </button>
                        </PermissionGuard>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-border w-96 shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Assign Role to {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <div className="space-y-2">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => assignRole(selectedUser.id, role.name)}
                    disabled={selectedUser.roles.includes(role.name)}
                    className={`w-full text-left p-3 border rounded-full ${
                      selectedUser.roles.includes(role.name)
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                  >
                    <div className="font-medium">{role.name}</div>
                    <div className="text-sm text-muted-foreground">{role.description}</div>
                    {selectedUser.roles.includes(role.name) && (
                      <div className="text-xs text-success mt-1">Already assigned</div>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded-full hover:bg-muted/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
