/**
 * SearchFilterManager Tests
 * Tests for search filter state management with debouncing and persistence
 */

import { SearchFilterManager } from '../search-filter-manager';
import { ContentType } from '@/lib/types/paywall';

describe('SearchFilterManager', () => {
  let manager: SearchFilterManager;

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (manager) {
      manager.dispose();
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('initializes with default filters', () => {
      manager = new SearchFilterManager();

      const filters = manager.getFilters();

      expect(filters).toMatchObject({
        query: '',
        page: 1,
        pageSize: 10,
        sortBy: 'relevance',
        sortDirection: 'desc',
      });
    });

    it('initializes with custom initial filters', () => {
      manager = new SearchFilterManager({
        query: 'test',
        contentType: ContentType.Movie,
        minRating: 7.5,
      });

      const filters = manager.getFilters();

      expect(filters.query).toBe('test');
      expect(filters.contentType).toBe(ContentType.Movie);
      expect(filters.minRating).toBe(7.5);
    });

    it('restores filters from session storage', () => {
      // Set up stored filters
      sessionStorage.setItem('geoleap_search_filters', JSON.stringify({
        query: 'restored',
        contentType: ContentType.Show,
      }));

      manager = new SearchFilterManager();

      const filters = manager.getFilters();

      expect(filters.query).toBe('restored');
      expect(filters.contentType).toBe(ContentType.Show);
    });

    it('calls onStateRestore when restoring from storage', () => {
      const onStateRestore = jest.fn();

      sessionStorage.setItem('geoleap_search_filters', JSON.stringify({
        query: 'test',
      }));

      manager = new SearchFilterManager({}, { onStateRestore });

      expect(onStateRestore).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test' })
      );
    });

    it('does not restore if persistToSessionStorage is false', () => {
      sessionStorage.setItem('geoleap_search_filters', JSON.stringify({
        query: 'should not restore',
      }));

      manager = new SearchFilterManager({}, { persistToSessionStorage: false });

      expect(manager.getFilters().query).toBe('');
    });
  });

  describe('getFilters', () => {
    it('returns a copy of filters', () => {
      manager = new SearchFilterManager({ query: 'test' });

      const filters1 = manager.getFilters();
      const filters2 = manager.getFilters();

      expect(filters1).toEqual(filters2);
      expect(filters1).not.toBe(filters2); // Different references
    });
  });

  describe('getSearchRequest', () => {
    it('returns filters in GlobalSearchRequest format', () => {
      manager = new SearchFilterManager({
        query: 'inception',
        contentType: ContentType.Movie,
        minRating: 8.0,
      });

      const request = manager.getSearchRequest();

      expect(request).toMatchObject({
        query: 'inception',
        contentType: ContentType.Movie,
        minRating: 8.0,
      });
    });

    it('excludes sort fields from search request', () => {
      manager = new SearchFilterManager({
        query: 'test',
        sortBy: 'rating',
        sortDirection: 'asc',
      });

      const request = manager.getSearchRequest();

      expect('sortBy' in request).toBe(false);
      expect('sortDirection' in request).toBe(false);
    });
  });

  describe('updateFilter', () => {
    it('updates a single filter immediately', () => {
      manager = new SearchFilterManager();

      manager.updateFilter('query', 'new query', true);

      expect(manager.getFilters().query).toBe('new query');
    });

    it('debounces filter updates by default', () => {
      manager = new SearchFilterManager();

      manager.updateFilter('query', 'debounced');

      // Should not update immediately
      expect(manager.getFilters().query).toBe('');

      // After debounce
      jest.advanceTimersByTime(300);
      expect(manager.getFilters().query).toBe('debounced');
    });

    it('resets page to 1 when non-pagination filter changes', () => {
      manager = new SearchFilterManager({ page: 5 });

      manager.updateFilter('minRating', 7.5, true);

      expect(manager.getFilters().page).toBe(1);
    });

    it('does not reset page when updating page itself', () => {
      manager = new SearchFilterManager({ page: 1 });

      manager.updateFilter('page', 3, true);

      expect(manager.getFilters().page).toBe(3);
    });

    it('calls onFilterChange callback', () => {
      const onFilterChange = jest.fn();

      manager = new SearchFilterManager({}, { onFilterChange });

      manager.updateFilter('query', 'test', true);

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          changedField: 'query',
          previousValue: '',
          newValue: 'test',
        })
      );
    });

    it('persists to session storage', () => {
      manager = new SearchFilterManager();

      manager.updateFilter('query', 'persist me', true);

      const stored = JSON.parse(sessionStorage.getItem('geoleap_search_filters') || '{}');
      expect(stored.query).toBe('persist me');
    });

    it('clears previous debounce timeout', () => {
      manager = new SearchFilterManager();

      manager.updateFilter('query', 'first');
      manager.updateFilter('query', 'second');

      jest.advanceTimersByTime(300);

      // Only 'second' should be applied
      expect(manager.getFilters().query).toBe('second');
    });
  });

  describe('updateFilters', () => {
    it('updates multiple filters at once', () => {
      manager = new SearchFilterManager();

      manager.updateFilters({
        query: 'test',
        contentType: ContentType.Movie,
        minRating: 8.0,
      }, true);

      const filters = manager.getFilters();

      expect(filters.query).toBe('test');
      expect(filters.contentType).toBe(ContentType.Movie);
      expect(filters.minRating).toBe(8.0);
    });

    it('resets page when non-pagination filters change', () => {
      manager = new SearchFilterManager({ page: 5 });

      manager.updateFilters({
        minRating: 7.0,
        genres: ['action'],
      }, true);

      expect(manager.getFilters().page).toBe(1);
    });

    it('does not reset page when only pagination filters change', () => {
      manager = new SearchFilterManager({ page: 1 });

      manager.updateFilters({
        page: 3,
        pageSize: 20,
      }, true);

      expect(manager.getFilters().page).toBe(3);
    });

    it('debounces batch updates', () => {
      manager = new SearchFilterManager();

      manager.updateFilters({
        query: 'test',
        minRating: 7.0,
      });

      expect(manager.getFilters().query).toBe('');

      jest.advanceTimersByTime(300);

      expect(manager.getFilters().query).toBe('test');
      expect(manager.getFilters().minRating).toBe(7.0);
    });
  });

  describe('clearFilters', () => {
    it('clears all filters except query by default', () => {
      manager = new SearchFilterManager({
        query: 'keep this',
        minRating: 7.0,
        genres: ['action'],
        countries: ['US'],
      });

      manager.clearFilters();

      const filters = manager.getFilters();

      expect(filters.query).toBe('keep this');
      expect(filters.minRating).toBeUndefined();
      expect(filters.genres).toBeUndefined();
      expect(filters.countries).toBeUndefined();
    });

    it('clears query when keepQuery is false', () => {
      manager = new SearchFilterManager({ query: 'clear this' });

      manager.clearFilters(false);

      expect(manager.getFilters().query).toBe('');
    });

    it('resets to default values', () => {
      manager = new SearchFilterManager({
        sortBy: 'rating',
        sortDirection: 'asc',
      });

      manager.clearFilters();

      const filters = manager.getFilters();

      expect(filters.sortBy).toBe('relevance');
      expect(filters.sortDirection).toBe('desc');
    });
  });

  describe('getActiveFilterCount', () => {
    it('counts active filters', () => {
      manager = new SearchFilterManager({
        minRating: 7.0,
        genres: ['action'],
        countries: ['US'],
      });

      expect(manager.getActiveFilterCount()).toBe(3);
    });

    it('excludes query, page, pageSize, and sort', () => {
      manager = new SearchFilterManager({
        query: 'test',
        page: 2,
        pageSize: 20,
        sortBy: 'rating',
        sortDirection: 'asc',
      });

      expect(manager.getActiveFilterCount()).toBe(0);
    });

    it('ignores empty arrays', () => {
      manager = new SearchFilterManager({
        genres: [],
        countries: [],
      });

      expect(manager.getActiveFilterCount()).toBe(0);
    });

    it('ignores undefined and null', () => {
      manager = new SearchFilterManager({
        minRating: undefined,
        maxRating: null as any,
      });

      expect(manager.getActiveFilterCount()).toBe(0);
    });
  });

  describe('getActiveFiltersList', () => {
    it('returns display-friendly filter list', () => {
      manager = new SearchFilterManager({
        contentType: ContentType.Movie,
        minRating: 7.5,
        genres: ['action', 'thriller'],
      });

      const list = manager.getActiveFiltersList();

      expect(list).toHaveLength(3);
      expect(list[0]).toMatchObject({
        key: 'contentType',
        label: 'Type',
        value: 'Movies',
      });
      expect(list[1]).toMatchObject({
        key: 'minRating',
        label: 'Min Rating',
        value: expect.stringContaining('7.5'),
      });
    });

    it('formats year ranges', () => {
      manager = new SearchFilterManager({
        yearFrom: 2010,
        yearTo: 2020,
      });

      const list = manager.getActiveFiltersList();

      expect(list).toEqual([
        { key: 'yearFrom', label: 'From Year', value: '2010' },
        { key: 'yearTo', label: 'To Year', value: '2020' },
      ]);
    });

    it('formats array filters', () => {
      manager = new SearchFilterManager({
        genres: ['action', 'comedy'],
        services: ['netflix', 'hulu'],
      });

      const list = manager.getActiveFiltersList();

      expect(list.find(f => f.key === 'genres')?.value).toBe('action, comedy');
      expect(list.find(f => f.key === 'services')?.value).toBe('netflix, hulu');
    });
  });

  describe('subscribe', () => {
    it('calls listener on filter change', () => {
      manager = new SearchFilterManager();

      const listener = jest.fn();
      manager.subscribe(listener);

      manager.updateFilter('query', 'test', true);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test' })
      );
    });

    it('returns unsubscribe function', () => {
      manager = new SearchFilterManager();

      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();

      manager.updateFilter('query', 'test', true);

      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple listeners', () => {
      manager = new SearchFilterManager();

      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.subscribe(listener1);
      manager.subscribe(listener2);

      manager.updateFilter('query', 'test', true);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('handles listener errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      manager = new SearchFilterManager();

      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      manager.subscribe(errorListener);
      manager.subscribe(goodListener);

      manager.updateFilter('query', 'test', true);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('toURLSearchParams', () => {
    it('converts filters to URL search params', () => {
      manager = new SearchFilterManager({
        query: 'test query',
        contentType: ContentType.Movie,
        page: 2,
      });

      const params = manager.toURLSearchParams();

      expect(params.get('q')).toBe('test query');
      expect(params.get('type')).toBe(ContentType.Movie.toString());
      expect(params.get('page')).toBe('2');
    });

    it('omits default values', () => {
      manager = new SearchFilterManager({
        page: 1, // Default
        sortBy: 'relevance', // Default
      });

      const params = manager.toURLSearchParams();

      expect(params.get('page')).toBeNull();
      expect(params.get('sort')).toBeNull();
    });

    it('handles array filters', () => {
      manager = new SearchFilterManager({
        genres: ['action', 'thriller'],
        services: ['netflix'],
      });

      const params = manager.toURLSearchParams();

      expect(params.get('genres')).toBe('action,thriller');
      expect(params.get('services')).toBe('netflix');
    });
  });

  describe('fromURLSearchParams', () => {
    it('loads filters from URL search params', () => {
      manager = new SearchFilterManager();

      const params = new URLSearchParams({
        q: 'test',
        type: ContentType.Movie.toString(),
        page: '3',
      });

      manager.fromURLSearchParams(params);

      const filters = manager.getFilters();

      expect(filters.query).toBe('test');
      expect(filters.contentType).toBe(ContentType.Movie);
      expect(filters.page).toBe(3);
    });

    it('parses numeric values correctly', () => {
      manager = new SearchFilterManager();

      const params = new URLSearchParams({
        yearFrom: '2010',
        minRating: '7.5',
      });

      manager.fromURLSearchParams(params);

      const filters = manager.getFilters();

      expect(filters.yearFrom).toBe(2010);
      expect(filters.minRating).toBe(7.5);
    });

    it('parses array values', () => {
      manager = new SearchFilterManager();

      const params = new URLSearchParams({
        genres: 'action,thriller,comedy',
      });

      manager.fromURLSearchParams(params);

      expect(manager.getFilters().genres).toEqual(['action', 'thriller', 'comedy']);
    });
  });

  describe('dispose', () => {
    it('clears all debounce timeouts', () => {
      manager = new SearchFilterManager();

      manager.updateFilter('query', 'test1');
      manager.updateFilter('minRating', 7.0);

      manager.dispose();

      jest.advanceTimersByTime(1000);

      // Updates should not apply after dispose
      expect(manager.getFilters().query).toBe('');
    });

    it('clears all listeners', () => {
      manager = new SearchFilterManager();

      const listener = jest.fn();
      manager.subscribe(listener);

      manager.dispose();

      manager.updateFilter('query', 'test', true);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Session Storage', () => {
    it('persists non-default values only', () => {
      manager = new SearchFilterManager();

      manager.updateFilter('query', 'test', true);
      manager.updateFilter('page', 1, true); // Default, should not persist

      const stored = JSON.parse(sessionStorage.getItem('geoleap_search_filters') || '{}');

      expect(stored.query).toBe('test');
      expect(stored.page).toBeUndefined();
    });

    // SKIP: requestIdleCallback is not available in jsdom test environment.
    // This test would require polyfilling requestIdleCallback for the test to work.
    it.skip('uses requestIdleCallback when available', () => {
      const requestIdleCallbackSpy = jest.spyOn(window, 'requestIdleCallback');

      manager = new SearchFilterManager();

      manager.updateFilter('query', 'test', true);

      expect(requestIdleCallbackSpy).toHaveBeenCalled();

      requestIdleCallbackSpy.mockRestore();
    });

    it('handles storage errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock storage quota exceeded
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Quota exceeded');
        });

      manager = new SearchFilterManager();

      manager.updateFilter('query', 'test', true);

      // Should not throw
      expect(consoleWarnSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid successive updates', () => {
      manager = new SearchFilterManager();

      for (let i = 0; i < 100; i++) {
        manager.updateFilter('query', `query-${i}`);
      }

      jest.advanceTimersByTime(300);

      expect(manager.getFilters().query).toBe('query-99');
    });

    it('handles empty string query', () => {
      manager = new SearchFilterManager({ query: 'test' });

      manager.updateFilter('query', '', true);

      expect(manager.getFilters().query).toBe('');
    });

    it('handles zero values correctly', () => {
      manager = new SearchFilterManager();

      manager.updateFilter('minRating', 0, true);

      // 0 is a valid value, should be counted as an active filter
      expect(manager.getActiveFilterCount()).toBe(1);
    });
  });
});
