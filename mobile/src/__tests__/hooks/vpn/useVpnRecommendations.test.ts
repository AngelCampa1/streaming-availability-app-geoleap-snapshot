/**
 * Comprehensive Tests for useVpnRecommendations Hook
 * Tests VPN provider recommendations based on user's streaming services
 *
 * Test Coverage:
 * - Initialization with no services
 * - Basic recommendations with single service
 * - Multiple services scoring
 * - maxResults parameter
 * - Loading state propagation
 * - Top provider selection
 * - hasRecommendations flag
 * - Memoization behavior
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

// Mock useStreamingServices hook
const mockUseStreamingServices = jest.fn();
jest.mock('../../../hooks/useStreamingServices', () => ({
  useStreamingServices: () => mockUseStreamingServices(),
}));

// Import after mocks
import { renderHook, waitFor } from '@testing-library/react-native';
import { useVpnRecommendations } from '../../../hooks/useVpnRecommendations';

describe('useVpnRecommendations Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Initialization Tests (2 tests)
  // ============================================

  it('should return empty recommendations when no services selected', () => {
    // Mock no selected services
    mockUseStreamingServices.mockReturnValue({
      selectedServices: [],
      isLoading: false,
    });

    const { result } = renderHook(() => useVpnRecommendations());

    expect(result.current.recommendations).toEqual([]);
    expect(result.current.topProvider).toBeNull();
    expect(result.current.hasRecommendations).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should pass through loading state from useStreamingServices', () => {
    mockUseStreamingServices.mockReturnValue({
      selectedServices: [],
      isLoading: true,
    });

    const { result } = renderHook(() => useVpnRecommendations());

    expect(result.current.isLoading).toBe(true);
  });

  // ============================================
  // Basic Recommendations Tests (2 tests)
  // ============================================

  it('should return recommendations when services are selected', () => {
    mockUseStreamingServices.mockReturnValue({
      selectedServices: ['netflix'],
      isLoading: false,
    });

    const { result } = renderHook(() => useVpnRecommendations());

    expect(result.current.recommendations.length).toBeGreaterThan(0);
    expect(result.current.hasRecommendations).toBe(true);
    expect(result.current.topProvider).toBeTruthy();

    // Verify recommendation structure
    const firstRecommendation = result.current.recommendations[0];
    expect(firstRecommendation).toHaveProperty('provider');
    expect(firstRecommendation).toHaveProperty('score');
    expect(firstRecommendation).toHaveProperty('reason');
    expect(firstRecommendation).toHaveProperty('matchedServices');
    expect(firstRecommendation).toHaveProperty('pricePerMonth');
  });

  it('should select top provider as first recommendation', () => {
    mockUseStreamingServices.mockReturnValue({
      selectedServices: ['netflix', 'hulu'],
      isLoading: false,
    });

    const { result } = renderHook(() => useVpnRecommendations());

    expect(result.current.topProvider).toBe(result.current.recommendations[0]);
  });

  // ============================================
  // maxResults Parameter Tests (1 test)
  // ============================================

  it('should respect maxResults parameter', () => {
    mockUseStreamingServices.mockReturnValue({
      selectedServices: ['netflix'],
      isLoading: false,
    });

    // Test with maxResults = 2
    const { result: result2 } = renderHook(() => useVpnRecommendations(2));
    expect(result2.current.recommendations.length).toBeLessThanOrEqual(2);

    // Test with maxResults = 1
    const { result: result1 } = renderHook(() => useVpnRecommendations(1));
    expect(result1.current.recommendations.length).toBe(1);

    // Test default (3)
    const { result: resultDefault } = renderHook(() => useVpnRecommendations());
    expect(resultDefault.current.recommendations.length).toBeLessThanOrEqual(3);
  });

  // ============================================
  // Multiple Services Tests (1 test)
  // ============================================

  it('should calculate scores correctly for multiple services', () => {
    mockUseStreamingServices.mockReturnValue({
      selectedServices: ['netflix', 'hulu', 'disney'],
      isLoading: false,
    });

    const { result } = renderHook(() => useVpnRecommendations());

    expect(result.current.recommendations.length).toBeGreaterThan(0);

    // Verify recommendations are sorted by score (descending)
    const scores = result.current.recommendations.map(r => r.score);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }

    // Verify matched services are tracked
    const firstRecommendation = result.current.recommendations[0];
    expect(firstRecommendation.matchedServices.length).toBeGreaterThan(0);
  });

  // ============================================
  // Memoization Tests (2 tests)
  // ============================================

  it('should memoize recommendations when inputs do not change', () => {
    mockUseStreamingServices.mockReturnValue({
      selectedServices: ['netflix'],
      isLoading: false,
    });

    const { result, rerender } = renderHook(() => useVpnRecommendations(3));

    const initialRecommendations = result.current.recommendations;

    // Rerender without changing inputs
    rerender();

    // Recommendations should be the same reference (memoized)
    expect(result.current.recommendations).toBe(initialRecommendations);
  });

  it('should recalculate recommendations when selectedServices change', async () => {
    // Start with one service
    mockUseStreamingServices.mockReturnValue({
      selectedServices: ['netflix'],
      isLoading: false,
    });

    const { result, rerender } = renderHook(() => useVpnRecommendations());

    const initialRecommendations = result.current.recommendations;

    // Change to multiple services
    mockUseStreamingServices.mockReturnValue({
      selectedServices: ['netflix', 'hulu', 'disney'],
      isLoading: false,
    });

    rerender();

    await waitFor(() => {
      // Recommendations should be different (new calculation)
      expect(result.current.recommendations).not.toBe(initialRecommendations);
    });
  });
});
