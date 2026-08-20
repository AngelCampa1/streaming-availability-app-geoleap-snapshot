/**
 * MobileFilterDrawer – availableFilters regression test
 *
 * Ensures the mobile drawer receives the shared AVAILABLE_SEARCH_FILTERS
 * constant (non-empty genres/countries/services) rather than empty arrays.
 * This catches the specific bug where the mobile path was hard-coded to
 * { genres: [], countries: [], services: [] }.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MobileFilterDrawer } from '../MobileFilterDrawer';
import { AVAILABLE_SEARCH_FILTERS } from '@/lib/searchFilters';
import type { GlobalSearchRequest } from '@/lib/types/paywall';

// ---------------------------------------------------------------------------
// UI boundary mocks (same pattern as MobileFilterDrawer.test.tsx)
// ---------------------------------------------------------------------------

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (v: boolean) => void }) => (
    <div data-testid="sheet" data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  SheetTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
  SheetContent: ({ children, side, className }: { children: React.ReactNode; side?: string; className?: string }) => (
    <div data-testid="sheet-content" data-side={side} className={className}>
      {children}
    </div>
  ),
  SheetHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sheet-header" className={className}>
      {children}
    </div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2 data-testid="sheet-title">{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="sheet-description">{children}</p>
  ),
  SheetFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sheet-footer" className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@radix-ui/react-focus-scope', () => ({
  Root: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="focus-scope">{children}</div>
  ),
}));

// FilterSidebar mock that exposes the availableFilters it received via a data attribute,
// so we can assert the correct prop was forwarded from the page.
jest.mock('../FilterSidebar', () => ({
  FilterSidebar: ({
    availableFilters,
    singleAccordion,
    className,
  }: {
    filters: GlobalSearchRequest;
    onFiltersChange: () => void;
    availableFilters?: { genres: string[]; countries: string[]; services: string[] };
    singleAccordion?: boolean;
    className?: string;
    isLoading?: boolean;
    onClearFilters?: () => void;
  }) => (
    <div
      data-testid="filter-sidebar"
      data-available-filters={JSON.stringify(availableFilters)}
      data-single-accordion={singleAccordion}
      className={className}
    >
      FilterSidebar Mock
    </div>
  ),
}));

jest.mock('../ClearFiltersButton', () => ({
  __esModule: true,
  default: ({ onClearFilters, iconOnly }: { onClearFilters?: () => void; iconOnly?: boolean; variant?: string; size?: string; activeFiltersCount?: number; showConfirmation?: boolean }) => (
    <button
      data-testid={iconOnly ? 'clear-filters-icon' : 'clear-filters-button'}
      onClick={onClearFilters}
    >
      {iconOnly ? 'X' : 'Clear Filters'}
    </button>
  ),
}));

// ---------------------------------------------------------------------------

const emptyFilters: GlobalSearchRequest = { query: '' };

beforeAll(() => {
  window.scrollTo = jest.fn();
});

describe('MobileFilterDrawer – availableFilters prop forwarding', () => {
  it('passes non-empty genres to FilterSidebar when given AVAILABLE_SEARCH_FILTERS', () => {
    render(
      <MobileFilterDrawer
        filters={emptyFilters}
        onFiltersChange={jest.fn()}
        open={true}
        availableFilters={AVAILABLE_SEARCH_FILTERS}
      />
    );

    const sidebar = screen.getByTestId('filter-sidebar');
    const forwarded = JSON.parse(sidebar.getAttribute('data-available-filters') ?? '{}') as {
      genres: string[];
      countries: string[];
      services: string[];
    };

    expect(forwarded.genres.length).toBeGreaterThan(0);
    expect(forwarded.genres).toContain('Action');
  });

  it('passes non-empty services to FilterSidebar when given AVAILABLE_SEARCH_FILTERS', () => {
    render(
      <MobileFilterDrawer
        filters={emptyFilters}
        onFiltersChange={jest.fn()}
        open={true}
        availableFilters={AVAILABLE_SEARCH_FILTERS}
      />
    );

    const sidebar = screen.getByTestId('filter-sidebar');
    const forwarded = JSON.parse(sidebar.getAttribute('data-available-filters') ?? '{}') as {
      genres: string[];
      countries: string[];
      services: string[];
    };

    expect(forwarded.services.length).toBeGreaterThan(0);
    expect(forwarded.services).toContain('Netflix');
  });

  it('passes non-empty countries to FilterSidebar when given AVAILABLE_SEARCH_FILTERS', () => {
    render(
      <MobileFilterDrawer
        filters={emptyFilters}
        onFiltersChange={jest.fn()}
        open={true}
        availableFilters={AVAILABLE_SEARCH_FILTERS}
      />
    );

    const sidebar = screen.getByTestId('filter-sidebar');
    const forwarded = JSON.parse(sidebar.getAttribute('data-available-filters') ?? '{}') as {
      genres: string[];
      countries: string[];
      services: string[];
    };

    expect(forwarded.countries.length).toBeGreaterThan(0);
    expect(forwarded.countries).toContain('United States');
  });
});
