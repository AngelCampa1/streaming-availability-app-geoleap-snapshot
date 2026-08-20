/**
 * SearchError Integration Tests
 *
 * Tests search-specific error components with real rendering logic.
 * Only mocks Button component, not search logic.
 *
 * Coverage Target: 60%+
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchError, SearchErrorInline, useSearchError } from '../SearchError';

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('SearchError Component', () => {
  describe('Error Type Rendering', () => {
    it('renders no-results error type', () => {
      render(<SearchError type="no-results" />);

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText(/We couldn't find any content matching your search/)).toBeInTheDocument();
    });

    it('renders search-failed error type', () => {
      render(<SearchError type="search-failed" />);

      expect(screen.getByText('Search temporarily unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Our search service is experiencing issues/)).toBeInTheDocument();
    });

    it('renders invalid-query error type', () => {
      render(<SearchError type="invalid-query" />);

      expect(screen.getByText('Invalid search query')).toBeInTheDocument();
      expect(screen.getByText(/Your search query contains invalid characters/)).toBeInTheDocument();
    });

    it('renders service-unavailable error type', () => {
      render(<SearchError type="service-unavailable" />);

      expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Our search service is currently under maintenance/)).toBeInTheDocument();
    });

    it('renders rate-limited error type', () => {
      render(<SearchError type="rate-limited" />);

      expect(screen.getByText('Too many search requests')).toBeInTheDocument();
      expect(screen.getByText(/You've reached the search limit/)).toBeInTheDocument();
    });
  });

  describe('Query Display', () => {
    it('displays query in error message', () => {
      render(<SearchError type="no-results" query="batman" />);

      expect(screen.getByText('"batman"')).toBeInTheDocument();
    });

    it('shows adjusted message when query is provided', () => {
      render(<SearchError type="no-results" query="test query" />);

      expect(screen.getByText(/Try searching for something else or adjusting your filters/)).toBeInTheDocument();
    });

    it('shows default message when no query provided', () => {
      render(<SearchError type="search-failed" />);

      expect(screen.queryByText(/Try searching for something else/)).not.toBeInTheDocument();
    });
  });

  describe('Search Tips Section', () => {
    it('renders search tips toggle button', () => {
      render(<SearchError type="no-results" />);

      expect(screen.getByText('Search Tips')).toBeInTheDocument();
    });

    it('expands tips when toggle clicked', () => {
      render(<SearchError type="no-results" />);

      const toggle = screen.getByText('Search Tips');
      fireEvent.click(toggle);

      // Check for tips specific to no-results
      expect(screen.getByText(/Try different or more general search terms/)).toBeInTheDocument();
      expect(screen.getByText(/Check your spelling/)).toBeInTheDocument();
    });

    it('collapses tips when toggle clicked again', () => {
      render(<SearchError type="no-results" />);

      const toggle = screen.getByText('Search Tips');
      fireEvent.click(toggle); // Expand
      fireEvent.click(toggle); // Collapse

      expect(screen.queryByText(/Try different or more general search terms/)).not.toBeInTheDocument();
    });

    it('shows type-specific tips for search-failed', () => {
      render(<SearchError type="search-failed" />);

      const toggle = screen.getByText('Search Tips');
      fireEvent.click(toggle);

      expect(screen.getByText(/Try again in a few moments/)).toBeInTheDocument();
      expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('shows Try Again button for no-results with query', () => {
      render(<SearchError type="no-results" query="test" onRetrySearch={jest.fn()} />);

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('calls onRetrySearch with query when Try Again clicked', () => {
      const onRetrySearch = jest.fn();
      render(<SearchError type="no-results" query="batman" onRetrySearch={onRetrySearch} />);

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      expect(onRetrySearch).toHaveBeenCalledWith('batman');
    });

    it('uses originalQuery when query is empty', () => {
      const onRetrySearch = jest.fn();
      render(<SearchError type="no-results" query="" originalQuery="original" onRetrySearch={onRetrySearch} />);

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      expect(onRetrySearch).toHaveBeenCalledWith('original');
    });

    it('disables Try Again when no query or originalQuery', () => {
      render(<SearchError type="no-results" onRetrySearch={jest.fn()} />);

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeDisabled();
    });

    it('shows Clear Filters button when onClearFilters provided', () => {
      render(<SearchError type="no-results" onClearFilters={jest.fn()} />);

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('calls onClearFilters when Clear Filters clicked', () => {
      const onClearFilters = jest.fn();
      render(<SearchError type="no-results" onClearFilters={onClearFilters} />);

      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });

    it('shows New Search button for invalid-query', () => {
      render(<SearchError type="invalid-query" onNewSearch={jest.fn()} />);

      expect(screen.getByText('New Search')).toBeInTheDocument();
    });

    it('calls onNewSearch when New Search clicked', () => {
      const onNewSearch = jest.fn();
      render(<SearchError type="invalid-query" onNewSearch={onNewSearch} />);

      const newSearchButton = screen.getByText('New Search');
      fireEvent.click(newSearchButton);

      expect(onNewSearch).toHaveBeenCalledTimes(1);
    });

    it('shows Upgrade to Premium button for rate-limited', () => {
      render(<SearchError type="rate-limited" />);

      expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
    });

    it('shows Get Help button when onContactSupport provided', () => {
      render(<SearchError type="search-failed" onContactSupport={jest.fn()} />);

      expect(screen.getByText('Get Help')).toBeInTheDocument();
    });

    it('calls onContactSupport when Get Help clicked', () => {
      const onContactSupport = jest.fn();
      render(<SearchError type="search-failed" onContactSupport={onContactSupport} />);

      const helpButton = screen.getByText('Get Help');
      fireEvent.click(helpButton);

      expect(onContactSupport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Suggestions Section', () => {
    it('shows suggestions section for no-results type', () => {
      render(<SearchError type="no-results" />);

      expect(screen.getByText('Popular Searches')).toBeInTheDocument();
    });

    it('does not show suggestions for other error types', () => {
      render(<SearchError type="search-failed" />);

      expect(screen.queryByText('Popular Searches')).not.toBeInTheDocument();
    });

    it('hides suggestions when showAlternatives is false', () => {
      render(<SearchError type="no-results" showAlternatives={false} />);

      expect(screen.queryByText('Popular Searches')).not.toBeInTheDocument();
    });

    it('displays custom suggestions when provided', () => {
      const suggestions = ['Better Call Saul', 'El Camino', 'Narcos'];
      render(<SearchError type="no-results" suggestions={suggestions} onRetrySearch={jest.fn()} />);

      expect(screen.getByText('Did you mean?')).toBeInTheDocument();
      expect(screen.getByText('Better Call Saul')).toBeInTheDocument();
      expect(screen.getByText('El Camino')).toBeInTheDocument();
    });

    it('limits custom suggestions to 6 items', () => {
      const suggestions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      render(<SearchError type="no-results" suggestions={suggestions} onRetrySearch={jest.fn()} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('F')).toBeInTheDocument();
      expect(screen.queryByText('G')).not.toBeInTheDocument();
      expect(screen.queryByText('H')).not.toBeInTheDocument();
    });

    it('calls onRetrySearch when suggestion clicked', () => {
      const onRetrySearch = jest.fn();
      const suggestions = ['Peaky Blinders'];
      render(<SearchError type="no-results" suggestions={suggestions} onRetrySearch={onRetrySearch} />);

      const suggestionButton = screen.getByText('Peaky Blinders');
      fireEvent.click(suggestionButton);

      expect(onRetrySearch).toHaveBeenCalledWith('Peaky Blinders');
    });

    it('renders popular suggestions', () => {
      render(<SearchError type="no-results" />);

      expect(screen.getByText('The Office')).toBeInTheDocument();
      expect(screen.getByText('Stranger Things')).toBeInTheDocument();
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    });

    it('calls onRetrySearch when popular suggestion clicked', () => {
      const onRetrySearch = jest.fn();
      render(<SearchError type="no-results" onRetrySearch={onRetrySearch} />);

      const popularButton = screen.getByText('The Office');
      fireEvent.click(popularButton);

      expect(onRetrySearch).toHaveBeenCalledWith('The Office');
    });

    it('renders advanced search tips', () => {
      render(<SearchError type="no-results" />);

      expect(screen.getByText('Advanced Search Tips')).toBeInTheDocument();
      expect(screen.getByText(/Use quotes for exact phrases/)).toBeInTheDocument();
    });
  });

  describe('Severity Styling', () => {
    it('applies info severity styles for no-results', () => {
      const { container } = render(<SearchError type="no-results" />);

      const tipsSection = container.querySelector('.bg-info\\/10');
      expect(tipsSection).toBeInTheDocument();
    });

    it('applies warning severity styles for search-failed', () => {
      const { container } = render(<SearchError type="search-failed" />);

      const tipsSection = container.querySelector('.bg-warning\\/10');
      expect(tipsSection).toBeInTheDocument();
    });

    it('applies error severity styles for invalid-query', () => {
      const { container } = render(<SearchError type="invalid-query" />);

      const tipsSection = container.querySelector('.bg-error\\/10');
      expect(tipsSection).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(<SearchError type="no-results" className="custom-error" />);

      expect(container.firstChild).toHaveClass('custom-error');
    });
  });
});

describe('SearchErrorInline Component', () => {
  it('renders with compact layout', () => {
    const { container } = render(<SearchErrorInline type="no-results" />);

    expect(container.querySelector('.flex.items-center.justify-between')).toBeInTheDocument();
  });

  it('displays error title and message', () => {
    render(<SearchErrorInline type="search-failed" />);

    expect(screen.getByText('Search temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Our search service is experiencing issues/)).toBeInTheDocument();
  });

  it('shows retry button when onRetry provided and retry action available', () => {
    render(<SearchErrorInline type="search-failed" onRetry={jest.fn()} />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('does not show retry button when onRetry not provided', () => {
    render(<SearchErrorInline type="search-failed" />);

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = jest.fn();
    render(<SearchErrorInline type="search-failed" onRetry={onRetry} />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button for error types without retry action', () => {
    render(<SearchErrorInline type="invalid-query" onRetry={jest.fn()} />);

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<SearchErrorInline type="no-results" className="inline-custom" />);

    expect(container.firstChild).toHaveClass('inline-custom');
  });
});

describe('useSearchError Hook', () => {
  it('initializes with null error', () => {
    let result: any;
    function TestComponent() {
      result = useSearchError();
      return null;
    }

    render(<TestComponent />);

    expect(result.error).toBe(null);
  });

  it('provides handleSearchError, clearError, and retryLastSearch functions', () => {
    let result: any;
    function TestComponent() {
      result = useSearchError();
      return null;
    }

    render(<TestComponent />);

    expect(typeof result.handleSearchError).toBe('function');
    expect(typeof result.clearError).toBe('function');
    expect(typeof result.retryLastSearch).toBe('function');
  });

  it('sets error when handleSearchError called', () => {
    let result: any;
    function TestComponent() {
      result = useSearchError();
      return (
        <button onClick={() => result.handleSearchError('no-results', 'batman', 'Custom message', ['suggestion'])}>
          Set Error
        </button>
      );
    }

    render(<TestComponent />);

    const button = screen.getByText('Set Error');
    fireEvent.click(button);

    expect(result.error).toEqual({
      type: 'no-results',
      query: 'batman',
      message: 'Custom message',
      suggestions: ['suggestion'],
    });
  });

  it('clears error when clearError called', () => {
    let result: any;
    function TestComponent() {
      result = useSearchError();
      return (
        <>
          <button onClick={() => result.handleSearchError('search-failed', 'test')}>Set Error</button>
          <button onClick={() => result.clearError()}>Clear Error</button>
        </>
      );
    }

    render(<TestComponent />);

    const setButton = screen.getByText('Set Error');
    const clearButton = screen.getByText('Clear Error');

    fireEvent.click(setButton);
    expect(result.error).not.toBe(null);

    fireEvent.click(clearButton);
    expect(result.error).toBe(null);
  });

  it('returns last search query from retryLastSearch', () => {
    let result: any;
    function TestComponent() {
      result = useSearchError();
      return (
        <button onClick={() => result.handleSearchError('rate-limited', 'batman returns')}>Set Error</button>
      );
    }

    render(<TestComponent />);

    const button = screen.getByText('Set Error');
    fireEvent.click(button);

    expect(result.retryLastSearch()).toBe('batman returns');
  });

  it('returns empty string from retryLastSearch when no error', () => {
    let result: any;
    function TestComponent() {
      result = useSearchError();
      return null;
    }

    render(<TestComponent />);

    expect(result.retryLastSearch()).toBe('');
  });
});

/**
 * COVERAGE TARGET: 60%+
 * Total Tests: 46
 * Tests all 5 error types, actions, suggestions, inline variant, and hook
 */
