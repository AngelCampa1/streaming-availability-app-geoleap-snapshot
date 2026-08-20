'use client';

import React, { useState, useEffect } from 'react';
import { AdminNavigationBar } from '@/components/admin/AdminNavigationBar';
import { UnifiedAdminDashboard } from '@/components/admin/UnifiedAdminDashboard';
import { MobileAdminDashboard } from '@/components/admin/MobileAdminDashboard';
import { useAuth } from '@/contexts/AuthContext';

interface AdminDashboardPageProps {
  searchParams?: Promise<{
    view?: string;
    layout?: string;
  }>;
}

// BUG-008 FIX: Admin page skeleton to prevent CLS
function AdminSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton with fixed width */}
      <div className="w-64 min-w-[256px] bg-muted/30 border-r animate-pulse">
        <div className="p-4 space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 p-6 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const { user, isLoading: authLoading } = useAuth();
  // BUG-008 FIX: SSR-safe initial device detection
  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  type AdminTheme = 'light';
  const [theme, setTheme] = useState<AdminTheme>('light');
  const [resolvedSearchParams, setResolvedSearchParams] = useState<{ view?: string; layout?: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // BUG-008 FIX: Track mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Resolve searchParams Promise
  useEffect(() => {
    if (searchParams) {
      searchParams.then(setResolvedSearchParams);
    }
  }, [searchParams]);

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

  // BUG-008 FIX: Show skeleton while loading to prevent CLS
  if (!mounted || authLoading) {
    return <AdminSkeleton />;
  }

  // Get user permissions (in real app, this would come from auth context)
  const userPermissions = [
    'dashboard.view',
    'users.view',
    'users.edit',
    'subscriptions.view',
    'support.view',
    'analytics.view',
    'system.view',
  ];

  const userRole = user?.roles?.[0] || 'admin';

  return (
    <div className={`flex h-screen bg-background ${theme}`}>
      {/* Navigation Sidebar - BUG-008 FIX: Add min-width to prevent layout shifts */}
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
            defaultLayout={resolvedSearchParams?.layout}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
