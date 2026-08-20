/**
 * MSW Watchlist Handlers
 *
 * Comprehensive handlers for WatchlistService API mocking:
 * - CRUD operations for watchlists
 * - CRUD operations for watchlist items
 * - Search and filtering
 * - Stats calculation
 * - Share/import functionality
 * - Sync operations
 */

import { http, HttpResponse, delay } from 'msw';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

/**
 * Helper to safely get URL search params
 * Works around TypeScript not recognizing polyfilled URLSearchParams.get()
 */
const getSearchParam = (url: URL, param: string): string | null => {
  return (url.searchParams as any).get(param);
};

// Mock data types
interface WatchlistItem {
  id: string;
  title: string;
  type: 'movie' | 'tv_series' | 'documentary' | 'anime' | 'other';
  rating: number;
  year: number;
  availableOn: string[];
  poster?: string;
  backdrop?: string;
  genres: string[];
  runtime?: number;
  seasons?: number;
  status: 'to_watch' | 'watching' | 'watched' | 'on_hold' | 'dropped';
  priority: 'low' | 'medium' | 'high';
  progress?: {
    current?: number;
    total?: number;
    episode?: number;
    season?: number;
  };
  addedAt: string;
  watchedAt?: string;
  notes?: string;
  tags?: string[];
  userRating?: number;
  review?: string;
  rewatchCount?: number;
}

interface Watchlist {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  items: WatchlistItem[];
  color?: string;
  icon?: string;
  createdBy: string;
  collaborators?: string[];
  createdAt: string;
  updatedAt: string;
  shareCode?: string;
}

// In-memory storage for tests
let mockWatchlists: Watchlist[] = [
  {
    id: 'watchlist-1',
    name: 'My Default Watchlist',
    description: 'My main watchlist',
    isDefault: true,
    isPublic: false,
    items: [
      {
        id: 'item-1',
        title: 'The Matrix',
        type: 'movie',
        rating: 8.7,
        year: 1999,
        availableOn: ['Netflix', 'HBO Max'],
        genres: ['Action', 'Sci-Fi'],
        status: 'watched',
        priority: 'high',
        addedAt: '2024-01-01T00:00:00Z',
        watchedAt: '2024-01-15T00:00:00Z',
        userRating: 9,
        runtime: 136,
      },
      {
        id: 'item-2',
        title: 'Breaking Bad',
        type: 'tv_series',
        rating: 9.5,
        year: 2008,
        availableOn: ['Netflix'],
        genres: ['Crime', 'Drama'],
        status: 'watching',
        priority: 'high',
        addedAt: '2024-01-05T00:00:00Z',
        seasons: 5,
        progress: {
          season: 3,
          episode: 7,
        },
      },
    ],
    color: '#7c3aed',
    createdBy: 'user-123',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'watchlist-2',
    name: 'Action Movies',
    description: 'My favorite action films',
    isDefault: false,
    isPublic: true,
    items: [],
    color: '#f59e0b',
    createdBy: 'user-123',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    shareCode: 'SHARE123',
  },
];

let shareCodeCounter = 1000;

export const watchlistHandlers = [
  // ==========================================================================
  // GET /api/users/watchlist - Get all watchlists
  // ==========================================================================
  http.get(`${BASE_URL}/api/users/watchlist`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        watchlists: mockWatchlists,
      },
    });
  }),

  // ==========================================================================
  // GET /api/users/watchlist/:id - Get single watchlist
  // ==========================================================================
  http.get(`${BASE_URL}/api/users/watchlist/:id`, async ({ params, request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const { id } = params;
    const watchlist = mockWatchlists.find(w => w.id === id);

    if (!watchlist) {
      return HttpResponse.json(
        { success: false, error: { message: 'Watchlist not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        watchlist,
      },
    });
  }),

  // ==========================================================================
  // POST /api/users/watchlist - Create new watchlist
  // ==========================================================================
  http.post(`${BASE_URL}/api/users/watchlist`, async ({ request }) => {
    await delay(120);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const body = await request.json() as Partial<Watchlist>;

    const newWatchlist: Watchlist = {
      id: `watchlist-${Date.now()}`,
      name: body.name || 'Untitled Watchlist',
      description: body.description,
      isDefault: body.isDefault || false,
      isPublic: body.isPublic || false,
      items: [],
      color: body.color,
      icon: body.icon,
      createdBy: body.createdBy || 'user-123',
      collaborators: body.collaborators || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockWatchlists.push(newWatchlist);

    return HttpResponse.json({
      success: true,
      data: {
        watchlist: newWatchlist,
      },
    });
  }),

  // ==========================================================================
  // PUT /api/users/watchlist/:id - Update watchlist
  // ==========================================================================
  http.put(`${BASE_URL}/api/users/watchlist/:id`, async ({ params, request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const { id } = params;
    const updates = await request.json() as Partial<Watchlist>;

    const watchlistIndex = mockWatchlists.findIndex(w => w.id === id);

    if (watchlistIndex === -1) {
      return HttpResponse.json(
        { success: false, error: { message: 'Watchlist not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const updatedWatchlist = {
      ...mockWatchlists[watchlistIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    mockWatchlists[watchlistIndex] = updatedWatchlist;

    return HttpResponse.json({
      success: true,
      data: {
        watchlist: updatedWatchlist,
      },
    });
  }),

  // ==========================================================================
  // DELETE /api/users/watchlist/:id - Delete watchlist
  // ==========================================================================
  http.delete(`${BASE_URL}/api/users/watchlist/:id`, async ({ params, request }) => {
    await delay(80);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const { id } = params;
    const watchlistIndex = mockWatchlists.findIndex(w => w.id === id);

    if (watchlistIndex === -1) {
      return HttpResponse.json(
        { success: false, error: { message: 'Watchlist not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    mockWatchlists.splice(watchlistIndex, 1);

    return HttpResponse.json({
      success: true,
    });
  }),

  // ==========================================================================
  // POST /api/streaming/watchlist/:watchlistId/items - Add item to watchlist
  // ==========================================================================
  http.post(`${BASE_URL}/api/streaming/watchlist/:watchlistId/items`, async ({ params, request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const { watchlistId } = params;
    const item = await request.json() as WatchlistItem;

    const watchlist = mockWatchlists.find(w => w.id === watchlistId);

    if (!watchlist) {
      return HttpResponse.json(
        { success: false, error: { message: 'Watchlist not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Check if item already exists
    const exists = watchlist.items.some(i => i.id === item.id || i.title === item.title);

    if (exists) {
      return HttpResponse.json(
        { success: false, error: { message: 'Item already in watchlist', code: 'ALREADY_EXISTS' } },
        { status: 409 }
      );
    }

    watchlist.items.push(item);
    watchlist.updatedAt = new Date().toISOString();

    return HttpResponse.json({
      success: true,
      data: {
        item,
      },
    });
  }),

  // ==========================================================================
  // PUT /api/streaming/watchlist/:watchlistId/items/:itemId - Update watchlist item
  // ==========================================================================
  http.put(`${BASE_URL}/api/streaming/watchlist/:watchlistId/items/:itemId`, async ({ params, request }) => {
    await delay(90);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const { watchlistId, itemId } = params;
    const updates = await request.json() as Partial<WatchlistItem>;

    const watchlist = mockWatchlists.find(w => w.id === watchlistId);

    if (!watchlist) {
      return HttpResponse.json(
        { success: false, error: { message: 'Watchlist not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const itemIndex = watchlist.items.findIndex(i => i.id === itemId);

    if (itemIndex === -1) {
      return HttpResponse.json(
        { success: false, error: { message: 'Item not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const updatedItem = {
      ...watchlist.items[itemIndex],
      ...updates,
    };

    watchlist.items[itemIndex] = updatedItem;
    watchlist.updatedAt = new Date().toISOString();

    return HttpResponse.json({
      success: true,
      data: {
        item: updatedItem,
      },
    });
  }),

  // ==========================================================================
  // DELETE /api/streaming/watchlist/:watchlistId/items/:itemId - Remove item from watchlist
  // ==========================================================================
  http.delete(`${BASE_URL}/api/streaming/watchlist/:watchlistId/items/:itemId`, async ({ params, request }) => {
    await delay(70);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const { watchlistId, itemId } = params;

    const watchlist = mockWatchlists.find(w => w.id === watchlistId);

    if (!watchlist) {
      return HttpResponse.json(
        { success: false, error: { message: 'Watchlist not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const itemIndex = watchlist.items.findIndex(i => i.id === itemId);

    if (itemIndex === -1) {
      return HttpResponse.json(
        { success: false, error: { message: 'Item not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    watchlist.items.splice(itemIndex, 1);
    watchlist.updatedAt = new Date().toISOString();

    return HttpResponse.json({
      success: true,
    });
  }),

  // ==========================================================================
  // GET /api/users/:userId/watchlist-stats - Get watchlist statistics
  // ==========================================================================
  http.get(`${BASE_URL}/api/users/:userId/watchlist-stats`, async ({ params, request }) => {
    await delay(110);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const allItems = mockWatchlists.flatMap(w => w.items);

    const totalItems = allItems.length;
    const watchedItems = allItems.filter(i => i.status === 'watched').length;
    const currentlyWatching = allItems.filter(i => i.status === 'watching').length;

    const ratings = allItems.filter(i => i.userRating).map(i => i.userRating!);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    const genreCounts = allItems.reduce((acc, item) => {
      item.genres.forEach(genre => {
        acc[genre] = (acc[genre] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const favoriteGenre = Object.entries(genreCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '';

    const totalTimeWatched = allItems.reduce((total, item) => {
      return total + (item.runtime || 0) * (item.rewatchCount || 1);
    }, 0);

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const thisMonthAdded = allItems.filter(i => new Date(i.addedAt) > thisMonth).length;
    const thisMonthWatched = allItems.filter(i => i.watchedAt && new Date(i.watchedAt) > thisMonth).length;

    return HttpResponse.json({
      success: true,
      data: {
        totalItems,
        watchedItems,
        currentlyWatching,
        averageRating,
        favoriteGenre,
        totalTimeWatched,
        thisMonthAdded,
        thisMonthWatched,
      },
    });
  }),

  // ==========================================================================
  // GET /api/watchlists/search - Search watchlists
  // ==========================================================================
  http.get(`${BASE_URL}/api/watchlists/search`, async ({ request }) => {
    await delay(100);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const query = getSearchParam(url, 'query') || '';
    const genre = getSearchParam(url, 'genre');
    const type = getSearchParam(url, 'type');
    const status = getSearchParam(url, 'status');
    const rating = getSearchParam(url, 'rating');

    let items = mockWatchlists.flatMap(w => w.items);

    // Filter by query
    if (query) {
      items = items.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.genres.some(g => g.toLowerCase().includes(query.toLowerCase()))
      );
    }

    // Apply filters
    if (genre) {
      items = items.filter(item => item.genres.includes(genre));
    }

    if (type) {
      items = items.filter(item => item.type === type);
    }

    if (status) {
      items = items.filter(item => item.status === status);
    }

    if (rating) {
      const minRating = parseFloat(rating);
      items = items.filter(item => item.rating >= minRating);
    }

    return HttpResponse.json({
      success: true,
      data: items,
    });
  }),

  // ==========================================================================
  // POST /api/users/watchlist/:watchlistId/share - Share watchlist
  // ==========================================================================
  http.post(`${BASE_URL}/api/users/watchlist/:watchlistId/share`, async ({ params, request }) => {
    await delay(90);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const { watchlistId } = params;

    const watchlist = mockWatchlists.find(w => w.id === watchlistId);

    if (!watchlist) {
      return HttpResponse.json(
        { success: false, error: { message: 'Watchlist not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Generate share code if not exists
    if (!watchlist.shareCode) {
      watchlist.shareCode = `SHARE${shareCodeCounter++}`;
    }

    return HttpResponse.json({
      success: true,
      data: {
        shareCode: watchlist.shareCode,
      },
    });
  }),

  // ==========================================================================
  // POST /api/users/watchlist/import - Import shared watchlist
  // ==========================================================================
  http.post(`${BASE_URL}/api/users/watchlist/import`, async ({ request }) => {
    await delay(120);

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const body = await request.json() as { shareCode: string };

    const sharedWatchlist = mockWatchlists.find(w => w.shareCode === body.shareCode);

    if (!sharedWatchlist) {
      return HttpResponse.json(
        { success: false, error: { message: 'Invalid share code', code: 'INVALID_SHARE_CODE' } },
        { status: 404 }
      );
    }

    // Create a copy of the shared watchlist
    const importedWatchlist: Watchlist = {
      ...sharedWatchlist,
      id: `watchlist-imported-${Date.now()}`,
      name: `${sharedWatchlist.name} (Imported)`,
      isDefault: false,
      createdBy: 'user-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shareCode: undefined,
    };

    mockWatchlists.push(importedWatchlist);

    return HttpResponse.json({
      success: true,
      data: {
        watchlist: importedWatchlist,
      },
    });
  }),
];

// Helper to reset watchlist state between tests
export function resetMockWatchlist() {
  mockWatchlists = [
    {
      id: 'watchlist-1',
      name: 'My Default Watchlist',
      description: 'My main watchlist',
      isDefault: true,
      isPublic: false,
      items: [
        {
          id: 'item-1',
          title: 'The Matrix',
          type: 'movie',
          rating: 8.7,
          year: 1999,
          availableOn: ['Netflix', 'HBO Max'],
          genres: ['Action', 'Sci-Fi'],
          status: 'watched',
          priority: 'high',
          addedAt: '2024-01-01T00:00:00Z',
          watchedAt: '2024-01-15T00:00:00Z',
          userRating: 9,
          runtime: 136,
        },
        {
          id: 'item-2',
          title: 'Breaking Bad',
          type: 'tv_series',
          rating: 9.5,
          year: 2008,
          availableOn: ['Netflix'],
          genres: ['Crime', 'Drama'],
          status: 'watching',
          priority: 'high',
          addedAt: '2024-01-05T00:00:00Z',
          seasons: 5,
          progress: {
            season: 3,
            episode: 7,
          },
        },
      ],
      color: '#7c3aed',
      createdBy: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
    {
      id: 'watchlist-2',
      name: 'Action Movies',
      description: 'My favorite action films',
      isDefault: false,
      isPublic: true,
      items: [],
      color: '#f59e0b',
      createdBy: 'user-123',
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
      shareCode: 'SHARE123',
    },
  ];
  shareCodeCounter = 1000;
}
