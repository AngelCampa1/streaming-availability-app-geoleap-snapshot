'use client';

import React from 'react';
import { AdminNavigationBar } from '@/components/admin/AdminNavigationBar';
import { AdvancedUserSearch } from '@/components/admin/AdvancedUserSearch';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomerAccount } from '@/lib/types/support';

export default function UserSearchPage() {
  const { user } = useAuth();

  const userPermissions = ['users.view', 'users.edit', 'users.delete', 'users.create', 'users.export'];

  const handleUserSelect = (_customer: CustomerAccount) => {
    // In a real app, this could navigate to user details or open a modal
    // Selected user information would be displayed in a modal or detail page
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminNavigationBar userRole={user?.roles?.[0] || 'admin'} permissions={userPermissions} deviceType="desktop" />

      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <AdvancedUserSearch onUserSelect={handleUserSelect} permissions={userPermissions} />
        </div>
      </div>
    </div>
  );
}
