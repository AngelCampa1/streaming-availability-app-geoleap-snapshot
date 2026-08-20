'use client';

import React from 'react';
import { AdminNavigationBar } from '@/components/admin/AdminNavigationBar';
import { RealTimeNotifications } from '@/components/admin/RealTimeNotifications';
import { useAuth } from '@/contexts/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();

  const userPermissions = ['notifications.view', 'notifications.manage', 'system.view'];

  const handleNotificationAction = (_notificationId: string, _actionId: string) => {
    // In a real app, this would make API calls to perform the action
    // Action triggered: actionId for notificationId
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminNavigationBar userRole={user?.roles?.[0] || 'admin'} permissions={userPermissions} deviceType="desktop" />

      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <RealTimeNotifications
            maxNotifications={200}
            autoCleanupOld={true}
            onNotificationAction={handleNotificationAction}
          />
        </div>
      </div>
    </div>
  );
}
