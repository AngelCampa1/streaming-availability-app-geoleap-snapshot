'use client';

import React from 'react';
import { Globe } from 'lucide-react';

interface LanguageFilterWidgetProps {
  onFilterChange: (filterEnabled: boolean) => void;
  matchCount: number;
  totalCount: number;
  initialFilterEnabled?: boolean;
  className?: string;
}

export const LanguageFilterWidget: React.FC<LanguageFilterWidgetProps> = ({
  onFilterChange,
  matchCount,
  totalCount,
  initialFilterEnabled = false,
  className = '',
}) => {
  const [filterEnabled, setFilterEnabled] = React.useState(initialFilterEnabled);

  const handleToggle = () => {
    const newValue = !filterEnabled;
    setFilterEnabled(newValue);
    onFilterChange(newValue);
  };

  const matchPercentage = totalCount > 0 ? Math.round((matchCount / totalCount) * 100) : 0;

  return (
    <div
      className={`flex items-center justify-between p-4 bg-background rounded-lg border border-border shadow-sm ${className}`}
      data-testid="language-filter-widget"
    >
      <div className="flex items-center gap-3">
        <Globe className="h-5 w-5 text-primary" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Filter by My Languages
            </span>
            <button
              type="button"
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                filterEnabled ? 'bg-primary' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={filterEnabled}
              data-testid="language-filter-toggle"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                  filterEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {filterEnabled ? 'Showing only content with your preferred languages' : 'Showing all available content'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <div className="text-2xl font-bold text-primary" data-testid="match-count">
          {filterEnabled ? matchCount : totalCount}
        </div>
        <div className="text-xs text-muted-foreground">
          {filterEnabled ? (
            <>
              of {totalCount} total ({matchPercentage}%)
            </>
          ) : (
            'total results'
          )}
        </div>
      </div>
    </div>
  );
};
