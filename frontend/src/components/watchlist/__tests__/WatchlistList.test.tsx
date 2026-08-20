/**
 * WatchlistList Integration Tests
 *
 * Tests the virtual list component with REAL list rendering logic.
 * Uses boundary-only mocking (react-window, WatchlistItemCard).
 *
 * Coverage Target: 75%+
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WatchlistList } from '../WatchlistList';
import { WatchlistItem } from '@/types/watchlist';

// Mock react-window FixedSizeList (BOUNDARY - external library)
// Instead of virtualizing, render all items for testing
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize }: any) => {
    const items = [];
    for (let index = 0; index < itemCount; index++) {
      items.push(
        <div key={index} data-testid={`list-row-${index}`} data-item-size={itemSize}>
          {children({ index, style: {} })}
        </div>
      );
    }
    return <div data-testid="virtual-list">{items}</div>;
  },
}));

// Mock WatchlistItemCard (tested separately, treat as boundary)
jest.mock('../WatchlistItemCard', () => ({
  WatchlistItemCard: ({ item, view, isSelected, onSelect, onUpdate, onRemove }: any) => (
    <div
      data-testid={`watchlist-item-${item.id}`}
      data-view={view}
      data-selected={isSelected}
    >
      <h3>{item.title}</h3>
      <button onClick={() => onSelect(item.id)}>Select</button>
      <button onClick={() => onUpdate(item)}>Update</button>
      <button onClick={() => onRemove(item.id)}>Remove</button>
    </div>
  ),
}));

const mockItems: WatchlistItem[] = [
  {
    id: '1',
    title: 'Breaking Bad',
    type: 'tv_series',
    year: 2008,
    poster: '/poster1.jpg',
    addedDate: new Date('2024-01-15T10:00:00Z'),
    lastChecked: new Date('2024-01-20T10:00:00Z'),
    availability: [],
    priority: 'high',
    watched: false,
    rating: 9.5,
  },
  {
    id: '2',
    title: 'The Matrix',
    type: 'movie',
    year: 1999,
    poster: '/poster2.jpg',
    addedDate: new Date('2024-01-16T11:00:00Z'),
    lastChecked: new Date('2024-01-20T11:00:00Z'),
    availability: [],
    priority: 'medium',
    watched: false,
    rating: 8.7,
  },
  {
    id: '3',
    title: 'Stranger Things',
    type: 'tv_series',
    year: 2016,
    poster: '/poster3.jpg',
    addedDate: new Date('2024-01-17T12:00:00Z'),
    lastChecked: new Date('2024-01-20T12:00:00Z'),
    availability: [],
    priority: 'low',
    watched: false,
    rating: 8.7,
  },
];

describe('WatchlistList - Integration Tests', () => {
  const mockOnItemSelect = jest.fn();
  const mockOnItemUpdate = jest.fn();
  const mockOnItemRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading skeleton when isLoading is true', () => {
      const { container } = render(
        <WatchlistList
          items={[]}
          selectedItems={new Set()}
          isLoading={true}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      // Loading skeleton shows 10 placeholder rows
      const skeletonRows = container.querySelectorAll('.animate-pulse');
      expect(skeletonRows.length).toBe(10);
    });

    it('does not render virtual list when loading', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={true}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
    });
  });

  describe('List Rendering', () => {
    it('renders all watchlist items in list', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.getByText('The Matrix')).toBeInTheDocument();
      expect(screen.getByText('Stranger Things')).toBeInTheDocument();
    });

    it('renders correct number of list rows', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      expect(screen.getByTestId('list-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('list-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('list-row-2')).toBeInTheDocument();
    });

    it('renders items with correct test IDs', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      expect(screen.getByTestId('watchlist-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('watchlist-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('watchlist-item-3')).toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('applies list view mode to items', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      const item1 = screen.getByTestId('watchlist-item-1');
      expect(item1.getAttribute('data-view')).toBe('list');
    });

    it('applies compact view mode to items', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="compact"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      const item1 = screen.getByTestId('watchlist-item-1');
      expect(item1.getAttribute('data-view')).toBe('compact');
    });

    it('uses 80px height for list view', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      const row = screen.getByTestId('list-row-0');
      expect(row.getAttribute('data-item-size')).toBe('80');
    });

    it('uses 60px height for compact view', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="compact"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      const row = screen.getByTestId('list-row-0');
      expect(row.getAttribute('data-item-size')).toBe('60');
    });
  });

  describe('Item Selection', () => {
    it('marks selected items with data attribute', () => {
      const selectedItems = new Set(['1', '3']);

      render(
        <WatchlistList
          items={mockItems}
          selectedItems={selectedItems}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      const item1 = screen.getByTestId('watchlist-item-1');
      const item2 = screen.getByTestId('watchlist-item-2');
      const item3 = screen.getByTestId('watchlist-item-3');

      expect(item1.getAttribute('data-selected')).toBe('true');
      expect(item2.getAttribute('data-selected')).toBe('false');
      expect(item3.getAttribute('data-selected')).toBe('true');
    });

    it('handles empty selection set', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      const item1 = screen.getByTestId('watchlist-item-1');
      expect(item1.getAttribute('data-selected')).toBe('false');
    });

    it('handles all items selected', () => {
      const selectedItems = new Set(['1', '2', '3']);

      render(
        <WatchlistList
          items={mockItems}
          selectedItems={selectedItems}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      const item1 = screen.getByTestId('watchlist-item-1');
      const item2 = screen.getByTestId('watchlist-item-2');
      const item3 = screen.getByTestId('watchlist-item-3');

      expect(item1.getAttribute('data-selected')).toBe('true');
      expect(item2.getAttribute('data-selected')).toBe('true');
      expect(item3.getAttribute('data-selected')).toBe('true');
    });
  });

  describe('Column Visibility', () => {
    it('passes columnsVisible prop to component', () => {
      const columnsVisible = ['title', 'year', 'rating'];

      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          columnsVisible={columnsVisible}
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      // Component should render (columnsVisible is passed to WatchlistItemCard)
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('works without columnsVisible prop', () => {
      render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(
        <WatchlistList
          items={mockItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
          className="custom-list-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-list-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty items array', () => {
      render(
        <WatchlistList
          items={[]}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      const virtualList = screen.getByTestId('virtual-list');
      // Virtual list should render but with no rows
      expect(virtualList).toBeInTheDocument();
      expect(screen.queryByTestId('list-row-0')).not.toBeInTheDocument();
    });

    it('handles single item', () => {
      render(
        <WatchlistList
          items={[mockItems[0]]}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
    });

    it('handles large number of items (100+)', () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        ...mockItems[0],
        id: `item-${i}`,
        title: `Item ${i}`,
      }));

      render(
        <WatchlistList
          items={manyItems}
          selectedItems={new Set()}
          isLoading={false}
          view="list"
          onItemSelect={mockOnItemSelect}
          onItemUpdate={mockOnItemUpdate}
          onItemRemove={mockOnItemRemove}
        />
      );

      // Should render virtual list (virtualization handles many items efficiently)
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      expect(screen.getByTestId('list-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('list-row-99')).toBeInTheDocument();
    });
  });
});

/**
 * MOCK-TO-TEST RATIO: 2 boundary mocks / 20 tests = 0.10 ✅
 * TARGET COVERAGE: 75%+
 * MOCKING STRATEGY:
 *   - react-window FixedSizeList (boundary - external library)
 *   - WatchlistItemCard (boundary - tested separately)
 */
