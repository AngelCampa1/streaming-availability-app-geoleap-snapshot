// Text Truncation Utility Component
// Provides consistent text overflow handling across the application

import React from 'react';
import { cn } from '@/lib/utils';

export interface TextTruncateProps {
  children: React.ReactNode;
  lines?: 1 | 2 | 3 | 4;
  className?: string;
  title?: string;
}

/**
 * TextTruncate component for handling text overflow with ellipsis
 * Fixes UI-010: Potential text overflow issues
 *
 * @param lines - Number of lines to show before truncating (1-4)
 * @param className - Additional CSS classes
 * @param title - Tooltip text (defaults to children content for accessibility)
 */
export function TextTruncate({ children, lines = 1, className, title }: TextTruncateProps) {
  const lineClampClass = {
    1: 'line-clamp-1',
    2: 'line-clamp-2',
    3: 'line-clamp-3',
    4: 'line-clamp-4',
  }[lines];

  // For single line, use simpler truncate class
  if (lines === 1) {
    return (
      <div className={cn('truncate', className)} title={title || (typeof children === 'string' ? children : undefined)}>
        {children}
      </div>
    );
  }

  // For multi-line, use line-clamp
  return (
    <div
      className={cn(lineClampClass, className)}
      title={title || (typeof children === 'string' ? children : undefined)}
    >
      {children}
    </div>
  );
}

/**
 * Inline text truncation for use within other components
 */
export function TruncatedText({
  text,
  maxLength = 50,
  className,
}: {
  text: string;
  maxLength?: number;
  className?: string;
}) {
  const truncated = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  return (
    <span className={className} title={text}>
      {truncated}
    </span>
  );
}
