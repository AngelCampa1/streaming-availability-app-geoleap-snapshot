'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { AdminOnly } from '@/components/auth/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLayoutClientProps {
  children: ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const { user } = useAuth();

  return (
    <AdminOnly
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-4">You don&apos;t have permission to access the admin panel.</p>
            <Link href="/" className="text-primary hover:underline">
              Return to Home
            </Link>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-muted">
        <nav className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex space-x-8">
                  <Link href="/admin" className="text-foreground inline-flex items-center px-1 pt-1 text-sm font-medium">
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/users"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/roles"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    Roles
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    Audit Logs
                  </Link>
                  <Link
                    href="/admin/affiliates"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    Affiliates
                  </Link>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-foreground">
                  {user?.firstName} {user?.lastName}
                </span>
                <Link href="/" className="ml-4 text-sm text-primary hover:underline">
                  Exit Admin
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </AdminOnly>
  );
}
