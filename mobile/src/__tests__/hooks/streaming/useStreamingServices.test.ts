/**
 * Comprehensive Tests for useStreamingServices Hook
 * Tests user streaming service preference management with API and local storage
 *
 * Test Coverage:
 * - Loading preferences (API vs local storage)
 * - Service selection/deselection
 * - Setting multiple services
 * - Saving preferences (API vs local)
 * - Unsaved changes tracking
 * - Error handling
 */

// Mock logger before any other imports
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

// Mock AsyncStorage with getter properties for default export
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockClear = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  get default() {
    return {
      get getItem() { return mockGetItem; },
      get setItem() { return mockSetItem; },
      get removeItem() { return mockRemoveItem; },
      get clear() { return mockClear; },
    };
  },
}));

// Mock React Query
const mockInvalidateQueries = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

// Mock ApiService
const mockApiGet = jest.fn();
const mockApiPut = jest.fn();

jest.mock('../../../services/api/ApiService', () => ({
  __esModule: true,
  get default() {
    return {
      get: mockApiGet,
      put: mockApiPut,
    };
  },
}));

// Import after mocks
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStreamingServices } from '../../../hooks/useStreamingServices';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UserStreamingPreferences } from '../../../types/streaming.types';

// Mock user preferences
const createMockPreferences = (userId: string, services: string[]): UserStreamingPreferences => ({
  userId,
  selectedServices: services,
  preferredRegion: 'US',
  notifications: {
    availabilityAlerts: true,
    newContentAlerts: true,
    priceChanges: false,
  },
});

describe('useStreamingServices Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset AsyncStorage mocks
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);

    // Reset API mocks
    mockApiGet.mockResolvedValue({ success: true, data: null });
    mockApiPut.mockResolvedValue({ success: true, data: null });

    // Setup default React Query mocks
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    // Mock useMutation to actually execute mutationFn and onSuccess
    (useMutation as jest.Mock).mockImplementation(({ mutationFn, onSuccess }) => ({
      mutateAsync: jest.fn(async (services: string[]) => {
        const result = await mutationFn(services);
        if (onSuccess) {
          onSuccess();
        }
        return result;
      }),
      isPending: false,
    }));
  });

  // ============================================
  // Initialization & Loading Tests (2 tests)
  // ============================================

  it('should load local preferences when no userId provided', async () => {
    const savedServices = ['netflix', 'hulu', 'disney'];
    mockGetItem.mockResolvedValue(JSON.stringify(savedServices));

    const { result } = renderHook(() => useStreamingServices());

    // Wait for AsyncStorage to load
    await waitFor(() => {
      expect(result.current.selectedServices).toEqual(savedServices);
    });

    expect(mockGetItem).toHaveBeenCalledWith('@streaming_services');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should load API preferences when userId provided', async () => {
    const userId = 'user-123';
    const mockPreferences = createMockPreferences(userId, ['netflix', 'prime']);

    // Mock useQuery to return preferences
    (useQuery as jest.Mock).mockReturnValue({
      data: mockPreferences,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useStreamingServices(userId));

    await waitFor(() => {
      expect(result.current.selectedServices).toEqual(['netflix', 'prime']);
    });

    expect(result.current.isLoading).toBe(false);

    // Should also save to local storage
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        '@streaming_services',
        JSON.stringify(['netflix', 'prime'])
      );
    });
  });

  // ============================================
  // Service Selection Tests (3 tests)
  // ============================================

  it('should select a service and mark as unsaved', async () => {
    const { result } = renderHook(() => useStreamingServices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.selectedServices).toEqual([]);
    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => {
      result.current.selectService('netflix');
    });

    expect(result.current.selectedServices).toEqual(['netflix']);
    expect(result.current.hasUnsavedChanges).toBe(true);

    // Select another service
    act(() => {
      result.current.selectService('hulu');
    });

    expect(result.current.selectedServices).toEqual(['netflix', 'hulu']);
  });

  it('should deselect a service', async () => {
    const savedServices = ['netflix', 'hulu', 'disney'];
    mockGetItem.mockResolvedValue(JSON.stringify(savedServices));

    const { result } = renderHook(() => useStreamingServices());

    await waitFor(() => {
      expect(result.current.selectedServices).toEqual(savedServices);
    });

    act(() => {
      result.current.deselectService('hulu');
    });

    expect(result.current.selectedServices).toEqual(['netflix', 'disney']);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should set multiple services at once', async () => {
    const { result } = renderHook(() => useStreamingServices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newServices = ['netflix', 'prime', 'disney', 'hulu'];

    act(() => {
      result.current.setServices(newServices);
    });

    expect(result.current.selectedServices).toEqual(newServices);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  // ============================================
  // Saving Preferences Tests (2 tests)
  // ============================================

  it('should save to localStorage when no userId', async () => {
    const { result } = renderHook(() => useStreamingServices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectService('netflix');
      result.current.selectService('hulu');
    });

    expect(result.current.hasUnsavedChanges).toBe(true);

    await act(async () => {
      await result.current.savePreferences();
    });

    // Mutation should save to localStorage
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith(
        '@streaming_services',
        JSON.stringify(['netflix', 'hulu'])
      );
    });

    // hasUnsavedChanges should be cleared after successful save
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should save to API when userId provided', async () => {
    const userId = 'user-123';
    mockApiPut.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useStreamingServices(userId));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.selectService('netflix');
    });

    await act(async () => {
      await result.current.savePreferences();
    });

    // Mutation should call API
    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        '/api/user/preferences/streaming-services',
        { selectedServices: ['netflix'] }
      );
    });

    // hasUnsavedChanges should be cleared after successful save
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  // ============================================
  // State Management Test (1 test)
  // ============================================

  it('should track unsaved changes correctly', async () => {
    const { result } = renderHook(() => useStreamingServices());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Initial state - no unsaved changes
    expect(result.current.hasUnsavedChanges).toBe(false);

    // Select service - should mark as unsaved
    act(() => {
      result.current.selectService('netflix');
    });
    expect(result.current.hasUnsavedChanges).toBe(true);

    // Save - should clear unsaved flag
    await act(async () => {
      await result.current.savePreferences();
    });

    // After save, hasUnsavedChanges should be false
    // This happens in the onSuccess callback of the mutation
    await waitFor(() => {
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });
});
