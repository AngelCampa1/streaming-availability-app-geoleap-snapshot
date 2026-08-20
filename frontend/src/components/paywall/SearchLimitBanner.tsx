'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchLimitBannerProps {
  searchesUsed: number;
  searchLimit: number;
  className?: string;
}

type BannerVariant = 'gentle' | 'warning' | 'urgent';

function getVariant(searchesUsed: number, searchLimit: number): BannerVariant {
  const remaining = searchLimit - searchesUsed;
  if (remaining <= 0) return 'urgent';
  if (remaining === 1) return 'warning';
  return 'gentle';
}

function getProgressDots(searchesUsed: number, searchLimit: number): React.ReactNode {
  return (
    <div className="flex gap-1">
      {Array.from({ length: searchLimit }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-2 w-2 rounded-full transition-colors',
            i < searchesUsed ? 'bg-current' : 'bg-current/30'
          )}
        />
      ))}
    </div>
  );
}

export function SearchLimitBanner({ searchesUsed, searchLimit, className }: SearchLimitBannerProps) {
  const variant = getVariant(searchesUsed, searchLimit);
  const remaining = Math.max(0, searchLimit - searchesUsed);

  // Don't show banner for users with 3+ remaining searches (first 2 searches)
  if (remaining >= 3) {
    return null;
  }

  const variantStyles = {
    gentle: 'bg-muted/50 text-muted-foreground border-border',
    warning: 'bg-warning/10 text-warning border-warning/30',
    urgent: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  const getMessage = () => {
    if (remaining === 0) {
      return (
        <>
          <Zap className="h-4 w-4" />
          <span>Start 30-Day Free Trial</span>
        </>
      );
    }
    if (remaining === 1) {
      return (
        <>
          <AlertTriangle className="h-4 w-4" />
          <span>Last search! Don&apos;t miss your next discovery</span>
        </>
      );
    }
    return (
      <>
        {getProgressDots(searchesUsed, searchLimit)}
        <span>{remaining} searches left today</span>
        <span className="text-xs">Don&apos;t lose unlimited access</span>
      </>
    );
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center gap-2">
        {getMessage()}
      </div>
      <Link
        href="/upgrade"
        className={cn(
          'text-xs font-medium hover:underline',
          variant === 'gentle' && 'text-primary',
          variant === 'warning' && 'text-warning',
          variant === 'urgent' && 'text-destructive'
        )}
      >
        Upgrade
      </Link>
    </div>
  );
}

export default SearchLimitBanner;
