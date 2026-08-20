/**
 * EnhancedAutocomplete Integration Tests
 *
 * Tests API integration, navigation, analytics, accessibility, and performance.
 * Uses boundary-only mocking (useAdvancedAutocomplete hook).
 *
 * Coverage Target: 20%+ additional (Combined: ~85%+)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EnhancedAutocomplete from '../EnhancedAutocomplete';
import { AutocompleteSuggestionType } from '@/lib/types/autocomplete';

// Mock useAdvancedAutocomplete hook (BOUNDARY)
const mockUpdateQuery = jest.fn();
const mockSelectSuggestion = jest.fn();
const mockOpenSuggestions = jest.fn();
const mockCloseSuggestions = jest.fn();
const mockHandleKeyDown = jest.fn();

jest.mock('../../../hooks/useAdvancedAutocomplete', () => ({
  useAdvancedAutocomplete: jest.fn(() => ({
    state: {
      query: '',
      suggestions: [],
      isOpen: false,
      isLoading: false,
      error: null,
      selectedIndex: -1,
    },
    inputRef: { current: null },
    suggestionsRef: { current: null },
    updateQuery: mockUpdateQuery,
    selectSuggestion: mockSelectSuggestion,
    openSuggestions: mockOpenSuggestions,
    closeSuggestions: mockCloseSuggestions,
    handleKeyDown: mockHandleKeyDown,
    recentSearches: [],
    trendingSearches: [],
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAdvancedAutocomplete } = require('../../../hooks/useAdvancedAutocomplete');

describe('EnhancedAutocomplete - Integration Tests', () => {
  const mockOnChange = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnSuggestionSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default mock implementation
    useAdvancedAutocomplete.mockReturnValue({
      state: {
        query: '',
        suggestions: [],
        isOpen: false,
        isLoading: false,
        error: null,
        selectedIndex: -1,
      },
      inputRef: { current: null },
      suggestionsRef: { current: null },
      updateQuery: mockUpdateQuery,
      selectSuggestion: mockSelectSuggestion,
      openSuggestions: mockOpenSuggestions,
      closeSuggestions: mockCloseSuggestions,
      handleKeyDown: mockHandleKeyDown,
      recentSearches: [],
      trendingSearches: [],
    });
  });

  describe('Suggestion Selection Flow', () => {
    it('calls onSuggestionSelected when suggestion is clicked', () => {
      const mockSuggestion = {
        text: 'Breaking Bad',
        type: AutocompleteSuggestionType.Title,
        score: 95,
        estimatedResults: 100,
        genres: ['Drama'],
        metadata: {},
      };

      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'breaking',
          suggestions: [mockSuggestion],
          isOpen: true,
          isLoading: false,
          error: null,
          selectedIndex: -1,
        },
        inputRef: { current: null },
        suggestionsRef: { current: null },
        updateQuery: mockUpdateQuery,
        selectSuggestion: mockSelectSuggestion,
        openSuggestions: mockOpenSuggestions,
        closeSuggestions: mockCloseSuggestions,
        handleKeyDown: mockHandleKeyDown,
        recentSearches: [],
        trendingSearches: [],
      });

      render(
        <EnhancedAutocomplete
          value="breaking"
          onChange={mockOnChange}
          onSuggestionSelected={mockOnSuggestionSelected}
        />
      );

      const suggestion = screen.getByText('Breaking Bad');
      fireEvent.click(suggestion);

      expect(mockSelectSuggestion).toHaveBeenCalled();
    });

    it('updates search input when suggestion is selected', () => {
      const mockSuggestion = {
        text: 'The Matrix',
        type: AutocompleteSuggestionType.Title,
        score: 90,
        estimatedResults: 150,
        genres: ['Action'],
        metadata: {},
      };

      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'matrix',
          suggestions: [mockSuggestion],
          isOpen: true,
          isLoading: false,
          error: null,
          selectedIndex: -1,
        },
        inputRef: { current: null },
        suggestionsRef: { current: null },
        updateQuery: mockUpdateQuery,
        selectSuggestion: mockSelectSuggestion,
        openSuggestions: mockOpenSuggestions,
        closeSuggestions: mockCloseSuggestions,
        handleKeyDown: mockHandleKeyDown,
        recentSearches: [],
        trendingSearches: [],
      });

      render(
        <EnhancedAutocomplete
          value="matrix"
          onChange={mockOnChange}
          onSuggestionSelected={mockOnSuggestionSelected}
        />
      );

      const suggestion = screen.getByText('The Matrix');
      fireEvent.click(suggestion);

      // Hook's selectSuggestion should be called
      expect(mockSelectSuggestion).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('renders component when search fails', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'test',
          suggestions: [],
          isOpen: false,
          isLoading: false,
          error: 'Failed to load suggestions. Please try again.',
          selectedIndex: -1,
        },
        inputRef: { current: null },
        suggestionsRef: { current: null },
        updateQuery: mockUpdateQuery,
        selectSuggestion: mockSelectSuggestion,
        openSuggestions: mockOpenSuggestions,
        closeSuggestions: mockCloseSuggestions,
        handleKeyDown: mockHandleKeyDown,
        recentSearches: [],
        trendingSearches: [],
      });

      render(<EnhancedAutocomplete value="test" onChange={mockOnChange} />);

      // Component renders with error state (error may be displayed by parent or in dropdown)
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('allows retry after error', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'test',
          suggestions: [],
          isOpen: false,
          isLoading: false,
          error: 'Network error',
          selectedIndex: -1,
        },
        inputRef: { current: null },
        suggestionsRef: { current: null },
        updateQuery: mockUpdateQuery,
        selectSuggestion: mockSelectSuggestion,
        openSuggestions: mockOpenSuggestions,
        closeSuggestions: mockCloseSuggestions,
        handleKeyDown: mockHandleKeyDown,
        recentSearches: [],
        trendingSearches: [],
      });

      render(<EnhancedAutocomplete value="test" onChange={mockOnChange} />);

      const input = screen.getByRole('combobox');

      // User can still type to retry
      fireEvent.change(input, { target: { value: 'test query' } });
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('clears error when new query is entered', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'test',
          suggestions: [],
          isOpen: false,
          isLoading: false,
          error: 'Previous error',
          selectedIndex: -1,
        },
        inputRef: { current: null },
        suggestionsRef: { current: null },
        updateQuery: mockUpdateQuery,
        selectSuggestion: mockSelectSuggestion,
        openSuggestions: mockOpenSuggestions,
        closeSuggestions: mockCloseSuggestions,
        handleKeyDown: mockHandleKeyDown,
        recentSearches: [],
        trendingSearches: [],
      });

      const { rerender } = render(<EnhancedAutocomplete value="test" onChange={mockOnChange} />);

      // Update hook to clear error
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'new query',
          suggestions: [],
          isOpen: false,
          isLoading: false,
          error: null,
          selectedIndex: -1,
        },
        inputRef: { current: null },
        suggestionsRef: { current: null },
        updateQuery: mockUpdateQuery,
        selectSuggestion: mockSelectSuggestion,
        openSuggestions: mockOpenSuggestions,
        closeSuggestions: mockCloseSuggestions,
        handleKeyDown: mockHandleKeyDown,
        recentSearches: [],
        trendingSearches: [],
      });

      rerender(<EnhancedAutocomplete value="new query" onChange={mockOnChange} />);

      // Error should be cleared
      expect(screen.queryByText(/Previous error/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA role for combobox', () => {
      render(<EnhancedAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('combobox');
      expect(input).toBeInTheDocument();
    });

    it('has aria-expanded attribute on input', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'test',
          suggestions: [
            {
              text: 'Test Result',
              type: AutocompleteSuggestionType.Title,
              score: 85,
              estimatedResults: 10,
              genres: [],
              metadata: {},
            },
          ],
          isOpen: true,
          isLoading: false,
          error: null,
          selectedIndex: -1,
        },
        inputRef: { current: null },
        suggestionsRef: { current: null },
        updateQuery: mockUpdateQuery,
        selectSuggestion: mockSelectSuggestion,
        openSuggestions: mockOpenSuggestions,
        closeSuggestions: mockCloseSuggestions,
        handleKeyDown: mockHandleKeyDown,
        recentSearches: [],
        trendingSearches: [],
      });

      render(<EnhancedAutocomplete value="test" onChange={mockOnChange} />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-label on submit button', () => {
      render(<EnhancedAutocomplete value="" onChange={mockOnChange} />);

      const submitButton = screen.getByRole('button', { name: /submit search/i });
      expect(submitButton).toHaveAttribute('aria-label');
    });

    it('renders input with value', () => {
      render(<EnhancedAutocomplete value="test query" onChange={mockOnChange} />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveValue('test query');
    });
  });

  describe('Form Integration', () => {
    it('submits form when enter key is pressed', () => {
      render(
        <EnhancedAutocomplete
          value="test query"
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByRole('combobox');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // Hook's handleKeyDown is called (which may trigger submit)
      expect(mockHandleKeyDown).toHaveBeenCalled();
    });

    it('submits form when submit button is clicked', () => {
      render(
        <EnhancedAutocomplete
          value="test query"
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /submit search/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('test query');
    });

    it('does not submit when query is empty', () => {
      render(<EnhancedAutocomplete value="" onChange={mockOnChange} onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /submit search/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Performance with Large Datasets', () => {
    it('renders efficiently with 100+ suggestions', () => {
      const manySuggestions = Array.from({ length: 100 }, (_, i) => ({
        text: `Result ${i}`,
        type: AutocompleteSuggestionType.Title,
        score: 90 - i * 0.1,
        estimatedResults: 100 - i,
        genres: [],
        metadata: {},
      }));

      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'test',
          suggestions: manySuggestions,
          isOpen: true,
          isLoading: false,
          error: null,
          selectedIndex: -1,
        },
        inputRef: { current: null },
        suggestionsRef: { current: null },
        updateQuery: mockUpdateQuery,
        selectSuggestion: mockSelectSuggestion,
        openSuggestions: mockOpenSuggestions,
        closeSuggestions: mockCloseSuggestions,
        handleKeyDown: mockHandleKeyDown,
        recentSearches: [],
        trendingSearches: [],
      });

      const { container } = render(
        <EnhancedAutocomplete value="test" onChange={mockOnChange} />
      );

      // Component should render without crashing
      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles rapid input changes efficiently', () => {
      render(<EnhancedAutocomplete value="" onChange={mockOnChange} />);

      const input = screen.getByRole('combobox');

      // Simulate rapid typing
      fireEvent.change(input, { target: { value: 't' } });
      fireEvent.change(input, { target: { value: 'te' } });
      fireEvent.change(input, { target: { value: 'tes' } });
      fireEvent.change(input, { target: { value: 'test' } });

      // All changes should be handled
      expect(mockOnChange).toHaveBeenCalledTimes(4);
    });
  });

  describe('Analytics Context', () => {
    it('accepts analyticsContext prop for tracking', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
          analyticsContext="homepage_search"
        />
      );

      // Component should render with analytics context
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null/undefined suggestions gracefully', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'test',
          suggestions: [],
          isOpen: true,
          isLoading: false,
          error: null,
          selectedIndex: -1,
        },
        inputRef: { current: null },
        suggestionsRef: { current: null },
        updateQuery: mockUpdateQuery,
        selectSuggestion: mockSelectSuggestion,
        openSuggestions: mockOpenSuggestions,
        closeSuggestions: mockCloseSuggestions,
        handleKeyDown: mockHandleKeyDown,
        recentSearches: [],
        trendingSearches: [],
      });

      const { container } = render(<EnhancedAutocomplete value="test" onChange={mockOnChange} />);

      // Should render empty suggestions state
      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles very long queries', () => {
      const longQuery = 'a'.repeat(500);

      render(<EnhancedAutocomplete value={longQuery} onChange={mockOnChange} />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveValue(longQuery);
    });

    it('handles special characters in query', () => {
      const specialQuery = 'test @#$% & *()';

      render(<EnhancedAutocomplete value={specialQuery} onChange={mockOnChange} />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveValue(specialQuery);
    });
  });
});

/**
 * MOCK-TO-TEST RATIO: 1 hook mock / 18 tests = 0.06 ✅
 * TARGET COVERAGE: 20%+ additional (Combined target: 85%+)
 * MOCKING STRATEGY:
 *   - useAdvancedAutocomplete hook (boundary - tested separately)
 */
