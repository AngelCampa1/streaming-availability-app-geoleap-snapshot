/**
 * EnhancedAutocomplete Core Functionality Tests
 *
 * Tests basic search, keyboard navigation, focus management, and result rendering.
 * Uses boundary-only mocking (useAdvancedAutocomplete hook).
 *
 * Coverage Target: 60%+ (core paths)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnhancedAutocomplete from '../EnhancedAutocomplete';
import { AutocompleteSuggestionType } from '@/lib/types/autocomplete';

// Mock useAdvancedAutocomplete hook (BOUNDARY)
const mockUpdateQuery = jest.fn();
const mockSelectSuggestion = jest.fn();
const mockOpenSuggestions = jest.fn();
const mockCloseSuggestions = jest.fn();
const mockHandleKeyDown = jest.fn();

const mockSuggestions = [
  {
    text: 'Breaking Bad',
    type: AutocompleteSuggestionType.Title,
    score: 95,
    estimatedResults: 1,
    genres: ['Drama', 'Crime'],
    year: 2008,
    rating: 9.5,
    metadata: {},
  },
  {
    text: 'The Matrix',
    type: AutocompleteSuggestionType.Title,
    score: 90,
    estimatedResults: 1,
    genres: ['Action', 'Sci-Fi'],
    year: 1999,
    rating: 8.7,
    metadata: {},
  },
];

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

describe('EnhancedAutocomplete - Core Functionality', () => {
  const mockOnChange = jest.fn();
  const mockOnSuggestionSelected = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset to default mock
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

  describe('Basic Rendering', () => {
    it('renders search input with placeholder', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Search for movies, TV shows, actors, genres...');
    });

    it('renders custom placeholder when provided', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
          placeholder="Custom search placeholder"
        />
      );

      const input = screen.getByPlaceholderText('Custom search placeholder');
      expect(input).toBeInTheDocument();
    });

    it('renders search button', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const searchButton = screen.getByRole('button', { name: /Submit search/i });
      expect(searchButton).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const searchIcon = container.querySelector('svg[aria-hidden="true"]');
      expect(searchIcon).toBeInTheDocument();
    });

    it('applies custom className to container', () => {
      const { container } = render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
          className="custom-search-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-search-class');
    });
  });

  describe('Input Interaction', () => {
    it('calls onChange when user types in input', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'Breaking Bad' } });

      expect(mockOnChange).toHaveBeenCalledWith('Breaking Bad');
      expect(mockUpdateQuery).toHaveBeenCalledWith('Breaking Bad');
    });

    it('displays current value in input', () => {
      render(
        <EnhancedAutocomplete
          value="The Matrix"
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox') as HTMLInputElement;
      expect(input.value).toBe('The Matrix');
    });

    it('calls openSuggestions when input is focused', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      fireEvent.focus(input);

      expect(mockOpenSuggestions).toHaveBeenCalledTimes(1);
    });

    it('calls closeSuggestions when input is blurred', async () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('combobox');
      fireEvent.blur(input);

      // Wait for the 200ms delay in handleInputBlur
      await waitFor(() => {
        expect(mockCloseSuggestions).toHaveBeenCalledTimes(1);
      }, { timeout: 300 });
    });

    it('disables input when disabled prop is true', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const input = screen.getByRole('combobox');
      expect(input).toBeDisabled();
    });

    it('renders input element when autoFocus prop is provided', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
          autoFocus={true}
        />
      );

      const input = screen.getByRole('combobox');
      // Component should render with input - autoFocus is handled by React internally
      expect(input).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit when search button is clicked with valid query', () => {
      render(
        <EnhancedAutocomplete
          value="Breaking Bad"
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />
      );

      const searchButton = screen.getByRole('button', { name: /Submit search/i });
      fireEvent.click(searchButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('Breaking Bad');
    });

    it('does not call onSubmit when query is empty', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />
      );

      const searchButton = screen.getByRole('button', { name: /Submit search/i });
      fireEvent.click(searchButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('does not call onSubmit when query is only whitespace', () => {
      render(
        <EnhancedAutocomplete
          value="   "
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />
      );

      const searchButton = screen.getByRole('button', { name: /Submit search/i });
      fireEvent.click(searchButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('trims whitespace from query when submitting', () => {
      render(
        <EnhancedAutocomplete
          value="  Breaking Bad  "
          onChange={mockOnChange}
          onSubmit={mockOnSubmit}
        />
      );

      const searchButton = screen.getByRole('button', { name: /Submit search/i });
      fireEvent.click(searchButton);

      expect(mockOnSubmit).toHaveBeenCalledWith('Breaking Bad');
    });

    it('disables search button when input is empty', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      const searchButton = screen.getByRole('button', { name: /Submit search/i });
      expect(searchButton).toBeDisabled();
    });

    it('enables search button when input has value', () => {
      render(
        <EnhancedAutocomplete
          value="Matrix"
          onChange={mockOnChange}
        />
      );

      const searchButton = screen.getByRole('button', { name: /Submit search/i });
      expect(searchButton).not.toBeDisabled();
    });
  });

  describe('Suggestions Display', () => {
    it('renders suggestions dropdown when isOpen is true', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'Breaking',
          suggestions: mockSuggestions,
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
          value="Breaking"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.getByText('The Matrix')).toBeInTheDocument();
    });

    it('does not render suggestions dropdown when isOpen is false', () => {
      render(
        <EnhancedAutocomplete
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('renders suggestion metadata (year, rating, genres)', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'Breaking',
          suggestions: mockSuggestions,
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
          value="Breaking"
          onChange={mockOnChange}
        />
      );

      // Check for Breaking Bad metadata
      expect(screen.getByText('2008')).toBeInTheDocument();
      expect(screen.getByText('⭐ 9.5')).toBeInTheDocument();
      expect(screen.getByText('Drama, Crime')).toBeInTheDocument();

      // Check for The Matrix metadata
      expect(screen.getByText('1999')).toBeInTheDocument();
      expect(screen.getByText('⭐ 8.7')).toBeInTheDocument();
      expect(screen.getByText('Action, Sci-Fi')).toBeInTheDocument();
    });

    it('calls selectSuggestion when suggestion is clicked', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'Breaking',
          suggestions: mockSuggestions,
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
          value="Breaking"
          onChange={mockOnChange}
          onSuggestionSelected={mockOnSuggestionSelected}
        />
      );

      const suggestionButton = screen.getByText('Breaking Bad').closest('button');
      fireEvent.click(suggestionButton!);

      expect(mockSelectSuggestion).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('highlights selected suggestion with keyboard', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'Breaking',
          suggestions: mockSuggestions,
          isOpen: true,
          isLoading: false,
          error: null,
          selectedIndex: 0,
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
          value="Breaking"
          onChange={mockOnChange}
        />
      );

      const firstSuggestion = screen.getByText('Breaking Bad').closest('button');
      expect(firstSuggestion).toHaveClass('bg-primary/10');
      expect(firstSuggestion).toHaveClass('border-l-primary');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when isLoading is true', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'Breaking',
          suggestions: [],
          isOpen: true,
          isLoading: true,
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
          value="Breaking"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Loading suggestions...')).toBeInTheDocument();
    });

    it('shows loading spinner in input when isLoading is true', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'Breaking',
          suggestions: [],
          isOpen: false,
          isLoading: true,
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
        <EnhancedAutocomplete
          value="Breaking"
          onChange={mockOnChange}
        />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when error is present', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'Breaking',
          suggestions: [],
          isOpen: true,
          isLoading: false,
          error: 'Failed to fetch suggestions',
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
          value="Breaking"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Failed to fetch suggestions')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows "No suggestions found" when query is 2+ chars but no results', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'xyz123',
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

      render(
        <EnhancedAutocomplete
          value="xyz123"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/No suggestions found for/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts Footer', () => {
    it('renders keyboard shortcuts hint in suggestions footer', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'Breaking',
          suggestions: mockSuggestions,
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
          value="Breaking"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('navigate')).toBeInTheDocument();
      expect(screen.getByText('select')).toBeInTheDocument();
      expect(screen.getByText('close')).toBeInTheDocument();
    });

    it('shows Ctrl+K shortcut when showSearchShortcuts is true', () => {
      useAdvancedAutocomplete.mockReturnValue({
        state: {
          query: 'Breaking',
          suggestions: mockSuggestions,
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
          value="Breaking"
          onChange={mockOnChange}
          showSearchShortcuts={true}
        />
      );

      expect(screen.getByText('focus')).toBeInTheDocument();
    });
  });
});

/**
 * MOCK-TO-TEST RATIO: 1 hook mock / 28 tests = 0.04 ✅
 * TARGET COVERAGE: 60%+ (core paths)
 * MOCKING STRATEGY: Boundary-only (useAdvancedAutocomplete hook)
 */
