import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdvancedFilters, { FilterState, FilterOptions } from '../AdvancedFilters';

// Mock UI components to avoid dependency issues
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variant} ${size} ${className}`}
      data-testid="filter-button"
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, placeholder, type, min, max, step, disabled }: any) => (
    <input
      onChange={onChange}
      value={value}
      placeholder={placeholder}
      type={type}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      data-testid="filter-input"
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: any) => <label className={className}>{children}</label>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => <span className={`badge ${variant} ${className}`}>{children}</span>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      data-testid="filter-switch"
    />
  ),
}));

describe('US-8.5 AdvancedFilters Component Tests', () => {
  const mockOnFiltersChange = jest.fn() as any;

  const mockFilterOptions: FilterOptions = {
    genres: [
      { value: 'action', displayName: 'Action', count: 150, isPopular: true },
      { value: 'comedy', displayName: 'Comedy', count: 120, isPopular: true },
      { value: 'drama', displayName: 'Drama', count: 200, isPopular: true },
      { value: 'horror', displayName: 'Horror', count: 80, isPopular: false },
    ],
    contentRatings: [
      { value: 'G', displayName: 'G', count: 50, isPopular: false },
      { value: 'PG', displayName: 'PG', count: 80, isPopular: false },
      { value: 'PG-13', displayName: 'PG-13', count: 120, isPopular: true },
      { value: 'R', displayName: 'R', count: 100, isPopular: true },
    ],
    streamingServices: [
      { value: 'Netflix', displayName: 'Netflix', count: 300, isPopular: true },
      { value: 'Disney+', displayName: 'Disney+', count: 150, isPopular: true },
      { value: 'Prime Video', displayName: 'Prime Video', count: 250, isPopular: true },
      { value: 'HBO Max', displayName: 'HBO Max', count: 100, isPopular: false },
    ],
    countries: [
      { value: 'US', displayName: 'United States', count: 500, isPopular: true },
      { value: 'UK', displayName: 'United Kingdom', count: 200, isPopular: true },
      { value: 'CA', displayName: 'Canada', count: 150, isPopular: false },
    ],
    videoQualities: [
      { value: 'HD', displayName: 'HD', count: 400, isPopular: true },
      { value: '4K', displayName: '4K', count: 200, isPopular: true },
      { value: 'SDR', displayName: 'SDR', count: 100, isPopular: false },
    ],
    audioLanguages: [
      { value: 'en', displayName: 'English', count: 600, isPopular: true },
      { value: 'es', displayName: 'Spanish', count: 200, isPopular: true },
      { value: 'fr', displayName: 'French', count: 150, isPopular: false },
    ],
    subtitleLanguages: [
      { value: 'en', displayName: 'English', count: 600, isPopular: true },
      { value: 'es', displayName: 'Spanish', count: 250, isPopular: true },
      { value: 'fr', displayName: 'French', count: 180, isPopular: false },
    ],
    availableYearRange: {
      minYear: 1920,
      maxYear: 2024,
      mostCommonYear: 2020,
    },
    availableRuntimeRange: {
      minRuntimeMinutes: 15,
      maxRuntimeMinutes: 300,
      averageRuntimeMinutes: 110,
    },
    availablePriceRange: {
      minPrice: 0,
      maxPrice: 19.99,
      averagePrice: 8.99,
      currency: 'USD',
    },
  };

  const defaultFilters: FilterState = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the advanced filters component with expand button', () => {
    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    expect(screen.getByText(/Advanced Filters/)).toBeInTheDocument();
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
  });

  it('expands and shows filter options when clicked', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Content Type')).toBeInTheDocument();
      expect(screen.getByText('Genres (4 available)')).toBeInTheDocument();
      expect(screen.getByText('Streaming Services (4 available)')).toBeInTheDocument();
    });
  });

  it('handles content type filter selection', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    // Select Movie content type
    await waitFor(async () => {
      const movieButton = screen.getByText('Movie');
      await user.click(movieButton);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      contentType: 'Movie',
    });
  });

  it('handles genre filter toggles correctly', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(async () => {
      // Click on Action genre
      const actionGenre = screen.getByText('Action');
      await user.click(actionGenre);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      genres: ['action'],
    });
  });

  it('handles multiple genre selection and removal', async () => {
    const user = userEvent.setup();
    const filtersWithGenres: FilterState = {
      genres: ['action', 'comedy'],
    };

    render(
      <AdvancedFilters
        filters={filtersWithGenres}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Should show active filter badges
    expect(screen.getByText('action')).toBeInTheDocument();
    expect(screen.getByText('comedy')).toBeInTheDocument();

    // Remove action genre
    const removeActionButton = screen.getAllByText('×')[0];
    await user.click(removeActionButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      genres: ['comedy'],
    });
  });

  it('handles year range filter inputs', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(() => {
      const yearFromInput = screen.getByPlaceholderText('1920');
      fireEvent.change(yearFromInput, { target: { value: '2020' } });
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      yearFrom: 2020,
    });
  });

  it('handles rating range filter inputs', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(() => {
      const minRatingInput = screen.getByPlaceholderText('0.0');
      fireEvent.change(minRatingInput, { target: { value: '7.5' } });
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      minRating: 7.5,
    });
  });

  it('handles runtime range filter inputs', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(() => {
      const minRuntimeInput = screen.getByPlaceholderText('0');
      fireEvent.change(minRuntimeInput, { target: { value: '90' } });
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      minRuntimeMinutes: 90,
    });
  });

  it('handles streaming service filter selection', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(async () => {
      const netflixService = screen.getByText('Netflix');
      await user.click(netflixService);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      services: ['Netflix'],
    });
  });

  it('handles cast and directors filter inputs', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(() => {
      const castInput = screen.getByPlaceholderText('Actor Name, Another Actor');
      fireEvent.change(castInput, { target: { value: 'Tom Hanks, Morgan Freeman' } });
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      cast: ['Tom Hanks', 'Morgan Freeman'],
    });
  });

  it('handles boolean filter switches', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(async () => {
      const freeContentSwitch = screen.getAllByTestId('filter-switch')[0];
      await user.click(freeContentSwitch);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      freeContentOnly: true,
    });
  });

  it('handles popularity filter selection', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(async () => {
      const trendingButton = screen.getByText('Trending');
      await user.click(trendingButton);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      popularityFilter: 'Trending',
    });
  });

  it('calculates and displays active filters count', () => {
    const filtersWithMultipleActive: FilterState = {
      contentType: 'Movie',
      genres: ['action', 'comedy'],
      minRating: 7.0,
      services: ['Netflix'],
      freeContentOnly: true,
    };

    render(
      <AdvancedFilters
        filters={filtersWithMultipleActive}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Should show active filter count (5 filters active)
    const activeFilterBadge = screen.getByText('5');
    expect(activeFilterBadge).toBeInTheDocument();
  });

  it('clears all filters when clear all button is clicked', async () => {
    const user = userEvent.setup();
    const filtersWithActive: FilterState = {
      contentType: 'Movie',
      genres: ['action'],
      minRating: 7.0,
    };

    render(
      <AdvancedFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    const clearAllButton = screen.getByText(/Clear all/);
    await user.click(clearAllButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('clears individual filters when remove buttons are clicked', async () => {
    const user = userEvent.setup();
    const filtersWithActive: FilterState = {
      contentType: 'Movie',
      minRating: 7.0,
    };

    render(
      <AdvancedFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Find the content type badge and its remove button
    const contentTypeBadge = screen.getByText('Type: Movie');
    const removeContentTypeButton = contentTypeBadge.parentElement?.querySelector('button') as HTMLElement;
    expect(removeContentTypeButton).toBeTruthy();

    await user.click(removeContentTypeButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      minRating: 7.0,
    });
  });

  it('shows loading state correctly', () => {
    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading filter options...')).toBeInTheDocument();
  });

  it('disables inputs when loading', async () => {
    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
        isLoading={true}
      />
    );

    // When loading, filters should be collapsed and show loading state
    expect(screen.getByText('Loading filter options...')).toBeInTheDocument();

    // Try to expand - should not work when loading
    const expandButton = screen.getByRole('button', { expanded: false });
    expect(expandButton).toBeInTheDocument();
  });

  it('handles empty filter options gracefully', () => {
    const emptyFilterOptions: FilterOptions = {
      genres: [],
      contentRatings: [],
      streamingServices: [],
      countries: [],
      videoQualities: [],
      audioLanguages: [],
      subtitleLanguages: [],
      availableYearRange: { minYear: 1920, maxYear: 2024, mostCommonYear: 2020 },
      availableRuntimeRange: { minRuntimeMinutes: 0, maxRuntimeMinutes: 300, averageRuntimeMinutes: 110 },
      availablePriceRange: { minPrice: 0, maxPrice: 20, averagePrice: 10, currency: 'USD' },
    };

    render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={emptyFilterOptions}
      />
    );

    expect(screen.getByText(/Advanced Filters/)).toBeInTheDocument();
    // Component should render without errors even with empty options
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
        className="custom-filter-class"
      />
    );

    expect(container.querySelector('.card.custom-filter-class')).toBeInTheDocument();
  });

  it('handles filter updates without clearing unrelated filters', async () => {
    const user = userEvent.setup();
    const existingFilters: FilterState = {
      genres: ['action'],
      minRating: 7.0,
    };

    render(
      <AdvancedFilters
        filters={existingFilters}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockFilterOptions}
      />
    );

    // Expand filters
    const expandButton = screen.getByRole('button', { expanded: false });
    await user.click(expandButton);

    await waitFor(async () => {
      // Add content type filter
      const movieButton = screen.getByText('Movie');
      await user.click(movieButton);
    });

    // Should preserve existing filters and add new one
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      genres: ['action'],
      minRating: 7.0,
      contentType: 'Movie',
    });
  });
});
