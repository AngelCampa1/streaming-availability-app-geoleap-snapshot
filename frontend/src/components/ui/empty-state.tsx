import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  };
  suggestions?: string[];
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  suggestions,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      role="status"
      aria-label={title}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-2">Try:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1 h-1 bg-muted-foreground rounded-full" aria-hidden="true" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {action && (
        <Button
          variant={action.variant || 'default'}
          onClick={action.onClick}
          className="min-h-[44px]"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
