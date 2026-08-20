/* eslint-disable @typescript-eslint/no-explicit-any */
// Watchlist API Service with SignalR Integration

import {
  WatchlistItem,
  WatchlistSummary,
  WatchlistCategory,
  WatchlistView,
  WatchlistFilter,
  WatchlistShare,
  WatchlistExport,
  WatchlistStats,
  WatchlistNotification,
  WatchlistBulkOperation,
  WatchlistApiResponse,
  WatchlistRealTimeUpdate,
  WatchlistSyncStatus,
} from '@/types/watchlist';
import { API_URL, SERVER_API_URL } from '@/config/api';

// Type-safe SignalR connection type
type SignalRConnection = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  on: (methodName: string, callback: (...args: any[]) => void) => void;
  invoke: (methodName: string, ...args: any[]) => Promise<any>;
};

// Type-safe event listener
type EventListener<T = unknown> = (data: T) => void;

class WatchlistApiService {
  private baseUrl: string;
  private signalRConnection: SignalRConnection | null = null;
  private syncStatus: WatchlistSyncStatus = {
    isConnected: false,
    lastSync: new Date(),
    pendingChanges: 0,
    syncInProgress: false,
    connectionQuality: 'disconnected',
  };
  private listeners: Record<string, EventListener[]> = {};

  constructor() {
    this.baseUrl = API_URL;
    // BUG FIX: Don't auto-initialize SignalR - WatchlistHub requires authentication
    // SignalR will be initialized on-demand when user is authenticated
    // This prevents 404 errors for unauthenticated users
  }

  /**
   * Initialize SignalR connection (call this when user is authenticated)
   */
  async initSignalRIfAuthenticated(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Only initialize if we have an auth token
    const token = this.getAuthToken();
    if (!token) {
      return;
    }

    // Don't re-initialize if already connected
    if (this.syncStatus.isConnected) {
      return;
    }

    await this.initializeSignalR().catch(console.error);
  }

  // SignalR Real-time Connection
  private async initializeSignalR() {
    try {
      // Dynamically import SignalR to avoid SSR issues
      const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');

      // BUG-006 FIX: Correct hub URL (kebab-case) and add token
      // BUG FIX: Use SERVER_API_URL for SignalR - Next.js rewrites don't support WebSocket upgrades
      // SignalR must connect directly to the backend, not through the Next.js proxy
      const signalRBaseUrl = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020')
        : SERVER_API_URL;
      this.signalRConnection = new HubConnectionBuilder()
        .withUrl(`${signalRBaseUrl}/watchlist-hub`, {
          accessTokenFactory: () => this.getAuthToken(),
          withCredentials: true, // Send httpOnly cookies for authentication
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning) // Reduce noise in console
        .build();

      // Set up event handlers
      this.signalRConnection.on('WatchlistItemUpdated', update => {
        this.emit('itemUpdated', update as WatchlistRealTimeUpdate);
      });

      this.signalRConnection.on('AvailabilityChanged', (itemId, availability) => {
        this.emit('availabilityChanged', { itemId: itemId as string, availability });
      });

      this.signalRConnection.on('SyncStatusChanged', status => {
        this.syncStatus = status as WatchlistSyncStatus;
        this.emit('syncStatusChanged', status as WatchlistSyncStatus);
      });

      // Start connection
      await this.signalRConnection.start();
      this.syncStatus.isConnected = true;
      this.syncStatus.connectionQuality = 'excellent';
    } catch (error) {
      console.error('Failed to initialize SignalR:', error);
      this.syncStatus.connectionQuality = 'disconnected';
    }
  }

  // Event management
  on<T = unknown>(event: string, callback: EventListener<T>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback as EventListener);
  }

  off<T = unknown>(event: string, callback: EventListener<T>) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit<T = unknown>(event: string, data: T) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // E2E BUG FIX: Convert PascalCase keys to camelCase
  // Backend returns C# PascalCase (Id, IsDefault) but frontend expects camelCase (id, isDefault)
  private toCamelCase(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.toCamelCase(item));
    if (typeof obj !== 'object') return obj;

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
      result[camelKey] = this.toCamelCase((obj as Record<string, unknown>)[key]);
    }

    // E2E BUG FIX: Map backend property names to frontend expected names
    // Backend returns 'contentType' but frontend WatchlistItem expects 'type'
    if ('contentType' in result && !('type' in result)) {
      result['type'] = result['contentType'];
    }

    return result;
  }

  // HTTP Request Helper - BUG-006 FIX: Handle 401/403 gracefully
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<WatchlistApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    // SECURITY: Use cookie-based authentication instead of localStorage tokens
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Send httpOnly cookies for authentication
        headers: { ...defaultHeaders, ...options.headers },
      });

      // BUG-006 FIX: Handle auth errors gracefully instead of throwing
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: response.status === 401 ? 'Authentication required' : 'Access forbidden',
          data: [] as unknown as T,
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return { success: true, data: {} as T };
      }

      const data = JSON.parse(text);
      // E2E BUG FIX: Normalize PascalCase to camelCase for C# backend responses
      const normalizedData = this.toCamelCase(data);
      return normalizedData as WatchlistApiResponse<T>;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // DEPRECATED: Token retrieval no longer needed - using cookie-based auth
  // Kept for backwards compatibility but returns empty string
  // All authentication is now handled via httpOnly cookies (credentials: 'include')
  private getAuthToken(): string {
    return ''; // Tokens are in httpOnly cookies, not localStorage
  }

  // BUG FIX: API Contract - Use correct backend routes
  // E2E BUG FIX: Remove /api prefix since baseUrl already includes it
  // E2E BUG FIX: Use lowercase /watchlist to match Next.js route handler (case-sensitive)

  // Get all user watchlists
  async getUserWatchlists(includeShared: boolean = true): Promise<WatchlistApiResponse<WatchlistSummary[]>> {
    return this.request<WatchlistSummary[]>(`/watchlist?includeShared=${includeShared}`);
  }

  // Create a new watchlist
  async createWatchlist(name: string, description?: string): Promise<WatchlistApiResponse<WatchlistSummary>> {
    return this.request<WatchlistSummary>('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ name, description, isDefault: true }),
    });
  }

  // Watchlist Items API - requires watchlistId
  async getWatchlistItems(watchlistId: string, filter?: WatchlistFilter): Promise<WatchlistApiResponse<WatchlistItem[]>> {
    let queryParams = 'page=1&pageSize=50';
    if (filter) {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('pageSize', '50');

      // Convert complex filter to query params
      if (filter.type?.length) params.append('type', filter.type.join(','));
      if (filter.genre?.length) params.append('genre', filter.genre.join(','));
      if (filter.year?.min !== undefined) params.append('yearMin', String(filter.year.min));
      if (filter.year?.max !== undefined) params.append('yearMax', String(filter.year.max));
      if (filter.rating?.min !== undefined) params.append('ratingMin', String(filter.rating.min));
      if (filter.rating?.max !== undefined) params.append('ratingMax', String(filter.rating.max));
      if (filter.availability !== undefined) params.append('availability', String(filter.availability));
      if (filter.category?.length) params.append('category', filter.category.join(','));
      if (filter.tags?.length) params.append('tags', filter.tags.join(','));
      if (filter.watched !== undefined) params.append('watched', String(filter.watched));
      if (filter.priority?.length) params.append('priority', filter.priority.join(','));
      if (filter.searchQuery) params.append('searchQuery', filter.searchQuery);
      if (filter.sortBy) params.append('sortBy', filter.sortBy);
      if (filter.sortOrder) params.append('sortOrder', filter.sortOrder);

      queryParams = params.toString();
    }
    return this.request<WatchlistItem[]>(`/watchlist/${watchlistId}/items?${queryParams}`);
  }

  async getWatchlistItem(watchlistId: string, itemId: string): Promise<WatchlistApiResponse<WatchlistItem>> {
    return this.request<WatchlistItem>(`/watchlist/${watchlistId}/items/${itemId}`);
  }

  async addWatchlistItem(watchlistId: string, item: Partial<WatchlistItem>): Promise<WatchlistApiResponse<WatchlistItem>> {
    // E2E BUG FIX: Map frontend WatchlistItem to backend AddWatchlistItemDto
    // Backend requires: ContentType (required), ContentId (required), Title (required)
    const priorityMap: Record<string, number> = { low: 0, medium: 1, high: 2 };
    const dto = {
      contentType: item.type || 'movie',
      contentId: item.tmdbId || item.imdbId || `manual-${Date.now()}`, // Generate ID for manual entries
      title: item.title || '',
      overview: item.description,
      posterUrl: item.poster,
      releaseYear: item.year,
      rating: item.rating,
      runtime: item.duration,
      genres: item.genre,
      tags: item.tags,
      userNotes: item.personalNotes,
      priority: priorityMap[item.priority || 'medium'] ?? 1,
      status: item.watched ? 'Watched' : 'Want to Watch',
    };

    return this.request<WatchlistItem>(`/watchlist/${watchlistId}/items`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async updateWatchlistItem(itemId: string, updates: Partial<WatchlistItem>): Promise<WatchlistApiResponse<WatchlistItem>> {
    return this.request<WatchlistItem>(`/watchlist/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async removeWatchlistItem(itemId: string): Promise<WatchlistApiResponse<boolean>> {
    return this.request<boolean>(`/watchlist/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async bulkOperation(operation: WatchlistBulkOperation): Promise<WatchlistApiResponse<boolean>> {
    return this.request<boolean>('/watchlist/bulk', {
      method: 'POST',
      body: JSON.stringify(operation),
    });
  }

  // Categories API - Real backend implementation
  async getCategories(): Promise<WatchlistApiResponse<WatchlistCategory[]>> {
    return this.request<WatchlistCategory[]>('/watchlist/categories');
  }

  async createCategory(category: Partial<WatchlistCategory>): Promise<WatchlistApiResponse<WatchlistCategory>> {
    return this.request<WatchlistCategory>('/watchlist/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  async updateCategory(
    id: string,
    updates: Partial<WatchlistCategory>
  ): Promise<WatchlistApiResponse<WatchlistCategory>> {
    return this.request<WatchlistCategory>(`/watchlist/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCategory(id: string): Promise<WatchlistApiResponse<boolean>> {
    return this.request<boolean>(`/watchlist/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Views API - Real backend implementation
  async getViews(): Promise<WatchlistApiResponse<WatchlistView[]>> {
    return this.request<WatchlistView[]>('/watchlist/views');
  }

  async createView(view: Partial<WatchlistView>): Promise<WatchlistApiResponse<WatchlistView>> {
    return this.request<WatchlistView>('/watchlist/views', {
      method: 'POST',
      body: JSON.stringify(view),
    });
  }

  async updateView(id: string, updates: Partial<WatchlistView>): Promise<WatchlistApiResponse<WatchlistView>> {
    return this.request<WatchlistView>(`/watchlist/views/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteView(id: string): Promise<WatchlistApiResponse<boolean>> {
    return this.request<boolean>(`/watchlist/views/${id}`, {
      method: 'DELETE',
    });
  }

  // Sharing API - Real backend implementation
  async createShare(
    watchlistId: string,
    shareSettings: Partial<WatchlistShare>
  ): Promise<WatchlistApiResponse<WatchlistShare>> {
    return this.request<WatchlistShare>('/watchlist/shares', {
      method: 'POST',
      body: JSON.stringify({
        watchlistId,
        ...shareSettings,
      }),
    });
  }

  async getShares(watchlistId?: string): Promise<WatchlistApiResponse<WatchlistShare[]>> {
    const params = watchlistId ? `?watchlistId=${watchlistId}` : '';
    return this.request<WatchlistShare[]>(`/watchlist/shares${params}`);
  }

  async revokeShare(shareId: string): Promise<WatchlistApiResponse<boolean>> {
    return this.request<boolean>(`/watchlist/shares/${shareId}`, {
      method: 'DELETE',
    });
  }

  // Export API - Use correct backend route
  async exportWatchlist(exportSettings: WatchlistExport): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/watchlist/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify(exportSettings),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return response.blob();
  }

  // Statistics API - Use analytics endpoint from backend
  async getStats(): Promise<WatchlistApiResponse<WatchlistStats>> {
    return this.request<WatchlistStats>('/watchlist/analytics');
  }

  // Notifications API - Use correct backend routes
  async getNotifications(): Promise<WatchlistApiResponse<WatchlistNotification[]>> {
    return this.request<WatchlistNotification[]>('/watchlist/notifications/settings');
  }

  async markNotificationRead(_id: string): Promise<WatchlistApiResponse<boolean>> {
    console.warn('API: PUT /api/watchlist/notifications/:id/read endpoint not implemented in backend');
    return { success: false, data: false, message: 'Notification read marking not yet available' };
  }

  // Search and Content Discovery - Use correct backend routes
  async searchContent(query: string, _type?: string): Promise<WatchlistApiResponse<WatchlistItem[]>> {
    const params = new URLSearchParams({ query, page: '1', pageSize: '20' });
    return this.request<WatchlistItem[]>(`/watchlist/search?${params.toString()}`);
  }

  // Availability checking - Real backend implementation
  async checkAvailability(itemId: string): Promise<
    WatchlistApiResponse<{
      available: boolean;
      services: string[];
      lastChecked: Date;
    }>
  > {
    const response = await this.request<
      Array<{
        serviceName: string;
        isAvailable: boolean;
        lastChecked: string;
      }>
    >(`/watchlist/items/${itemId}/availability`);

    if (response.success && response.data) {
      const services = response.data.filter((a) => a.isAvailable).map((a) => a.serviceName);
      const lastChecked = response.data.length > 0 ? new Date(response.data[0].lastChecked) : new Date();
      return {
        success: true,
        data: {
          available: services.length > 0,
          services,
          lastChecked,
        },
      };
    }

    return {
      success: false,
      data: { available: false, services: [], lastChecked: new Date() },
      message: response.message,
    };
  }

  async refreshAvailability(itemId: string): Promise<WatchlistApiResponse<boolean>> {
    return this.request<boolean>(`/watchlist/items/${itemId}/refresh-availability`, {
      method: 'POST',
    });
  }

  // Sync Status
  getSyncStatus(): WatchlistSyncStatus {
    return this.syncStatus;
  }

  async forcSync(): Promise<void> {
    if (this.signalRConnection) {
      await this.signalRConnection.invoke('ForceSync');
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    if (this.signalRConnection) {
      await this.signalRConnection.stop();
      this.syncStatus.isConnected = false;
      this.syncStatus.connectionQuality = 'disconnected';
    }
  }
}

// Singleton instance
export const watchlistApi = new WatchlistApiService();
export default watchlistApi;
