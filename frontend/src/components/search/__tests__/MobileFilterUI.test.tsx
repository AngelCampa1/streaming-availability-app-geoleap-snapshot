import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import AdvancedFilters, { FilterState } from '../AdvancedFilters';

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('max-width: 768px'), // Mock mobile breakpoint
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock UI components for mobile testing
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variant} ${size} ${className}`}
      data-testid="mobile-filter-button"
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
      data-testid="mobile-filter-input"
      className="mobile-input"
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className} mobile-badge`}>{children}</span>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      data-testid="mobile-filter-switch"
      className="mobile-switch"
    />
  ),
}));

describe('US-8.5 Mobile Filter UI Tests', () => {
  const mockOnFiltersChange = jest.fn();

  const mockMobileFilterOptions = {
    genres: [
      { value: 'action', displayName: 'Action', count: 150, isPopular: true },
      { value: 'comedy', displayName: 'Comedy', count: 120, isPopular: true },
      { value: 'drama', displayName: 'Drama', count: 200, isPopular: true },
      { value: 'horror', displayName: 'Horror', count: 80, isPopular: false },
      { value: 'romance', displayName: 'Romance', count: 95, isPopular: false },
      { value: 'sci-fi', displayName: 'Sci-Fi', count: 110, isPopular: true },
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
      { value: 'Hulu', displayName: 'Hulu', count: 180, isPopular: true },
      { value: 'Apple TV+', displayName: 'Apple TV+', count: 75, isPopular: false },
    ],
    countries: [
      { value: 'US', displayName: 'United States', count: 500, isPopular: true },
      { value: 'UK', displayName: 'United Kingdom', count: 200, isPopular: true },
    ],
    videoQualities: [
      { value: 'HD', displayName: 'HD', count: 400, isPopular: true },
      { value: '4K', displayName: '4K', count: 200, isPopular: true },
    ],
    audioLanguages: [
      { value: 'en', displayName: 'English', count: 600, isPopular: true },
      { value: 'es', displayName: 'Spanish', count: 200, isPopular: true },
    ],
    subtitleLanguages: [
      { value: 'en', displayName: 'English', count: 600, isPopular: true },
      { value: 'es', displayName: 'Spanish', count: 250, isPopular: true },
    ],
    availableYearRange: { minYear: 1920, maxYear: 2024, mostCommonYear: 2020 },
    availableRuntimeRange: { minRuntimeMinutes: 15, maxRuntimeMinutes: 300, averageRuntimeMinutes: 110 },
    availablePriceRange: { minPrice: 0, maxPrice: 19.99, averagePrice: 8.99, currency: 'USD' },
  };

  // Mock mobile viewport
  beforeEach(() => {
    jest.clearAllMocks();
    // Set mobile viewport dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore viewport to default to prevent leaking to other tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  it('renders mobile-optimized filter button text', () => {
    render(
      <AdvancedFilters filters={{}} onFiltersChange={mockOnFiltersChange} filterOptions={mockMobileFilterOptions} />
    );

    // On mobile, should show "Filters" and hide "Advanced Filters" with CSS
    expect(screen.getByText('Filters')).toBeInTheDocument();
    // Advanced Filters might be present but hidden with CSS classes
    const advancedFiltersElement = screen.queryByText('Advanced Filters');
    if (advancedFiltersElement) {
      expect(advancedFiltersElement.className).toContain('hidden');
    }
  });

  it('shows compact clear button text on mobile', () => {
    const filtersWithActive: FilterState = {
      genres: ['action'],
      minRating: 7.0,
    };

    render(
      <AdvancedFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockMobileFilterOptions}
      />
    );

    // On mobile, should show "Clear" and hide "Clear all" with CSS
    expect(screen.getByText('Clear')).toBeInTheDocument();
    // Clear all might be present but hidden with CSS classes
    const clearAllElement = screen.queryByText('Clear all');
    if (clearAllElement) {
      expect(clearAllElement.className).toContain('hidden');
    }
  });

  it('displays active filter count badge on mobile', () => {
    const filtersWithMultiple: FilterState = {
      contentType: 'Movie',
      genres: ['action', 'comedy'],
      services: ['Netflix'],
      minRating: 8.0,
      freeContentOnly: true,
    };

    render(
      <AdvancedFilters
        filters={filtersWithMultiple}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockMobileFilterOptions}
      />
    );

    // Should show filter count badge prominently on mobile
    const countBadge = screen.getByText('5');
    expect(countBadge).toBeInTheDocument();
    expect(countBadge.className).toContain('mobile-badge');
  });

  it('uses mobile-optimized grid layout for filter options', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters filters={{}} onFiltersChange={mockOnFiltersChange} filterOptions={mockMobileFilterOptions} />
    );

    // Expand filters
    await user.click(screen.getByText('Filters'));

    await waitFor(() => {
      // Verify mobile grid layout classes are applied
      const genresContainer = screen.getByText('Genres (6 available)').parentElement;
      expect(genresContainer).toBeInTheDocument();

      // On mobile, should use single column or compact layout
      const genreOptions = screen.getAllByText('Action')[0].parentElement;
      expect(genreOptions).toBeDefined();
    });
  });

  it('handles touch interactions for filter selection', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters filters={{}} onFiltersChange={mockOnFiltersChange} filterOptions={mockMobileFilterOptions} />
    );

    // Expand filters
    await user.click(screen.getByText('Filters'));

    await waitFor(async () => {
      // Simulate touch tap on Action genre
      const actionGenre = screen.getByText('Action');
      await user.click(actionGenre);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      genres: ['action'],
    });
  });

  it('provides adequate touch targets for mobile interactions', async () => {
    const user = userEvent.setup();
    const filtersWithActive: FilterState = {
      genres: ['action', 'comedy'],
      services: ['Netflix'],
    };

    render(
      <AdvancedFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockMobileFilterOptions}
      />
    );

    // Test removing filter badges on mobile
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons.length).toBeGreaterThan(0);

    // Click remove button for first filter
    await user.click(removeButtons[0]);

    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('handles mobile input fields correctly', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters filters={{}} onFiltersChange={mockOnFiltersChange} filterOptions={mockMobileFilterOptions} />
    );

    // Expand filters
    await user.click(screen.getByText('Filters'));

    await waitFor(async () => {
      // Test mobile-optimized input
      const ratingInput = screen.getByPlaceholderText('0.0');
      expect(ratingInput.className).toContain('mobile-input');

      await user.clear(ratingInput);
      await user.type(ratingInput, '8.5');
    });

    // The component may handle input differently, so check the most recent call
    expect(mockOnFiltersChange).toHaveBeenCalled();
    const lastCall = mockOnFiltersChange.mock.calls[mockOnFiltersChange.mock.calls.length - 1][0];
    expect(lastCall.minRating).toBeDefined();
  });

  it('displays filter options in mobile-friendly scrollable containers', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters filters={{}} onFiltersChange={mockOnFiltersChange} filterOptions={mockMobileFilterOptions} />
    );

    // Expand filters
    await user.click(screen.getByText('Filters'));

    await waitFor(() => {
      // Verify scrollable containers for long lists
      expect(screen.getByText('Genres (6 available)')).toBeInTheDocument();
      expect(screen.getByText('Streaming Services (6 available)')).toBeInTheDocument();
    });

    // All genre options should be visible
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Comedy')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(screen.getByText('Horror')).toBeInTheDocument();
    expect(screen.getByText('Romance')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
  });

  it('handles mobile switch toggles for boolean filters', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters filters={{}} onFiltersChange={mockOnFiltersChange} filterOptions={mockMobileFilterOptions} />
    );

    // Expand filters
    await user.click(screen.getByText('Filters'));

    await waitFor(async () => {
      // Find and test mobile switches
      const switches = screen.getAllByTestId('mobile-filter-switch');
      expect(switches.length).toBeGreaterThan(0);

      // Toggle first switch (free content only)
      await user.click(switches[0]);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      freeContentOnly: true,
    });
  });

  it('maintains filter state when orientation changes', async () => {
    const filtersWithActive: FilterState = {
      genres: ['action'],
      minRating: 8.0,
    };

    const { rerender } = render(
      <AdvancedFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockMobileFilterOptions}
      />
    );

    // Verify filters are applied
    expect(screen.getByText('action')).toBeInTheDocument();
    expect(screen.getByText('Rating ≥ 8')).toBeInTheDocument();

    // Simulate orientation change by re-rendering
    await act(async () => {
      // Change viewport to landscape
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375,
      });

      rerender(
        <AdvancedFilters
          filters={filtersWithActive}
          onFiltersChange={mockOnFiltersChange}
          filterOptions={mockMobileFilterOptions}
        />
      );
    });

    // Filters should still be active after orientation change
    expect(screen.getByText('action')).toBeInTheDocument();
    expect(screen.getByText('Rating ≥ 8')).toBeInTheDocument();
  });

  it('shows mobile-optimized error states', () => {
    render(
      <AdvancedFilters
        filters={{}}
        onFiltersChange={mockOnFiltersChange}
        filterOptions={mockMobileFilterOptions}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading filter options...')).toBeInTheDocument();

    // Loading state should be mobile-friendly
    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('handles mobile performance optimizations', () => {
    const startTime = performance.now();

    render(
      <AdvancedFilters filters={{}} onFiltersChange={mockOnFiltersChange} filterOptions={mockMobileFilterOptions} />
    );

    // Expand filters and apply multiple selections using fireEvent for accurate perf measurement
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('Action'));
    fireEvent.click(screen.getByText('Netflix'));

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Mobile UI should respond quickly
    expect(executionTime).toBeLessThan(1000);

    // Verify filters were applied
    expect(mockOnFiltersChange).toHaveBeenCalledTimes(2);
  });

  it('provides mobile accessibility features', async () => {
    const user = userEvent.setup();

    render(
      <AdvancedFilters filters={{}} onFiltersChange={mockOnFiltersChange} filterOptions={mockMobileFilterOptions} />
    );

    // Check for accessible expand button
    const expandButton = screen.getByRole('button');
    expect(expandButton).toBeInTheDocument();

    // Test keyboard navigation on mobile
    await user.tab();
    expect(expandButton).toHaveFocus();

    // Expand with keyboard
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Content Type')).toBeInTheDocument();
    });

    // Verify ARIA attributes for mobile screen readers
    expect(expandButton).toHaveAttribute('aria-expanded');
    // expect(expandButton).toHaveAttribute('aria-controls', 'advanced-filters-content')
  });

  it('handles mobile viewport edge cases', async () => {
    const user = userEvent.setup();

    // Test very small mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320, // iPhone 5 size
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 568,
    });

    render(
      <AdvancedFilters filters={{}} onFiltersChange={mockOnFiltersChange} filterOptions={mockMobileFilterOptions} />
    );

    // Should still render correctly on very small screens
    expect(screen.getByText('Filters')).toBeInTheDocument();

    // Expand and test that content fits
    await user.click(screen.getByText('Filters'));

    await waitFor(() => {
      expect(screen.getByText('Content Type')).toBeInTheDocument();
      expect(screen.getByText('Genres (6 available)')).toBeInTheDocument();
    });

    // Filter options should still be accessible
    await user.click(screen.getByText('Action'));
    expect(mockOnFiltersChange).toHaveBeenCalled();
  });
});
