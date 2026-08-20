'use client';

import React, { useState, useEffect } from 'react';
import { AdminNavigationBar } from '@/components/admin/AdminNavigationBar';
import { UnifiedAdminDashboard } from '@/components/admin/UnifiedAdminDashboard';
import { MobileAdminDashboard } from '@/components/admin/MobileAdminDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' >('light');
  const resolvedParams = {
    view: searchParams.get('view') || undefined,
    layout: searchParams.get('layout') || undefined,
  };

  // Detect device type
  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
        setSidebarCollapsed(true);
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  // Get user permissions (in real app, this would come from auth context)
  const userPermissions = [
    'dashboard.view',
    'users.view',
    'users.edit',
    'subscriptions.view',
    'support.view',
    'analytics.view',
  ];

  const userRole = user?.roles?.[0] || 'admin';

  return (
    <div className={`flex h-screen bg-muted ${theme}`}>
      {/* Navigation Sidebar */}
      <AdminNavigationBar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        userRole={userRole}
        permissions={userPermissions}
        deviceType={deviceType}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {deviceType === 'mobile' ? (
          <MobileAdminDashboard userRole={userRole} permissions={userPermissions} className="h-full" />
        ) : (
          <UnifiedAdminDashboard
            deviceType={deviceType}
            permissions={userPermissions}
            userRole={userRole}
            defaultLayout={resolvedParams?.layout}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
