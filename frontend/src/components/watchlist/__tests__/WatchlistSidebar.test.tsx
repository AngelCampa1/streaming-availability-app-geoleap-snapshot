import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WatchlistSidebar } from '../WatchlistSidebar';
import { WatchlistCategory, WatchlistView, WatchlistFilter, WatchlistStats } from '@/types/watchlist';

// Mock Radix UI components that use JSDOM-incompatible features
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('WatchlistSidebar', () => {
  const mockCategories: WatchlistCategory[] = [
    {
      id: 'cat1',
      name: 'Action Movies',
      color: '#ff0000',
      isDefault: true,
      sortOrder: 0,
      createdDate: new Date('2024-01-01'),
    },
    {
      id: 'cat2',
      name: 'Comedy Shows',
      color: '#00ff00',
      isDefault: false,
      sortOrder: 1,
      createdDate: new Date('2024-01-02'),
    },
  ];

  const mockViews: WatchlistView[] = [
    {
      id: 'view1',
      name: 'Grid View',
      type: 'grid',
      filter: {
        sortBy: 'addedDate',
        sortOrder: 'desc',
      },
      isDefault: true,
      isPublic: false,
    },
    {
      id: 'view2',
      name: 'List View',
      type: 'list',
      filter: {
        sortBy: 'title',
        sortOrder: 'asc',
      },
      isDefault: false,
      isPublic: false,
    },
  ];

  const mockStats: WatchlistStats = {
    totalItems: 100,
    watchedItems: 45,
    availableItems: 75,
    categorizedItems: 80,
    averageRating: 7.8,
    totalDuration: 12000,
    genreBreakdown: {},
    typeBreakdown: {},
    monthlyAdditions: {},
  };

  const mockFilter: WatchlistFilter = {
    sortBy: 'addedDate',
    sortOrder: 'desc',
  };

  const defaultProps = {
    categories: mockCategories,
    views: mockViews,
    currentView: mockViews[0],
    stats: mockStats,
    filters: mockFilter,
    onViewChange: jest.fn(),
    onFilterChange: jest.fn(),
    onCategoryCreate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the sidebar with all sections', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Quick Filters')).toBeInTheDocument();
      expect(screen.getByText('Views')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('renders without stats when not provided', () => {
      render(<WatchlistSidebar {...defaultProps} stats={undefined} />);

      expect(screen.queryByText('Overview')).not.toBeInTheDocument();
      expect(screen.getByText('Quick Filters')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<WatchlistSidebar {...defaultProps} className="custom-class" />);

      const sidebar = container.querySelector('.custom-class');
      expect(sidebar).toBeInTheDocument();
    });
  });

  describe('Stats Overview', () => {
    it('displays all stats correctly', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Click to expand stats
      const overviewButton = screen.getByText('Overview');
      fireEvent.click(overviewButton);

      // Numbers and labels appear in both stats and quick filters, use getAllByText
      const hundredTexts = screen.getAllByText('100');
      expect(hundredTexts.length).toBeGreaterThan(0);
      expect(screen.getByText('Total')).toBeInTheDocument();

      const fortyFiveTexts = screen.getAllByText('45');
      expect(fortyFiveTexts.length).toBeGreaterThan(0);
      const watchedLabels = screen.getAllByText('Watched');
      expect(watchedLabels.length).toBeGreaterThan(0);

      const seventyFiveTexts = screen.getAllByText('75');
      expect(seventyFiveTexts.length).toBeGreaterThan(0);
      const availableLabels = screen.getAllByText('Available');
      expect(availableLabels.length).toBeGreaterThan(0);

      expect(screen.getByText('7.8')).toBeInTheDocument(); // Avg Rating (unique)
      expect(screen.getByText('Avg Rating')).toBeInTheDocument();
    });

    it('formats average rating to 1 decimal place', () => {
      const statsWithDecimal: WatchlistStats = {
        ...mockStats,
        averageRating: 8.567,
      };

      render(<WatchlistSidebar {...defaultProps} stats={statsWithDecimal} />);

      const overviewButton = screen.getByText('Overview');
      fireEvent.click(overviewButton);

      expect(screen.getByText('8.6')).toBeInTheDocument();
    });

    it('toggles stats collapsible on click', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const overviewButton = screen.getByText('Overview');

      // Initially closed
      expect(screen.queryByText('Total')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(overviewButton);
      expect(screen.getByText('Total')).toBeInTheDocument();

      // Click to close
      fireEvent.click(overviewButton);
      expect(screen.queryByText('Total')).not.toBeInTheDocument();
    });
  });

  describe('Quick Filters', () => {
    it('renders all quick filter buttons', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      expect(screen.getByText('Unwatched')).toBeInTheDocument();
      expect(screen.getByText('Watched')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Recently Added')).toBeInTheDocument();
    });

    it('displays correct counts for each filter', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Unwatched = Total - Watched = 100 - 45 = 55
      const unwatchedButton = screen.getByText('Unwatched').closest('button');
      expect(within(unwatchedButton!).getByText('55')).toBeInTheDocument();

      // Watched = 45
      const watchedButton = screen.getByText('Watched').closest('button');
      expect(within(watchedButton!).getByText('45')).toBeInTheDocument();

      // Available = 75
      const availableButton = screen.getByText('Available').closest('button');
      expect(within(availableButton!).getByText('75')).toBeInTheDocument();

      // High Priority = 0 (no stats for this)
      const priorityButton = screen.getByText('High Priority').closest('button');
      expect(within(priorityButton!).getByText('0')).toBeInTheDocument();

      // Recently Added = Total = 100
      const recentButton = screen.getByText('Recently Added').closest('button');
      expect(within(recentButton!).getByText('100')).toBeInTheDocument();
    });

    it('calls onFilterChange when Unwatched is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const unwatchedButton = screen.getByText('Unwatched');
      fireEvent.click(unwatchedButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ watched: false });
    });

    it('calls onFilterChange when Watched is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const watchedButton = screen.getByText('Watched');
      fireEvent.click(watchedButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ watched: true });
    });

    it('calls onFilterChange when Available is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const availableButton = screen.getByText('Available');
      fireEvent.click(availableButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ availability: true });
    });

    it('calls onFilterChange when High Priority is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const priorityButton = screen.getByText('High Priority');
      fireEvent.click(priorityButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ priority: ['high'] });
    });

    it('calls onFilterChange when Recently Added is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const recentButton = screen.getByText('Recently Added');
      fireEvent.click(recentButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
        sortBy: 'addedDate',
        sortOrder: 'desc',
      });
    });

    it('highlights active Unwatched filter', () => {
      const filterWithUnwatched: WatchlistFilter = {
        ...mockFilter,
        watched: false,
      };

      render(<WatchlistSidebar {...defaultProps} filters={filterWithUnwatched} />);

      const unwatchedButton = screen.getByText('Unwatched').closest('button');
      expect(unwatchedButton).toHaveClass('bg-secondary');
    });

    it('highlights active Watched filter', () => {
      const filterWithWatched: WatchlistFilter = {
        ...mockFilter,
        watched: true,
      };

      render(<WatchlistSidebar {...defaultProps} filters={filterWithWatched} />);

      const watchedButton = screen.getByText('Watched').closest('button');
      expect(watchedButton).toHaveClass('bg-secondary');
    });

    it('highlights active Availability filter', () => {
      const filterWithAvailability: WatchlistFilter = {
        ...mockFilter,
        availability: true,
      };

      render(<WatchlistSidebar {...defaultProps} filters={filterWithAvailability} />);

      const availableButton = screen.getByText('Available').closest('button');
      expect(availableButton).toHaveClass('bg-secondary');
    });

    it('highlights active Priority filter', () => {
      const filterWithPriority: WatchlistFilter = {
        ...mockFilter,
        priority: ['high'],
      };

      render(<WatchlistSidebar {...defaultProps} filters={filterWithPriority} />);

      const priorityButton = screen.getByText('High Priority').closest('button');
      expect(priorityButton).toHaveClass('bg-secondary');
    });

    it('highlights active Recently Added filter', () => {
      const filterWithSort: WatchlistFilter = {
        sortBy: 'addedDate',
        sortOrder: 'desc',
      };

      render(<WatchlistSidebar {...defaultProps} filters={filterWithSort} />);

      const recentButton = screen.getByText('Recently Added').closest('button');
      expect(recentButton).toHaveClass('bg-secondary');
    });
  });

  describe('Views Section', () => {
    it('renders all views', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      expect(screen.getByText('Grid View')).toBeInTheDocument();
      expect(screen.getByText('List View')).toBeInTheDocument();
    });

    it('highlights the active view', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const gridViewButton = screen.getByText('Grid View').closest('button');
      expect(gridViewButton).toHaveClass('bg-secondary');

      const listViewButton = screen.getByText('List View').closest('button');
      expect(listViewButton).not.toHaveClass('bg-secondary');
    });

    it('displays Default badge for default view', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const gridViewButton = screen.getByText('Grid View').closest('button');
      expect(within(gridViewButton!).getByText('Default')).toBeInTheDocument();

      const listViewButton = screen.getByText('List View').closest('button');
      expect(within(listViewButton!).queryByText('Default')).not.toBeInTheDocument();
    });

    it('calls onViewChange when a view is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const listViewButton = screen.getByText('List View');
      fireEvent.click(listViewButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith(mockViews[1]);
    });

    it('toggles views collapsible on click', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const viewsButton = screen.getByText('Views');

      // Initially open (viewsOpen defaults to true)
      expect(screen.getByText('Grid View')).toBeInTheDocument();

      // Click to close
      fireEvent.click(viewsButton);
      expect(screen.queryByText('Grid View')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(viewsButton);
      expect(screen.getByText('Grid View')).toBeInTheDocument();
    });
  });

  describe('Categories Section', () => {
    it('renders all categories', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      expect(screen.getByText('Action Movies')).toBeInTheDocument();
      expect(screen.getByText('Comedy Shows')).toBeInTheDocument();
    });

    it('displays color indicators for categories', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const actionButton = screen.getByText('Action Movies').closest('button');
      const colorIndicator = actionButton?.querySelector('div[style*="background-color"]');
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#ff0000' });

      const comedyButton = screen.getByText('Comedy Shows').closest('button');
      const comedyColorIndicator = comedyButton?.querySelector('div[style*="background-color"]');
      expect(comedyColorIndicator).toHaveStyle({ backgroundColor: '#00ff00' });
    });

    it('calls onFilterChange when a category is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const actionButton = screen.getByText('Action Movies');
      fireEvent.click(actionButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ category: ['cat1'] });
    });

    it('adds category to filter when clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const actionButton = screen.getByText('Action Movies');
      fireEvent.click(actionButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ category: ['cat1'] });
    });

    it('removes category from filter when clicked again', () => {
      const filterWithCategory: WatchlistFilter = {
        ...mockFilter,
        category: ['cat1'],
      };

      render(<WatchlistSidebar {...defaultProps} filters={filterWithCategory} />);

      const actionButton = screen.getByText('Action Movies');
      fireEvent.click(actionButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ category: [] });
    });

    it('supports multiple category selection', () => {
      const filterWithCategory: WatchlistFilter = {
        ...mockFilter,
        category: ['cat1'],
      };

      render(<WatchlistSidebar {...defaultProps} filters={filterWithCategory} />);

      const comedyButton = screen.getByText('Comedy Shows');
      fireEvent.click(comedyButton);

      expect(defaultProps.onFilterChange).toHaveBeenCalledWith({ category: ['cat1', 'cat2'] });
    });

    it('highlights selected categories', () => {
      const filterWithCategory: WatchlistFilter = {
        ...mockFilter,
        category: ['cat1'],
      };

      render(<WatchlistSidebar {...defaultProps} filters={filterWithCategory} />);

      const actionButton = screen.getByText('Action Movies').closest('button');
      expect(actionButton).toHaveClass('bg-secondary');

      const comedyButton = screen.getByText('Comedy Shows').closest('button');
      expect(comedyButton).not.toHaveClass('bg-secondary');
    });

    it('toggles categories collapsible on click', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      const categoriesButton = screen.getByText('Categories');

      // Initially open (categoriesOpen defaults to true)
      expect(screen.getByText('Action Movies')).toBeInTheDocument();

      // Click to close
      fireEvent.click(categoriesButton);
      expect(screen.queryByText('Action Movies')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(categoriesButton);
      expect(screen.getByText('Action Movies')).toBeInTheDocument();
    });

    it('displays empty state when no categories exist', () => {
      render(<WatchlistSidebar {...defaultProps} categories={[]} />);

      expect(
        screen.getByText('No categories yet. Create your first category to organize your watchlist.')
      ).toBeInTheDocument();
    });
  });

  describe('Create Category Dialog', () => {
    it('opens dialog when plus button is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Find the plus button (it's in the categories header)
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');

      // The plus button is the first button before the chevron
      const plusButton = plusButtons?.[0];
      expect(plusButton).toBeInTheDocument();

      fireEvent.click(plusButton!);

      expect(screen.getByText('Create New Category')).toBeInTheDocument();
    });

    it('updates input value when typing', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Open dialog
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');
      const plusButton = plusButtons?.[0];
      fireEvent.click(plusButton!);

      const input = screen.getByPlaceholderText('Category name');
      fireEvent.change(input, { target: { value: 'New Category' } });

      expect(input).toHaveValue('New Category');
    });

    it('calls onCategoryCreate when Create button is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Open dialog
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');
      const plusButton = plusButtons?.[0];
      fireEvent.click(plusButton!);

      // Type category name
      const input = screen.getByPlaceholderText('Category name');
      fireEvent.change(input, { target: { value: 'New Category' } });

      // Click Create
      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      expect(defaultProps.onCategoryCreate).toHaveBeenCalledWith({
        name: 'New Category',
        color: 'hsl(var(--primary))',
        isDefault: false,
        sortOrder: 2, // categories.length = 2
      });
    });

    it('trims whitespace from category name', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Open dialog
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');
      const plusButton = plusButtons?.[0];
      fireEvent.click(plusButton!);

      // Type category name with whitespace
      const input = screen.getByPlaceholderText('Category name');
      fireEvent.change(input, { target: { value: '  New Category  ' } });

      // Click Create
      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      expect(defaultProps.onCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Category',
        })
      );
    });

    it('does not create category with empty name', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Open dialog
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');
      const plusButton = plusButtons?.[0];
      fireEvent.click(plusButton!);

      // Click Create without typing
      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      expect(defaultProps.onCategoryCreate).not.toHaveBeenCalled();
    });

    it('does not create category with only whitespace', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Open dialog
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');
      const plusButton = plusButtons?.[0];
      fireEvent.click(plusButton!);

      // Type only whitespace
      const input = screen.getByPlaceholderText('Category name');
      fireEvent.change(input, { target: { value: '   ' } });

      // Click Create
      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      expect(defaultProps.onCategoryCreate).not.toHaveBeenCalled();
    });

    it('creates category when Enter key is pressed', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Open dialog
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');
      const plusButton = plusButtons?.[0];
      fireEvent.click(plusButton!);

      // Type category name
      const input = screen.getByPlaceholderText('Category name');
      fireEvent.change(input, { target: { value: 'Enter Category' } });

      // Press Enter
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(defaultProps.onCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Enter Category',
        })
      );
    });

    it('closes dialog when Cancel button is clicked', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Open dialog
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');
      const plusButton = plusButtons?.[0];
      fireEvent.click(plusButton!);

      expect(screen.getByText('Create New Category')).toBeInTheDocument();

      // Click Cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Create New Category')).not.toBeInTheDocument();
    });

    it('clears input after successful creation', () => {
      render(<WatchlistSidebar {...defaultProps} />);

      // Open dialog
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');
      const plusButton = plusButtons?.[0];
      fireEvent.click(plusButton!);

      // Type and create
      const input = screen.getByPlaceholderText('Category name');
      fireEvent.change(input, { target: { value: 'Test Category' } });

      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      // Reopen dialog and check input is empty
      fireEvent.click(plusButton!);
      const newInput = screen.getByPlaceholderText('Category name');
      expect(newInput).toHaveValue('');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty views array', () => {
      render(<WatchlistSidebar {...defaultProps} views={[]} />);

      const viewsButton = screen.getByText('Views');
      fireEvent.click(viewsButton);

      expect(screen.queryByText('Grid View')).not.toBeInTheDocument();
    });

    it('handles stats with zero values', () => {
      const zeroStats: WatchlistStats = {
        totalItems: 0,
        watchedItems: 0,
        availableItems: 0,
        categorizedItems: 0,
        averageRating: 0,
        totalDuration: 0,
        genreBreakdown: {},
        typeBreakdown: {},
        monthlyAdditions: {},
      };

      render(<WatchlistSidebar {...defaultProps} stats={zeroStats} />);

      const overviewButton = screen.getByText('Overview');
      fireEvent.click(overviewButton);

      expect(screen.getByText('0.0')).toBeInTheDocument(); // Average rating
    });

    it('handles filters with empty category array', () => {
      const filterWithEmptyCategory: WatchlistFilter = {
        ...mockFilter,
        category: [],
      };

      render(<WatchlistSidebar {...defaultProps} filters={filterWithEmptyCategory} />);

      const actionButton = screen.getByText('Action Movies').closest('button');
      expect(actionButton).not.toHaveClass('bg-secondary');
    });

    it('calculates correct sortOrder for new category', () => {
      const manyCategories = Array.from({ length: 10 }, (_, i) => ({
        id: `cat${i}`,
        name: `Category ${i}`,
        color: '#000000',
        isDefault: false,
        sortOrder: i,
        createdDate: new Date(),
      }));

      render(<WatchlistSidebar {...defaultProps} categories={manyCategories} />);

      // Open dialog
      const categoriesSection = screen.getByText('Categories').closest('button');
      const plusButtons = categoriesSection?.querySelectorAll('button');
      const plusButton = plusButtons?.[0];
      fireEvent.click(plusButton!);

      // Create category
      const input = screen.getByPlaceholderText('Category name');
      fireEvent.change(input, { target: { value: 'New' } });
      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      expect(defaultProps.onCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: 10, // categories.length = 10
        })
      );
    });
  });
});
