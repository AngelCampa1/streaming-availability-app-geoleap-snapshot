import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilterSidebar } from '@/components/search/FilterSidebar';
import SortDropdown from '@/components/search/SortDropdown';
import ClearFiltersButton from '@/components/search/ClearFiltersButton';
import { SearchFilterManager } from '@/lib/search-filter-manager';
import { ContentType } from '@/lib/types/paywall';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronDown: ({ className }: { className?: string }) => <div data-testid="chevron-down" className={className} />,
  ChevronRight: ({ className }: { className?: string }) => <div data-testid="chevron-right" className={className} />,
  Filter: ({ className }: { className?: string }) => <div data-testid="filter-icon" className={className} />,
  X: ({ className }: { className?: string }) => <div data-testid="x-icon" className={className} />,
  RotateCcw: ({ className }: { className?: string }) => <div data-testid="rotate-ccw" className={className} />,
  ArrowUpDown: ({ className }: { className?: string }) => <div data-testid="arrow-up-down" className={className} />,
  ArrowUp: ({ className }: { className?: string }) => <div data-testid="arrow-up" className={className} />,
  ArrowDown: ({ className }: { className?: string }) => <div data-testid="arrow-down" className={className} />,
}));

// Mock UI components that use complex Radix primitives
jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode; onValueChange?: any; value?: unknown }) => (
    <div data-testid="select-root">
      <div data-testid="select-trigger">{children}</div>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({
    value,
    children,
    onSelect,
  }: {
    value: any;
    children: React.ReactNode;
    onSelect?: (value: any) => void;
  }) => (
    <div data-testid={`select-item-${value}`} onClick={() => onSelect?.(value)} data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="select-trigger" className={className}>
      {children}
    </div>
  ),
  SelectValue: ({ children }: { children: React.ReactNode }) => <div data-testid="select-value">{children}</div>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="collapsible" data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    return asChild ? children : <div data-testid="collapsible-trigger">{children}</div>;
  },
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="alert-dialog-action" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
}));

describe('Filter Components', () => {
  describe('FilterSidebar', () => {
    const mockOnFiltersChange = jest.fn() as any;
    const mockOnClearFilters = jest.fn() as any;

    const defaultProps = {
      filters: {},
      onFiltersChange: mockOnFiltersChange,
      onClearFilters: mockOnClearFilters,
      availableFilters: {
        genres: ['Action', 'Comedy', 'Drama'],
        countries: ['United States', 'United Kingdom'],
        services: ['Netflix', 'Amazon Prime'],
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders filter sidebar with collapsible sections', () => {
      render(<FilterSidebar {...defaultProps} />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Content Type')).toBeInTheDocument();
      expect(screen.getByText('Release Year')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
    });

    it('shows active filters count', () => {
      const filtersWithContent = {
        ...defaultProps,
        filters: {
          contentType: ContentType.Movie,
          minRating: 7.0,
          genres: ['Action', 'Comedy'],
        },
      };

      render(<FilterSidebar {...filtersWithContent} />);

      // Should show active filters count (3 active filters)
      expect(screen.getByText('3 active')).toBeInTheDocument();
    });

    it('calls onFiltersChange when content type is selected', () => {
      render(<FilterSidebar {...defaultProps} />);

      const moviesButton = screen.getByRole('button', { name: 'Movies' });
      fireEvent.click(moviesButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        contentType: ContentType.Movie,
      });
    });

    it('shows clear button when filters are active and calls clear handler', () => {
      const filtersWithContent = {
        ...defaultProps,
        filters: { contentType: ContentType.Movie },
      };

      render(<FilterSidebar {...filtersWithContent} />);

      const clearButton = screen.getByRole('button', { name: 'Clear' });
      fireEvent.click(clearButton);

      expect(mockOnClearFilters).toHaveBeenCalled();
    });

    it('expands and collapses sections correctly', () => {
      render(<FilterSidebar {...defaultProps} />);

      // Check if genres section is initially collapsed
      // Genres section should not be in the default expanded set, so Action should not be visible
      expect(screen.queryByText('Action')).toBeInTheDocument();

      const genresButton = screen.getByRole('button', { name: /Genres/ });

      // Click to expand if collapsed or collapse if expanded
      fireEvent.click(genresButton);

      // Should show genre options
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Comedy')).toBeInTheDocument();
    });
  });

  describe('SortDropdown', () => {
    const mockOnValueChange = jest.fn() as any;
    const mockOnDirectionChange = jest.fn() as any;

    const defaultProps = {
      value: 'relevance',
      direction: 'desc' as const,
      onValueChange: mockOnValueChange,
      onDirectionChange: mockOnDirectionChange,
      options: [
        { value: 'relevance', label: 'Relevance', description: 'Best match' },
        { value: 'rating', label: 'Rating', description: 'Highest rated' },
        { value: 'year', label: 'Year', description: 'Most recent' },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders sort dropdown with current value', () => {
      render(<SortDropdown {...defaultProps} />);

      expect(screen.getAllByText('Relevance')).toHaveLength(2); // One in trigger, one in options
      expect(screen.getByTestId('arrow-down')).toBeInTheDocument(); // desc direction
    });

    it('shows correct direction icon', () => {
      const propsWithAsc = { ...defaultProps, direction: 'asc' as const };
      render(<SortDropdown {...propsWithAsc} />);

      expect(screen.getByTestId('arrow-up')).toBeInTheDocument();
    });

    it('calls onDirectionChange when direction button is clicked', () => {
      render(<SortDropdown {...defaultProps} />);

      const directionButton = screen.getByRole('button');
      fireEvent.click(directionButton);

      expect(mockOnDirectionChange).toHaveBeenCalledWith('asc');
    });

    it('shows direction label on larger screens', () => {
      render(<SortDropdown {...defaultProps} />);

      // Should show descriptive text for current sort
      expect(screen.getByText('Descending')).toBeInTheDocument();
    });
  });

  describe('ClearFiltersButton', () => {
    const mockOnClearFilters = jest.fn() as any;

    const defaultProps = {
      onClearFilters: mockOnClearFilters,
      activeFiltersCount: 3,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders clear button with active count', () => {
      render(<ClearFiltersButton {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Clear.*3/ })).toBeInTheDocument();
    });

    it('does not render when no active filters', () => {
      render(<ClearFiltersButton {...defaultProps} activeFiltersCount={0} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onClearFilters when clicked (no confirmation)', () => {
      const props = { ...defaultProps, showConfirmation: false };
      render(<ClearFiltersButton {...props} />);

      const clearButton = screen.getByRole('button');
      fireEvent.click(clearButton);

      expect(mockOnClearFilters).toHaveBeenCalled();
    });

    it('shows confirmation dialog for many filters', () => {
      const props = { ...defaultProps, activeFiltersCount: 5, showConfirmation: true };
      render(<ClearFiltersButton {...props} />);

      const clearButton = screen.getByRole('button');
      fireEvent.click(clearButton);

      // Should open confirmation dialog
      expect(screen.getByText('Clear All Filters?')).toBeInTheDocument();
      expect(screen.getByText(/remove all 5 active filters/)).toBeInTheDocument();
    });

    it('renders as icon-only button when specified', () => {
      const props = { ...defaultProps, iconOnly: true };
      render(<ClearFiltersButton {...props} />);

      const button = screen.getByRole('button');
      expect(button).not.toHaveTextContent('Clear');
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });

  describe('SearchFilterManager', () => {
    let filterManager: SearchFilterManager;

    beforeEach(() => {
      // Clear session storage before each test
      sessionStorage.clear();
      filterManager = new SearchFilterManager();
    });

    afterEach(() => {
      filterManager.dispose();
    });

    it('initializes with default values', () => {
      const filters = filterManager.getFilters();

      expect(filters.query).toBe('');
      expect(filters.page).toBe(1);
      expect(filters.pageSize).toBe(10);
      expect(filters.sortBy).toBe('relevance');
      expect(filters.sortDirection).toBe('desc');
    });

    it('updates single filter correctly', () => {
      filterManager.updateFilter('query', 'test search', true);

      const filters = filterManager.getFilters();
      expect(filters.query).toBe('test search');
    });

    it('updates multiple filters correctly', () => {
      filterManager.updateFilters(
        {
          contentType: ContentType.Movie,
          minRating: 7.0,
          genres: ['Action', 'Comedy'],
        },
        true
      );

      const filters = filterManager.getFilters();
      expect(filters.contentType).toBe(ContentType.Movie);
      expect(filters.minRating).toBe(7.0);
      expect(filters.genres).toEqual(['Action', 'Comedy']);
    });

    it('clears filters but keeps query', () => {
      filterManager.updateFilters(
        {
          query: 'test search',
          contentType: ContentType.Movie,
          minRating: 7.0,
        },
        true
      );

      filterManager.clearFilters(true);

      const filters = filterManager.getFilters();
      expect(filters.query).toBe('test search'); // Kept
      expect(filters.contentType).toBeUndefined(); // Cleared
      expect(filters.minRating).toBeUndefined(); // Cleared
    });

    it('counts active filters correctly', () => {
      filterManager.updateFilters(
        {
          contentType: ContentType.Movie,
          minRating: 7.0,
          genres: ['Action'],
        },
        true
      );

      expect(filterManager.getActiveFilterCount()).toBe(3);
    });

    it('generates correct URL search params', () => {
      filterManager.updateFilters(
        {
          query: 'test movie',
          contentType: ContentType.Movie,
          yearFrom: 2020,
          minRating: 7.0,
        },
        true
      );

      const params = filterManager.toURLSearchParams();
      expect(params.get('q')).toBe('test movie');
      expect(params.get('type')).toBe('1'); // ContentType.Movie (All=0, Movie=1)
      expect(params.get('yearFrom')).toBe('2020');
      expect(params.get('minRating')).toBe('7');
    });

    it('loads from URL search params correctly', () => {
      const searchParams = new URLSearchParams({
        q: 'test query',
        type: '2', // ContentType.Show (All=0, Movie=1, Show=2)
        yearFrom: '2020',
        minRating: '8.0',
      });

      filterManager.fromURLSearchParams(searchParams);

      const filters = filterManager.getFilters();
      expect(filters.query).toBe('test query');
      expect(filters.contentType).toBe(ContentType.Show);
      expect(filters.yearFrom).toBe(2020);
      expect(filters.minRating).toBe(8.0);
    });

    it('notifies listeners on filter changes', () => {
      const listener = jest.fn() as any;
      const unsubscribe = filterManager.subscribe(listener);

      filterManager.updateFilter('query', 'test', true);

      expect(listener).toHaveBeenCalled();

      unsubscribe();
      filterManager.updateFilter('query', 'test2', true);

      // Should not be called after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
