'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SortOption {
  value: string;
  label: string;
  description?: string;
}

export interface SortDropdownProps {
  value: string;
  direction: 'asc' | 'desc';
  onValueChange: (value: string) => void;
  onDirectionChange: (direction: 'asc' | 'desc') => void;
  options: SortOption[];
  disabled?: boolean;
  className?: string;
}

const defaultSortOptions: SortOption[] = [
  {
    value: 'relevance',
    label: 'Relevance',
    description: 'Best match for your search',
  },
  {
    value: 'popularity',
    label: 'Popularity',
    description: 'Most viewed content',
  },
  {
    value: 'rating',
    label: 'Rating',
    description: 'Highest rated first',
  },
  {
    value: 'year',
    label: 'Release Year',
    description: 'Most recent first',
  },
  {
    value: 'title',
    label: 'Title (A-Z)',
    description: 'Alphabetical order',
  },
  {
    value: 'availability',
    label: 'Availability',
    description: 'Most widely available',
  },
  {
    value: 'runtime',
    label: 'Runtime',
    description: 'Duration length',
  },
  {
    value: 'added',
    label: 'Recently Added',
    description: 'Newest additions to platforms',
  },
];

export const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  direction,
  onValueChange,
  onDirectionChange,
  options = defaultSortOptions,
  disabled = false,
  className = '',
}) => {
  const currentOption = options.find(option => option.value === value);

  const handleDirectionToggle = () => {
    onDirectionChange(direction === 'asc' ? 'desc' : 'asc');
  };

  const getSortIcon = () => {
    if (direction === 'asc') {
      return <ArrowUp className="h-3 w-3" />;
    } else {
      return <ArrowDown className="h-3 w-3" />;
    }
  };

  const getSortDirectionLabel = (sortValue: string, currentDirection: 'asc' | 'desc') => {
    switch (sortValue) {
      case 'rating':
        return currentDirection === 'desc' ? 'Highest first' : 'Lowest first';
      case 'year':
        return currentDirection === 'desc' ? 'Newest first' : 'Oldest first';
      case 'title':
        return currentDirection === 'asc' ? 'A to Z' : 'Z to A';
      case 'runtime':
        return currentDirection === 'desc' ? 'Longest first' : 'Shortest first';
      case 'popularity':
        return currentDirection === 'desc' ? 'Most popular' : 'Least popular';
      case 'availability':
        return currentDirection === 'desc' ? 'Most available' : 'Least available';
      case 'added':
        return currentDirection === 'desc' ? 'Recently added' : 'Oldest added';
      default:
        return currentDirection === 'desc' ? 'Descending' : 'Ascending';
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Sort By Dropdown */}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-[140px] sm:w-[160px] md:w-[180px] text-sm">
          <SelectValue placeholder="Sort by...">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{currentOption?.label || 'Sort by...'}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value} className="cursor-pointer">
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                {option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Direction Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDirectionToggle}
        disabled={disabled}
        className="px-2 flex-shrink-0"
        title={`Sort direction: ${getSortDirectionLabel(value, direction)}`}
      >
        {getSortIcon()}
        <span className="sr-only">Toggle sort direction - currently {getSortDirectionLabel(value, direction)}</span>
      </Button>

      {/* Direction Label (visible on larger screens) */}
      <span className="hidden sm:inline-block text-xs text-muted-foreground ml-1">
        {getSortDirectionLabel(value, direction)}
      </span>
    </div>
  );
};

export default SortDropdown;
