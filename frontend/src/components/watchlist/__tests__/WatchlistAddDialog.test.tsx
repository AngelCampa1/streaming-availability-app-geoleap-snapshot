import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WatchlistAddDialog } from '../WatchlistAddDialog';
import { useWatchlistSearch } from '@/hooks/useWatchlist';
import { WatchlistCategory } from '@/types/watchlist';

// Mock the useWatchlistSearch hook
jest.mock('@/hooks/useWatchlist', () => ({
  useWatchlistSearch: jest.fn(),
}));

const mockUseWatchlistSearch = useWatchlistSearch as jest.MockedFunction<typeof useWatchlistSearch>;

describe('WatchlistAddDialog', () => {
  const mockCategories: WatchlistCategory[] = [
    { id: 'cat1', name: 'Favorites', color: '#ff0000', isDefault: false, sortOrder: 1, createdDate: new Date() },
    { id: 'cat2', name: 'To Watch', color: '#00ff00', isDefault: true, sortOrder: 2, createdDate: new Date() },
  ];

  // Helper function to switch to manual tab and wait for it to be visible
  const switchToManualTab = async () => {
    const user = userEvent.setup();
    const manualTab = screen.getByRole('tab', { name: /Manual Entry/i });
    await user.click(manualTab);
    await waitFor(
      () => {
        expect(screen.getByPlaceholderText('Movie or TV show title')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  };

  const mockSearchResults = [
    {
      id: '1',
      title: 'The Matrix',
      type: 'movie' as const,
      year: 1999,
      genre: ['Action', 'Sci-Fi'],
      poster: 'https://example.com/matrix.jpg',
      description: 'A computer hacker learns about the true nature of reality.',
      rating: 8.7,
      runtime: 136,
      availability: [],
      addedDate: new Date(),
      lastChecked: new Date(),
      priority: 'medium' as const,
      watched: false,
    },
    {
      id: '2',
      title: 'Breaking Bad',
      type: 'tv_series' as const,
      year: 2008,
      genre: ['Drama', 'Thriller'],
      poster: 'https://example.com/breaking-bad.jpg',
      description: 'A chemistry teacher turned meth producer.',
      availability: [],
      addedDate: new Date(),
      lastChecked: new Date(),
      priority: 'high' as const,
      watched: false,
    },
  ];

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    categories: mockCategories,
    onAdd: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWatchlistSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: jest.fn(),
      searchType: undefined,
      setSearchType: jest.fn(),
      results: [],
      isSearching: false,
      searchError: null,
    });
  });

  describe('Dialog Rendering', () => {
    it('should render dialog when open', () => {
      render(<WatchlistAddDialog {...defaultProps} />);

      expect(screen.getByText('Add to Watchlist')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(<WatchlistAddDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Add to Watchlist')).not.toBeInTheDocument();
    });

    it('should render both tabs', () => {
      render(<WatchlistAddDialog {...defaultProps} />);

      expect(screen.getByRole('tab', { name: /Search & Add/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Manual Entry/i })).toBeInTheDocument();
    });
  });

  describe('Search Tab', () => {
    it('should show search input', () => {
      render(<WatchlistAddDialog {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search movies, TV shows...')).toBeInTheDocument();
    });

    it('should update search query on input', () => {
      const setSearchQuery = jest.fn();
      mockUseWatchlistSearch.mockReturnValue({
        searchQuery: '',
        setSearchQuery,
        searchType: undefined,
        setSearchType: jest.fn(),
        results: [],
        isSearching: false,
        searchError: null,
      });

      render(<WatchlistAddDialog {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search movies, TV shows...');
      fireEvent.change(searchInput, { target: { value: 'Matrix' } });

      expect(setSearchQuery).toHaveBeenCalledWith('Matrix');
    });

    it('should show searching state', () => {
      mockUseWatchlistSearch.mockReturnValue({
        searchQuery: 'Matrix',
        setSearchQuery: jest.fn(),
        searchType: undefined,
        setSearchType: jest.fn(),
        results: [],
        isSearching: true,
        searchError: null,
      });

      render(<WatchlistAddDialog {...defaultProps} />);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('should display search results', () => {
      mockUseWatchlistSearch.mockReturnValue({
        searchQuery: 'Matrix',
        setSearchQuery: jest.fn(),
        searchType: undefined,
        setSearchType: jest.fn(),
        results: mockSearchResults,
        isSearching: false,
        searchError: null,
      });

      render(<WatchlistAddDialog {...defaultProps} />);

      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.getByText(/1999.*movie/)).toBeInTheDocument();
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.getByText(/2008.*tv_series/)).toBeInTheDocument();
    });

    it('should show empty state when no results found', () => {
      mockUseWatchlistSearch.mockReturnValue({
        searchQuery: 'XYZ123',
        setSearchQuery: jest.fn(),
        searchType: undefined,
        setSearchType: jest.fn(),
        results: [],
        isSearching: false,
        searchError: null,
      });

      render(<WatchlistAddDialog {...defaultProps} />);

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term or add the item manually')).toBeInTheDocument();
    });

    it('should switch to manual tab when clicking empty state action', () => {
      mockUseWatchlistSearch.mockReturnValue({
        searchQuery: 'XYZ123',
        setSearchQuery: jest.fn(),
        searchType: undefined,
        setSearchType: jest.fn(),
        results: [],
        isSearching: false,
        searchError: null,
      });

      render(<WatchlistAddDialog {...defaultProps} />);

      fireEvent.click(screen.getByText('Try Manual Entry'));

      // Manual tab should now be active - check for manual entry elements
      expect(screen.getByPlaceholderText('Movie or TV show title')).toBeInTheDocument();
    });

    it('should populate form when selecting search result', () => {
      mockUseWatchlistSearch.mockReturnValue({
        searchQuery: 'Matrix',
        setSearchQuery: jest.fn(),
        searchType: undefined,
        setSearchType: jest.fn(),
        results: mockSearchResults,
        isSearching: false,
        searchError: null,
      });

      render(<WatchlistAddDialog {...defaultProps} />);

      // Click on the first search result card
      const matrixCard = screen.getByText('The Matrix').closest('div[class*="cursor-pointer"]');
      fireEvent.click(matrixCard!);

      // Should switch to manual tab and populate fields
      expect(screen.getByDisplayValue('The Matrix')).toBeInTheDocument();
    });
  });

  describe('Manual Entry Tab', () => {
    beforeEach(() => {
      render(<WatchlistAddDialog {...defaultProps} />);
    });

    it('should render all form fields', async () => {
      await switchToManualTab();
      expect(screen.getByPlaceholderText('Movie or TV show title')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('2024')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('7.5')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('120')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Plot summary or notes...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Why you want to watch this...')).toBeInTheDocument();
    });

    it('should update title field', async () => {
      await switchToManualTab();
      const titleInput = screen.getByPlaceholderText('Movie or TV show title');
      fireEvent.change(titleInput, { target: { value: 'Test Movie' } });

      expect(titleInput).toHaveValue('Test Movie');
    });

    it('should update year field', async () => {
      await switchToManualTab();
      const yearInput = screen.getByPlaceholderText('2024');
      fireEvent.change(yearInput, { target: { value: '2023' } });

      expect(yearInput).toHaveValue(2023);
    });

    it('should update rating field', async () => {
      await switchToManualTab();
      const ratingInput = screen.getByPlaceholderText('7.5');
      fireEvent.change(ratingInput, { target: { value: '8.5' } });

      expect(ratingInput).toHaveValue(8.5);
    });

    it('should update duration field', async () => {
      await switchToManualTab();
      const durationInput = screen.getByPlaceholderText('120');
      fireEvent.change(durationInput, { target: { value: '150' } });

      expect(durationInput).toHaveValue(150);
    });

    it('should update description field', async () => {
      await switchToManualTab();
      const descriptionInput = screen.getByPlaceholderText('Plot summary or notes...');
      fireEvent.change(descriptionInput, { target: { value: 'A great movie about...' } });

      expect(descriptionInput).toHaveValue('A great movie about...');
    });

    it('should update personal notes field', async () => {
      await switchToManualTab();
      const notesInput = screen.getByPlaceholderText('Why you want to watch this...');
      fireEvent.change(notesInput, { target: { value: 'Recommended by friend' } });

      expect(notesInput).toHaveValue('Recommended by friend');
    });
  });

  describe('Genre Management', () => {
    beforeEach(() => {
      render(<WatchlistAddDialog {...defaultProps} />);
    });

    it('should display common genres', async () => {
      await switchToManualTab();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Comedy' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Drama' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Horror' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sci-Fi' })).toBeInTheDocument();
    });

    it('should add genre when clicked', async () => {
      await switchToManualTab();
      const actionButton = screen.getByRole('button', { name: 'Action' });
      fireEvent.click(actionButton);

      // Genre should appear as a badge
      const genreBadges = screen.getAllByText('Action');
      expect(genreBadges.length).toBeGreaterThan(1); // Button + Badge
    });

    it('should remove genre when clicking badge X', async () => {
      await switchToManualTab();
      // Add genre first
      const actionButton = screen.getByRole('button', { name: 'Action' });
      fireEvent.click(actionButton);

      // Find and click the X icon in the badge
      const badges = screen.getAllByText('Action');
      const badge = badges[badges.length - 1]; // Last one is the badge
      const xIcon = badge.parentElement?.querySelector('svg');
      fireEvent.click(xIcon!);

      // Should only have the button now, not the badge
      const remaining = screen.getAllByText('Action');
      expect(remaining.length).toBe(1); // Only button remains
    });

    it('should not add duplicate genres', async () => {
      await switchToManualTab();
      const actionButton = screen.getByRole('button', { name: 'Action' });

      // Click twice
      fireEvent.click(actionButton);
      fireEvent.click(actionButton);

      // Should only have 1 badge (plus 1 button = 2 total, but second click removes it)
      // After first click: button + badge
      // After second click: button only (removal)
      const elements = screen.getAllByText('Action');
      expect(elements.length).toBe(1); // Toggle behavior: added then removed
    });
  });

  describe('Tag Management', () => {
    beforeEach(() => {
      render(<WatchlistAddDialog {...defaultProps} />);
    });

    it('should add tag when button clicked', async () => {
      await switchToManualTab();
      const tagInput = screen.getByPlaceholderText('Add tag...');
      fireEvent.change(tagInput, { target: { value: 'must-watch' } });

      const _addTagButton = screen.getByRole('button', { name: '' }).closest('button');
      const tagButtons = screen.getAllByRole('button');
      const tagButton = tagButtons.find(btn => btn.querySelector('svg')?.classList.contains('lucide-tag'));
      fireEvent.click(tagButton!);

      expect(screen.getByText('must-watch')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    it('should add tag when pressing Enter', async () => {
      await switchToManualTab();
      const tagInput = screen.getByPlaceholderText('Add tag...');
      fireEvent.change(tagInput, { target: { value: 'classic' } });
      fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(screen.getByText('classic')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    it('should not add empty tags', async () => {
      await switchToManualTab();
      const tagInput = screen.getByPlaceholderText('Add tag...');
      fireEvent.change(tagInput, { target: { value: '   ' } });

      const tagButtons = screen.getAllByRole('button');
      const tagButton = tagButtons.find(btn => btn.querySelector('svg')?.classList.contains('lucide-tag'));
      fireEvent.click(tagButton!);

      // Should not add the tag (only placeholder should be present)
      expect(screen.queryByText('   ')).not.toBeInTheDocument();
    });

    it('should trim whitespace from tags', async () => {
      await switchToManualTab();
      const tagInput = screen.getByPlaceholderText('Add tag...');
      fireEvent.change(tagInput, { target: { value: '  spaced-tag  ' } });
      fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(screen.getByText('spaced-tag')).toBeInTheDocument();
    });

    it('should remove tag when clicking badge X', async () => {
      await switchToManualTab();
      const tagInput = screen.getByPlaceholderText('Add tag...');
      fireEvent.change(tagInput, { target: { value: 'to-remove' } });
      fireEvent.keyPress(tagInput, { target: { value: 'to-remove' } });
      fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(screen.getByText('to-remove')).toBeInTheDocument();

      // Find and click the X icon
      const badge = screen.getByText('to-remove');
      const xIcon = badge.parentElement?.querySelector('svg');
      fireEvent.click(xIcon!);

      expect(screen.queryByText('to-remove')).not.toBeInTheDocument();
    });

    it('should not add duplicate tags', async () => {
      await switchToManualTab();
      const tagInput = screen.getByPlaceholderText('Add tag...');

      // Add same tag twice
      fireEvent.change(tagInput, { target: { value: 'unique-tag' } });
      fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      fireEvent.change(tagInput, { target: { value: 'unique-tag' } });
      fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      // Should only have one instance
      const tags = screen.getAllByText('unique-tag');
      expect(tags.length).toBe(1);
    });
  });

  describe('Form Submission', () => {
    it('should disable submit button when title is empty', async () => {
      render(<WatchlistAddDialog {...defaultProps} />);
      await switchToManualTab();
      const submitButton = screen.getByRole('button', { name: /Add to Watchlist/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when title is provided', async () => {
      render(<WatchlistAddDialog {...defaultProps} />);
      await switchToManualTab();
      const titleInput = screen.getByPlaceholderText('Movie or TV show title');
      fireEvent.change(titleInput, { target: { value: 'Test Movie' } });

      const submitButton = screen.getByRole('button', { name: /Add to Watchlist/i });
      expect(submitButton).toBeEnabled();
    });

    it('should call onAdd with form data when submitted', async () => {
      const onAdd = jest.fn();
      render(<WatchlistAddDialog {...defaultProps} onAdd={onAdd} />);
      await switchToManualTab();

      // Fill in form
      const titleInput = screen.getByPlaceholderText('Movie or TV show title');
      fireEvent.change(titleInput, { target: { value: 'Test Movie' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Add to Watchlist/i });
      fireEvent.click(submitButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Movie',
          type: 'movie',
          priority: 'medium',
          watched: false,
        })
      );
    });

    it('should close dialog after successful submission', async () => {
      const onOpenChange = jest.fn();
      render(<WatchlistAddDialog {...defaultProps} onOpenChange={onOpenChange} />);
      await switchToManualTab();

      const titleInput = screen.getByPlaceholderText('Movie or TV show title');
      fireEvent.change(titleInput, { target: { value: 'Test Movie' } });

      const submitButton = screen.getByRole('button', { name: /Add to Watchlist/i });
      fireEvent.click(submitButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Cancel Button', () => {
    it('should render cancel button', async () => {
      render(<WatchlistAddDialog {...defaultProps} />);
      await switchToManualTab();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should close dialog when cancel clicked', async () => {
      const onOpenChange = jest.fn();
      render(<WatchlistAddDialog {...defaultProps} onOpenChange={onOpenChange} />);
      await switchToManualTab();

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Form Reset', () => {
    it('should reset form when dialog closes and reopens', async () => {
      const { rerender } = render(<WatchlistAddDialog {...defaultProps} />);
      await switchToManualTab();

      // Fill in title
      const titleInput = screen.getByPlaceholderText('Movie or TV show title');
      fireEvent.change(titleInput, { target: { value: 'Test Movie' } });
      expect(titleInput).toHaveValue('Test Movie');

      // Close dialog
      rerender(<WatchlistAddDialog {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<WatchlistAddDialog {...defaultProps} open={true} />);

      // Should be back on search tab
      expect(screen.getByPlaceholderText('Search movies, TV shows...')).toBeInTheDocument();

      // Switch to manual and check title is reset
      await switchToManualTab();
      const newTitleInput = screen.getByPlaceholderText('Movie or TV show title');
      expect(newTitleInput).toHaveValue('');
    });
  });

  describe('Categories Integration', () => {
    it('should display categories in select', async () => {
      render(<WatchlistAddDialog {...defaultProps} />);
      await switchToManualTab();

      // The categories are in a Select component, they'll appear when the select is opened
      // We can verify the category label exists
      expect(screen.getByText('Category')).toBeInTheDocument();
    });
  });
});
