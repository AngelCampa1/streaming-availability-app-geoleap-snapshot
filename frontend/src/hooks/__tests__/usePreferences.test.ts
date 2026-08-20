/**
 * Comprehensive tests for usePreferences.ts
 *
 * Coverage Target: 85%+
 * Strategy: Test queries, mutations, SignalR integration, file export/import, search
 * Complexity: SignalR real-time features + file downloads
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  usePreferences,
  useCategoryPreferences,
  usePreferenceSearch,
  type PreferenceCategory,
  type ExportedPreferences,
} from '../usePreferences';
import { apiCall } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { signalRPreferencesClient } from '@/services/signalRClient';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/api');
jest.mock('@/contexts/AuthContext');
jest.mock('@/services/signalRClient', () => ({
  signalRPreferencesClient: {
    connect: jest.fn(),
    joinUserGroup: jest.fn(),
    leaveUserGroup: jest.fn(),
    onPreferenceUpdated: jest.fn(),
    onPreferencesUpdated: jest.fn(),
    onPreferenceReset: jest.fn(),
    off: jest.fn(),
    notifyPreferenceChange: jest.fn(),
    isConnected: false,
    connectionState: 'Disconnected',
  },
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
  },
}));

const mockApiCall = apiCall as jest.MockedFunction<typeof apiCall>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSignalRClient = signalRPreferencesClient as jest.Mocked<typeof signalRPreferencesClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Test data
const mockPreferences = {
  general: {
    theme: 'light',
    language: 'en',
  },
  notifications: {
    email: true,
    push: false,
  },
};

const mockCategories: PreferenceCategory[] = [
  {
    name: 'general',
    displayName: 'General',
    description: 'General settings',
    preferences: [
      {
        category: 'general',
        key: 'theme',
        value: 'dark',
        valueType: 'String',
        isDefault: false,
        lastModified: '2024-01-01T00:00:00Z',
      },
    ],
  },
];

const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

// Mock DOM APIs for file download
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
const mockClick = jest.fn();
let mockAnchorElement: HTMLAnchorElement | null = null;

// Store original functions
const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;
const originalCreateElement = document.createElement.bind(document);

// Mock URL APIs
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Spy on createElement to intercept anchor creation
beforeAll(() => {
  jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const element = originalCreateElement(tagName);
    if (tagName === 'a') {
      mockAnchorElement = element as HTMLAnchorElement;
      // Mock click method
      element.click = mockClick;
    }
    return element;
  });
});

afterAll(() => {
  // Restore original functions
  global.URL.createObjectURL = originalCreateObjectURL;
  global.URL.revokeObjectURL = originalRevokeObjectURL;
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSignalRClient.connect.mockResolvedValue(undefined);
  Object.defineProperty(mockSignalRClient, 'isConnected', {
    value: false,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(mockSignalRClient, 'connectionState', {
    value: 'Disconnected',
    writable: true,
    configurable: true,
  });
  mockAnchorElement = null;
});

describe('usePreferences - Authentication & SignalR', () => {
  it('should not fetch when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('should connect to SignalR when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);

    renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSignalRClient.connect).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSignalRClient.joinUserGroup).toHaveBeenCalledWith(mockUser.id);
    });
  });

  it('should leave SignalR group on unmount', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);

    const { unmount } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSignalRClient.connect).toHaveBeenCalled();
    });

    unmount();

    expect(mockSignalRClient.leaveUserGroup).toHaveBeenCalledWith(mockUser.id);
  });

  it('should handle SignalR connection error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Connection failed');
    mockSignalRClient.connect.mockRejectedValueOnce(error);

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);

    renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });

    consoleErrorSpy.mockRestore();
  });
});

describe('usePreferences - Queries', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
  });

  it('should fetch preferences successfully', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences) // preferences
      .mockResolvedValueOnce(mockCategories); // categories

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toEqual(mockPreferences);
    expect(result.current.categories).toEqual(mockCategories);
  });

  it('should expose refetch function', async () => {
    mockApiCall.mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('usePreferences - Update Preference', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
  });

  it('should update single preference successfully', async () => {
    const updatedPreference = {
      category: 'general',
      key: 'theme',
      value: 'light',
      valueType: 'String' as const,
      isDefault: false,
      lastModified: '2024-01-02T00:00:00Z',
    };

    mockApiCall
      .mockResolvedValueOnce(mockPreferences) // initial fetch
      .mockResolvedValueOnce(mockCategories) // categories
      .mockResolvedValueOnce(updatedPreference); // update

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update preference
    result.current.updatePreference({
      category: 'general',
      key: 'theme',
      value: 'light',
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/general/theme', {
      method: 'PUT',
      body: JSON.stringify({ value: 'light' }),
    });

    expect(mockSignalRClient.notifyPreferenceChange).toHaveBeenCalledWith(
      'general',
      'theme',
      'light'
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      '[usePreferences] Preference updated successfully',
      { category: 'general', key: 'theme' }
    );
  });

  it('should handle update error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Update failed');

    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.updatePreference({
      category: 'general',
      key: 'theme',
      value: 'light',
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update preference:', error);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update preference');

    consoleErrorSpy.mockRestore();
  });
});

describe('usePreferences - Bulk Update', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
  });

  it('should bulk update preferences successfully', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(undefined); // bulk update

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updates = [
      { category: 'general', preferences: { theme: 'light', language: 'es' } },
    ];

    result.current.bulkUpdate(updates);

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/bulk', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      '[usePreferences] Preferences updated successfully (bulk update)'
    );
  });

  it('should handle bulk update error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Bulk update failed');

    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.bulkUpdate([]);

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to bulk update preferences:', error);

    consoleErrorSpy.mockRestore();
  });
});

describe('usePreferences - Reset', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
  });

  it('should reset all preferences', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(undefined); // reset

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.reset(undefined);

    await waitFor(() => {
      expect(result.current.isResetting).toBe(false);
    });

    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/reset', {
      method: 'POST',
    });

    expect(mockLogger.info).toHaveBeenCalledWith('[usePreferences] All preferences reset');
  });

  it('should reset category preferences', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.reset('general');

    await waitFor(() => {
      expect(result.current.isResetting).toBe(false);
    });

    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/reset?category=general', {
      method: 'POST',
    });

    expect(mockLogger.info).toHaveBeenCalledWith('[usePreferences] general preferences reset');
  });

  it('should handle reset error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Reset failed');

    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.reset(undefined);

    await waitFor(() => {
      expect(result.current.isResetting).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to reset preferences:', error);

    consoleErrorSpy.mockRestore();
  });
});

describe('usePreferences - Export', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);

    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  it('should export preferences and download file', async () => {
    const exportData: ExportedPreferences = {
      preferences: mockPreferences,
      exportedAt: '2024-01-01T00:00:00Z',
      version: '1.0',
    };

    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(exportData);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.export();

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false);
    });

    // Verify API call
    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/export', {
      method: 'POST',
    });

    // Verify file download
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    // Verify anchor element was created and configured
    expect(mockAnchorElement).toBeTruthy();
    expect(mockAnchorElement?.href).toBe('blob:mock-url');
    expect(mockAnchorElement?.download).toContain('preferences-');

    expect(mockLogger.info).toHaveBeenCalledWith(
      '[usePreferences] Preferences exported successfully'
    );
  });

  it('should handle export error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Export failed');

    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.export();

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to export preferences:', error);
    expect(mockCreateObjectURL).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe('usePreferences - Import', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
  });

  it('should import preferences successfully', async () => {
    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(undefined); // import

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const importData = {
      general: { theme: 'light' },
    };

    result.current.import(importData);

    await waitFor(() => {
      expect(result.current.isImporting).toBe(false);
    });

    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/import', {
      method: 'POST',
      body: JSON.stringify({ preferences: importData }),
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      '[usePreferences] Preferences imported successfully'
    );
  });

  it('should handle import error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Import failed');

    mockApiCall
      .mockResolvedValueOnce(mockPreferences)
      .mockResolvedValueOnce(mockCategories)
      .mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.import({});

    await waitFor(() => {
      expect(result.current.isImporting).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to import preferences:', error);

    consoleErrorSpy.mockRestore();
  });
});

describe('usePreferences - Helper Functions', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
  });

  it('should get preference by category and key', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences).mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getPreference('general', 'theme')).toBe('light');
    expect(result.current.getPreference('general', 'nonexistent', 'default')).toBe('default');
  });

  it('should get category preferences', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences).mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getCategoryPreferences('general')).toEqual({
      theme: 'light',
      language: 'en',
    });

    expect(result.current.getCategoryPreferences('nonexistent')).toEqual({});
  });
});

describe('usePreferences - SignalR Real-time Updates', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
  });

  it('should expose SignalR connection state', async () => {
    mockApiCall.mockResolvedValue(mockPreferences);
    Object.defineProperty(mockSignalRClient, 'isConnected', {
      value: true,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(mockSignalRClient, 'connectionState', {
      value: 'Connected',
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionState).toBe('Connected');
  });

  it('should register SignalR event handlers', () => {
    mockApiCall.mockResolvedValue(mockPreferences);

    renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    expect(mockSignalRClient.onPreferenceUpdated).toHaveBeenCalled();
    expect(mockSignalRClient.onPreferencesUpdated).toHaveBeenCalled();
    expect(mockSignalRClient.onPreferenceReset).toHaveBeenCalled();
  });

  it('should clean up SignalR handlers on unmount', () => {
    mockApiCall.mockResolvedValue(mockPreferences);

    const { unmount } = renderHook(() => usePreferences(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(mockSignalRClient.off).toHaveBeenCalledWith(
      'PreferenceUpdated',
      expect.any(Function)
    );
    expect(mockSignalRClient.off).toHaveBeenCalledWith(
      'PreferencesUpdated',
      expect.any(Function)
    );
    expect(mockSignalRClient.off).toHaveBeenCalledWith('PreferenceReset', expect.any(Function));
  });
});

describe('useCategoryPreferences', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
  });

  it('should fetch category preferences', async () => {
    const categoryPrefs = { theme: 'light', language: 'en' };
    mockApiCall.mockResolvedValueOnce(categoryPrefs);

    const { result } = renderHook(() => useCategoryPreferences('general'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(categoryPrefs);
    expect(mockApiCall).toHaveBeenCalledWith('/api/preferences/general');
  });

  it('should not fetch when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any);

    renderHook(() => useCategoryPreferences('general'), {
      wrapper: createWrapper(),
    });

    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('should not fetch without category', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);

    renderHook(() => useCategoryPreferences(''), {
      wrapper: createWrapper(),
    });

    expect(mockApiCall).not.toHaveBeenCalled();
  });
});

describe('usePreferenceSearch', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    } as any);
  });

  it('should return all preferences when search is empty', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences).mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => usePreferenceSearch(''), {
      wrapper: createWrapper(),
    });

    // Wait for preferences to load (check for non-empty object)
    await waitFor(() => {
      expect(Object.keys(result.current).length).toBeGreaterThan(0);
    });

    expect(result.current).toEqual(mockPreferences);
  });

  it('should filter by preference key', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences).mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => usePreferenceSearch('theme'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(Object.keys(result.current).length).toBeGreaterThan(0);
    });

    expect(result.current).toEqual({
      general: { theme: 'light' },
    });
  });

  it('should filter by category name', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences).mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => usePreferenceSearch('notif'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(Object.keys(result.current).length).toBeGreaterThan(0);
    });

    expect(result.current).toEqual({
      notifications: { email: true, push: false },
    });
  });

  it('should filter by specific category', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences).mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => usePreferenceSearch('', 'general'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(Object.keys(result.current.general || {}).length).toBeGreaterThan(0);
    });

    expect(result.current).toEqual({
      general: { theme: 'light', language: 'en' },
    });
  });

  it('should filter by search term within category', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences).mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => usePreferenceSearch('email', 'notifications'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(Object.keys(result.current).length).toBeGreaterThan(0);
    });

    expect(result.current).toEqual({
      notifications: { email: true },
    });
  });

  it('should return empty when no matches', async () => {
    mockApiCall.mockResolvedValueOnce(mockPreferences).mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => usePreferenceSearch('nonexistent'), {
      wrapper: createWrapper(),
    });

    // Initially might be empty, but should stabilize
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current).toEqual({});
  });
});
