import * as React from 'react';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
  showHome?: boolean;
}

/**
 * Accessible breadcrumb navigation component
 * Implements ARIA best practices for breadcrumbs
 * UI-021: Breadcrumb navigation
 */
export function Breadcrumb({
  items,
  className,
  separator = <ChevronRightIcon className="h-4 w-4" />,
  showHome = true,
}: BreadcrumbProps) {
  const allItems = showHome ? [{ label: 'Home', href: '/', icon: <HomeIcon className="h-4 w-4" /> }, ...items] : items;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-1 text-sm', className)}>
      <ol className="flex items-center space-x-1" role="list">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={`${item.href}-${index}`} className="flex items-center space-x-1">
              {!isFirst && (
                <span className="text-muted-foreground" aria-hidden="true">
                  {separator}
                </span>
              )}

              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    'inline-flex items-center space-x-1 hover:text-foreground transition-colors',
                    'text-muted-foreground hover:underline',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm px-1'
                  )}
                >
                  {'icon' in item && item.icon}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center space-x-1',
                    isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                  {...(isLast && { 'aria-current': 'page' })}
                >
                  {'icon' in item && item.icon}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Compact breadcrumb variant for mobile
 */
export function BreadcrumbMobile({ items, className }: Omit<BreadcrumbProps, 'separator' | 'showHome'>) {
  const currentItem = items[items.length - 1];
  const parentItem = items.length > 1 ? items[items.length - 2] : null;

  if (!parentItem) {
    return (
      <div className={cn('flex items-center text-sm font-medium', className)}>
        <span>{currentItem.label}</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2 text-sm', className)}>
      {parentItem.href ? (
        <Link
          href={parentItem.href}
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
          <span>{parentItem.label}</span>
        </Link>
      ) : (
        <span className="text-muted-foreground flex items-center space-x-1">
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
          <span>{parentItem.label}</span>
        </span>
      )}
    </nav>
  );
}

/**
 * Breadcrumb separator component
 */
export function BreadcrumbSeparator({ className }: { className?: string }) {
  return <ChevronRightIcon className={cn('h-4 w-4 text-muted-foreground', className)} aria-hidden="true" />;
}

/**
 * Hook to generate breadcrumbs from pathname
 */
export function useBreadcrumbs() {
  const generateBreadcrumbs = React.useCallback(
    (pathname: string, customLabels?: Record<string, string>): BreadcrumbItem[] => {
      const segments = pathname.split('/').filter(Boolean);

      return segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;

        // Convert segment to readable label
        const defaultLabel = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        const label = customLabels?.[segment] || defaultLabel;

        return {
          label,
          href: isLast ? undefined : href,
          current: isLast,
        };
      });
    },
    []
  );

  return { generateBreadcrumbs };
}
