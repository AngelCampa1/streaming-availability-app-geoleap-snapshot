'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RotateCcw, X } from 'lucide-react';

export interface ClearFiltersButtonProps {
  onClearFilters: () => void;
  activeFiltersCount: number;
  showConfirmation?: boolean;
  keepQuery?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  disabled?: boolean;
  iconOnly?: boolean;
}

export const ClearFiltersButton: React.FC<ClearFiltersButtonProps> = ({
  onClearFilters,
  activeFiltersCount,
  showConfirmation = true,
  keepQuery = true,
  variant = 'outline',
  size = 'sm',
  className = '',
  disabled = false,
  iconOnly = false,
}) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const handleClearClick = () => {
    if (showConfirmation && activeFiltersCount > 3) {
      setIsConfirmDialogOpen(true);
    } else {
      onClearFilters();
    }
  };

  const handleConfirmedClear = () => {
    onClearFilters();
    setIsConfirmDialogOpen(false);
  };

  const buttonText = iconOnly ? '' : `Clear${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}`;
  const buttonTitle = `Clear ${activeFiltersCount} active filter${activeFiltersCount !== 1 ? 's' : ''}${keepQuery ? ' (keep search query)' : ''}`;

  if (activeFiltersCount === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClearClick}
        disabled={disabled}
        className={`flex items-center gap-1.5 ${className}`}
        title={buttonTitle}
      >
        {variant === 'ghost' || iconOnly ? <X className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
        {!iconOnly && <span className="hidden sm:inline">{buttonText}</span>}
        {!iconOnly && (
          <span className="sm:hidden">{activeFiltersCount > 0 ? `Clear (${activeFiltersCount})` : 'Clear'}</span>
        )}
      </Button>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Filters?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {activeFiltersCount} active filters from your search.
              {keepQuery && ' Your search query will be preserved.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedClear}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear Filters
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClearFiltersButton;
