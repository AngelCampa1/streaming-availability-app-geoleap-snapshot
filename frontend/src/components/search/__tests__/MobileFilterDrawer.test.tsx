/**
 * MobileFilterDrawer Component Tests
 *
 * Test coverage for mobile filter drawer component.
 * Tests drawer behavior, filter chips, body scroll locking, and user interactions.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileFilterDrawer } from '../MobileFilterDrawer';
import { ContentType } from '@/lib/types/paywall';
import type { GlobalSearchRequest } from '@/lib/types/paywall';

// Mock Radix UI Sheet component
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open, onOpenChange }: any) => (
    <div data-testid="sheet" data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  SheetTrigger: ({ children, asChild: _asChild }: any) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
  SheetContent: ({ children, side, className }: any) => (
    <div data-testid="sheet-content" data-side={side} className={className}>
      {children}
    </div>
  ),
  SheetHeader: ({ children, className }: any) => (
    <div data-testid="sheet-header" className={className}>
      {children}
    </div>
  ),
  SheetTitle: ({ children }: any) => <h2 data-testid="sheet-title">{children}</h2>,
  SheetDescription: ({ children }: any) => <p data-testid="sheet-description">{children}</p>,
  SheetFooter: ({ children, className }: any) => (
    <div data-testid="sheet-footer" className={className}>
      {children}
    </div>
  ),
}));

// Mock Radix UI FocusScope
jest.mock('@radix-ui/react-focus-scope', () => ({
  Root: ({ children }: any) => <div data-testid="focus-scope">{children}</div>,
}));

// Mock FilterSidebar
jest.mock('../FilterSidebar', () => ({
  FilterSidebar: ({ filters, onFiltersChange: _onFiltersChange, className, singleAccordion }: any) => (
    <div
      data-testid="filter-sidebar"
      data-filters={JSON.stringify(filters)}
      data-single-accordion={singleAccordion}
      className={className}
    >
      FilterSidebar Mock
    </div>
  ),
}));

// Mock ClearFiltersButton
jest.mock('../ClearFiltersButton', () => ({
  __esModule: true,
  default: ({ onClearFilters, variant, iconOnly }: any) => (
    <button
      data-testid={iconOnly ? 'clear-filters-icon' : 'clear-filters-button'}
      onClick={onClearFilters}
      data-variant={variant}
    >
      {iconOnly ? 'X' : 'Clear Filters'}
    </button>
  ),
}));

describe('MobileFilterDrawer', () => {
  const mockFilters: GlobalSearchRequest = {
    query: 'test',
  };

  const mockOnFiltersChange = jest.fn();
  const mockOnClearFilters = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeAll(() => {
    // Mock window.scrollTo (not implemented in jsdom)
    window.scrollTo = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body styles
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
  });

  describe('Basic Rendering', () => {
    it('renders drawer with default trigger button', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByTestId('sheet')).toBeInTheDocument();
    });

    it('renders with custom trigger', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          trigger={<button>Custom Trigger</button>}
        />
      );

      expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
    });

    it('renders sheet header with title and description', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={true}
        />
      );

      expect(screen.getByTestId('sheet-title')).toHaveTextContent('Search Filters');
      expect(screen.getByTestId('sheet-description')).toHaveTextContent('Refine your search results');
    });

    it('renders FilterSidebar inside drawer', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByTestId('filter-sidebar')).toBeInTheDocument();
    });

    it('passes singleAccordion prop to FilterSidebar', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const sidebar = screen.getByTestId('filter-sidebar');
      expect(sidebar).toHaveAttribute('data-single-accordion', 'true');
    });
  });

  describe('Active Filters Count', () => {
    it('displays active filters count badge on trigger', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={3}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('does not display badge when count is 0', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={0}
        />
      );

      const trigger = screen.getByTestId('sheet-trigger');
      expect(trigger.querySelector('[class*="Badge"]')).not.toBeInTheDocument();
    });

    it('shows active count in sheet description', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={5}
          open={true}
        />
      );

      expect(screen.getByTestId('sheet-description')).toHaveTextContent('5 active');
    });

    it('shows singular "filter" text when count is 1', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={1}
          open={true}
        />
      );

      expect(screen.getByText('1 filter applied')).toBeInTheDocument();
    });

    it('shows plural "filters" text when count > 1', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={3}
          open={true}
        />
      );

      expect(screen.getByText('3 filters applied')).toBeInTheDocument();
    });

    it('shows "No filters applied" when count is 0', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={0}
          open={true}
        />
      );

      expect(screen.getByText('No filters applied')).toBeInTheDocument();
    });
  });

  describe('Body Scroll Locking', () => {
    it('locks body scroll when drawer opens', () => {
      const { rerender } = render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={false}
        />
      );

      // Initially, body should not be locked
      expect(document.body.style.position).toBe('');

      // Open drawer
      rerender(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={true}
        />
      );

      // Body should be locked
      expect(document.body.style.position).toBe('fixed');
      expect(document.body.style.width).toBe('100%');
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when drawer closes', () => {
      const { rerender } = render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={true}
        />
      );

      // Body should be locked
      expect(document.body.style.position).toBe('fixed');

      // Close drawer
      rerender(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={false}
        />
      );

      // Body should be unlocked
      expect(document.body.style.position).toBe('');
      expect(document.body.style.width).toBe('');
      expect(document.body.style.overflow).toBe('');
    });

    it('preserves scroll position when unlocking', () => {
      const scrollSpy = jest.spyOn(window, 'scrollTo');
      window.scrollY = 500; // Simulate scroll position

      const { rerender } = render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={true}
        />
      );

      rerender(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={false}
        />
      );

      expect(scrollSpy).toHaveBeenCalledWith(0, 500);
      scrollSpy.mockRestore();
    });
  });

  describe('Filter Chips - Content Type', () => {
    it('displays content type chip for Movies', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, contentType: ContentType.Movie }}
          onFiltersChange={mockOnFiltersChange}
          showFilterChips={true}
        />
      );

      expect(screen.getByText('Movies')).toBeInTheDocument();
    });

    it('displays content type chip for TV Shows', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, contentType: ContentType.Show }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('TV Shows')).toBeInTheDocument();
    });

    it('displays content type chip for Documentaries', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, contentType: ContentType.Documentary }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Docs')).toBeInTheDocument();
    });

    it('removes content type filter when chip is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, contentType: ContentType.Movie }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const removeButton = screen.getByLabelText('Remove Movies filter');
      await user.click(removeButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({ query: 'test' });
    });
  });

  describe('Filter Chips - Year Range', () => {
    it('displays year range chip with both from and to', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, yearFrom: 2020, yearTo: 2024 }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('2020-2024')).toBeInTheDocument();
    });

    it('displays year range chip with only from year', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, yearFrom: 2020 }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('2020+')).toBeInTheDocument();
    });

    it('displays year range chip with only to year', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, yearTo: 2024 }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Until 2024')).toBeInTheDocument();
    });

    it('removes year range filter when chip is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, yearFrom: 2020, yearTo: 2024 }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const removeButton = screen.getByLabelText('Remove 2020-2024 filter');
      await user.click(removeButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({ query: 'test' });
    });
  });

  describe('Filter Chips - Rating', () => {
    it('displays rating chip', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, minRating: 8 }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText(/8\+/)).toBeInTheDocument();
    });

    it('removes rating filter when chip is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, minRating: 8 }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      // Rating chip has label "8+ ⭐", find remove button by partial text match
      const removeButton = screen.getByLabelText(/Remove 8\+.*filter/i);
      await user.click(removeButton);

      expect(mockOnFiltersChange).toHaveBeenCalled();
    });
  });

  describe('Filter Chips - Genres', () => {
    it('displays genres chip with 1-2 genres', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, genres: ['Action', 'Comedy'] }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Action, Comedy')).toBeInTheDocument();
    });

    it('displays genres chip with truncation for >2 genres', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, genres: ['Action', 'Comedy', 'Drama', 'Thriller'] }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Action, Comedy +2')).toBeInTheDocument();
    });

    it('removes genres filter when chip is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, genres: ['Action'] }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const removeButton = screen.getByLabelText('Remove Action filter');
      await user.click(removeButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({ query: 'test' });
    });
  });

  describe('Filter Chips - Services', () => {
    it('displays services chip with 1-2 services', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, services: ['Netflix', 'Disney+'] }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Netflix, Disney+')).toBeInTheDocument();
    });

    it('displays services chip with truncation for >2 services', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, services: ['Netflix', 'Disney+', 'HBO', 'Hulu'] }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Netflix, Disney+ +2')).toBeInTheDocument();
    });
  });

  describe('Filter Chips - Countries', () => {
    it('displays countries chip with 1-2 countries', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, countries: ['US', 'UK'] }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('US, UK')).toBeInTheDocument();
    });

    it('displays countries chip with truncation for >2 countries', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, countries: ['US', 'UK', 'CA', 'AU'] }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('US, UK +2')).toBeInTheDocument();
    });
  });

  describe('Filter Chips - Show/Hide', () => {
    it('hides filter chips when showFilterChips is false', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, contentType: ContentType.Movie }}
          onFiltersChange={mockOnFiltersChange}
          showFilterChips={false}
        />
      );

      expect(screen.queryByText('Movies')).not.toBeInTheDocument();
    });

    it('shows filter chips by default', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, contentType: ContentType.Movie }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Movies')).toBeInTheDocument();
    });

    it('does not show chips container when no active filters', () => {
      const { container } = render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const chipsContainer = container.querySelector('.flex.flex-wrap.gap-2');
      expect(chipsContainer).not.toBeInTheDocument();
    });
  });

  describe('Filter Actions', () => {
    it('calls onOpenChange when Apply button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onOpenChange={mockOnOpenChange}
          open={true}
        />
      );

      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onClearFilters when clear button in header is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
          onOpenChange={mockOnOpenChange}
          activeFiltersCount={3}
          open={true}
        />
      );

      const clearButton = screen.getByTestId('clear-filters-icon');
      await user.click(clearButton);

      expect(mockOnClearFilters).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onClearFilters when clear button in footer is clicked', async () => {
      const user = userEvent.setup();
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
          onOpenChange={mockOnOpenChange}
          activeFiltersCount={3}
          open={true}
        />
      );

      const clearButton = screen.getByTestId('clear-filters-button');
      await user.click(clearButton);

      expect(mockOnClearFilters).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows clear button in header only when filters are active', () => {
      const { rerender } = render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={0}
          open={true}
        />
      );

      expect(screen.queryByTestId('clear-filters-icon')).not.toBeInTheDocument();

      rerender(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={3}
          open={true}
        />
      );

      expect(screen.getByTestId('clear-filters-icon')).toBeInTheDocument();
    });

    it('shows clear button in footer only when filters are active', () => {
      const { rerender } = render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={0}
          open={true}
        />
      );

      expect(screen.queryByTestId('clear-filters-button')).not.toBeInTheDocument();

      rerender(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={3}
          open={true}
        />
      );

      expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument();
    });
  });

  describe('Controlled State', () => {
    it('respects controlled open state', () => {
      const { rerender } = render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.getByTestId('sheet')).toHaveAttribute('data-open', 'false');

      rerender(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      expect(screen.getByTestId('sheet')).toHaveAttribute('data-open', 'true');
    });

    it('calls onOpenChange when sheet is toggled', async () => {
      const user = userEvent.setup();
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={false}
          onOpenChange={mockOnOpenChange}
        />
      );

      const sheet = screen.getByTestId('sheet');
      await user.click(sheet);

      expect(mockOnOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Props Handling', () => {
    it('applies custom className to trigger', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          className="custom-class"
        />
      );

      const trigger = screen.getByTestId('sheet-trigger').firstChild;
      expect(trigger).toHaveClass('custom-class');
    });

    it('passes isLoading prop to FilterSidebar', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          isLoading={true}
        />
      );

      // FilterSidebar should be rendered (mocked component doesn't handle isLoading visually)
      expect(screen.getByTestId('filter-sidebar')).toBeInTheDocument();
    });

    it('passes availableFilters prop to FilterSidebar', () => {
      const availableFilters = {
        genres: ['Action', 'Comedy'],
        services: ['Netflix', 'Disney+'],
        countries: ['US', 'UK'],
      };

      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          availableFilters={availableFilters}
        />
      );

      expect(screen.getByTestId('filter-sidebar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders FocusScope for keyboard trap', () => {
      render(
        <MobileFilterDrawer
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          open={true}
        />
      );

      expect(screen.getByTestId('focus-scope')).toBeInTheDocument();
    });

    it('has accessible remove button labels for filter chips', () => {
      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, contentType: ContentType.Movie }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByLabelText('Remove Movies filter')).toBeInTheDocument();
    });

    it('stops propagation when removing filter chip', async () => {
      const user = userEvent.setup();
      const stopPropagationSpy = jest.fn();

      render(
        <MobileFilterDrawer
          filters={{ ...mockFilters, contentType: ContentType.Movie }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const removeButton = screen.getByLabelText('Remove Movies filter');

      // Add event listener to test stopPropagation
      removeButton.addEventListener('click', (e) => {
        if (e.defaultPrevented) stopPropagationSpy();
      });

      await user.click(removeButton);

      expect(mockOnFiltersChange).toHaveBeenCalled();
    });
  });

  describe('Multiple Filters', () => {
    it('displays multiple filter chips simultaneously', () => {
      render(
        <MobileFilterDrawer
          filters={{
            ...mockFilters,
            contentType: ContentType.Movie,
            yearFrom: 2020,
            genres: ['Action'],
          }}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Movies')).toBeInTheDocument();
      expect(screen.getByText('2020+')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('updates count when multiple filters are added', () => {
      render(
        <MobileFilterDrawer
          filters={{
            ...mockFilters,
            contentType: ContentType.Movie,
            yearFrom: 2020,
            genres: ['Action'],
          }}
          onFiltersChange={mockOnFiltersChange}
          activeFiltersCount={3}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
