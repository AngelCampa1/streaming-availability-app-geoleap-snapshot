import React from 'react';
import { usePathname } from 'next/navigation';
import { Breadcrumb, useBreadcrumbs } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  className?: string;
  showBreadcrumbs?: boolean;
}

/**
 * Standard page layout with optional breadcrumbs
 * UI-021: Breadcrumb navigation integration
 */
export function PageLayout({
  children,
  title,
  description,
  breadcrumbs: customBreadcrumbs,
  actions,
  className,
  showBreadcrumbs = true,
}: PageLayoutProps) {
  const pathname = usePathname();
  const { generateBreadcrumbs } = useBreadcrumbs();

  // Generate breadcrumbs from pathname if not provided
  const breadcrumbs = customBreadcrumbs || (pathname ? generateBreadcrumbs(pathname) : []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Breadcrumbs */}
      {showBreadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}

      {/* Page Header */}
      {(title || description || actions) && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Page Content */}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
