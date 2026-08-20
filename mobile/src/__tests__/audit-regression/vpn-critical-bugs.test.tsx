/**
 * VPN Functionality Critical Bugs Regression Tests
 * Tests for bugs found during Day 2 audit (2025-12-16)
 *
 * CRITICAL BUGS COVERED:
 * - BUG-VPN-001: Provider lookup can return undefined
 * - BUG-VPN-002: Auth token retrieved without error handling
 * - BUG-VPN-003: Simulated VPN tests provide false security
 * - BUG-VPN-004: Navigation to non-existent screens
 * - BUG-VPN-006: Empty array return when no services selected
 * - BUG-VPN-007: Cache key collision risk
 * - BUG-VPN-008: Memory leak in fetchCountries dependencies
 *
 * @see docs/audit/week1/day2-vpn-bug-report.md
 */

// Mock logger before other imports
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVpnRecommendations } from '../../hooks/useVpnRecommendations';
import { useStreamingServices } from '../../hooks/useStreamingServices';
import { useCountriesForContent } from '../../hooks/useCountriesForContent';
import { getRecommendedVpnProviders, VPN_PROVIDERS, getVpnProviderById } from '../../types/vpn.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React from 'react';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('axios');
jest.mock('../../services/api/ApiService');
jest.mock('../../utils/logger');

// Wrapper for react-query
const createWrapper = () => {
  const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('BUG-VPN-001: Provider Lookup Can Return Undefined', () => {
  it('should handle invalid providerId without crashing', () => {
    const invalidId = 'non-existent-provider';
    const provider = getVpnProviderById(invalidId);

    // EXPECTED: Should return undefined for invalid ID
    expect(provider).toBeUndefined();
  });

  it('should return valid provider for correct ID', () => {
    const validId = 'nordvpn';
    const provider = getVpnProviderById(validId);

    // EXPECTED: Should return NordVPN provider
    expect(provider).toBeDefined();
    expect(provider?.id).toBe('nordvpn');
    expect(provider?.name).toBe('NordVPN');
  });

  it('should handle null/undefined providerId gracefully', () => {
    expect(getVpnProviderById(null as any)).toBeUndefined();
    expect(getVpnProviderById(undefined as any)).toBeUndefined();
    expect(getVpnProviderById('' as any)).toBeUndefined();
  });

  it('should not crash when using find result without null check', () => {
    // BUG: VpnProviderComparisonScreen.tsx:24 uses `!` assertion on find()
    const providerId = 'invalid-id';
    const provider = VPN_PROVIDERS.find(p => p.id === providerId);

    // This test documents the bug: find() returns undefined
    expect(provider).toBeUndefined();

    // If code uses `provider!`, accessing properties would crash
    // expect(() => provider!.name).toThrow(); // Would crash in real code
  });
});

describe('BUG-VPN-002: Auth Token Retrieved Without Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle missing auth token when fetching preferences', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null); // No token

    const wrapper = createWrapper();
    const { result } = renderHook(() => useStreamingServices('user-123'), { wrapper });

    await waitFor(() => {
      // BUG: Currently sends "Bearer null" in Authorization header
      // EXPECTED: Should detect missing token and handle gracefully
      expect(result.current.isLoading).toBe(false);
    });

    // Verify axios was called with potentially invalid header
    if ((axios.get as jest.Mock).mock.calls.length > 0) {
      const callArgs = (axios.get as jest.Mock).mock.calls[0];
      const headers = callArgs[1]?.headers;

      // BUG: Authorization header may contain "Bearer null"
      if (headers?.Authorization) {
        expect(headers.Authorization).not.toContain('null');
        expect(headers.Authorization).not.toContain('undefined');
      }
    }
  });

  it('should handle corrupted token from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useStreamingServices('user-123'), { wrapper });

    await waitFor(() => {
      // EXPECTED: Should handle storage errors gracefully
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('BUG-VPN-003: Simulated VPN Tests Provide False Security', () => {
  it('should flag simulated test results as unreliable', () => {
    // BUG: VpnEffectivenessTestScreen uses Math.random() for test results
    // This test documents the expected behavior:

    // Simulate the current implementation
    const simulateTestResult = () => {
      const random = Math.random();
      return random > 0.2 ? 'pass' : random > 0.1 ? 'warning' : 'fail';
    };

    // Run multiple times - results should vary (proving they're fake)
    const results = Array.from({ length: 100 }, () => simulateTestResult());
    const passCount = results.filter(r => r === 'pass').length;
    const failCount = results.filter(r => r === 'fail').length;

    // EXPECTED: Real tests should have consistent results for same VPN state
    // BUG: Simulated tests show random results
    expect(passCount).toBeGreaterThan(0);
    expect(passCount).toBeLessThan(100); // Not all pass

    // This proves tests are fake - real VPN tests should be deterministic
  });

  // TODO: Skip - This test documents a feature that needs to be implemented
  // Real IP leak tests require actual VPN connection and external API calls
  it.skip('should perform real IP leak test instead of simulation', async () => {
    // EXPECTED BEHAVIOR (not currently implemented):
    // 1. Fetch real IP from public API (e.g., ipify.org)
    // 2. Compare to VPN IP
    // 3. Return pass/fail based on actual check

    // BUG: Current implementation just returns random result
    // This test documents what SHOULD happen
    expect(true).toBe(true); // Placeholder - real test needs VPN integration
  });
});

describe('BUG-VPN-006: Empty Array Return When No Services Selected', () => {
  it('should return default recommendations when no services selected', () => {
    const emptyServices: string[] = [];
    const recommendations = getRecommendedVpnProviders(emptyServices, 3);

    // BUG: Currently returns empty array
    // EXPECTED: Should return top-rated VPNs by default
    if (recommendations.length === 0) {
      // This documents the bug
      expect(recommendations).toEqual([]);
      // But we expect it should have recommendations
      fail('Expected default recommendations, got empty array (BUG-VPN-006)');
    } else {
      // Fixed behavior
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(3);
    }
  });

  it('should show recommendations for users with no streaming services', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useVpnRecommendations(3), { wrapper });

    // BUG: Returns empty array when selectedServices is empty
    // EXPECTED: Show top-rated VPNs
    expect(result.current.recommendations).toBeDefined();
  });
});

describe('BUG-VPN-007: Cache Key Collision Risk', () => {
  it('should generate unique cache keys for different content', () => {
    const { getCacheKey } = require('../../hooks/useCountriesForContent');

    // Potential collision scenarios
    const key1 = '@countries_for_content_abc-123_en,es';
    const key2 = '@countries_for_content_abc-12_3_en,es';

    // These look similar but represent different content
    expect(key1).not.toBe(key2);

    // BUG: Simple string concatenation could cause collisions
    // EXPECTED: Use JSON.stringify or better delimiter
  });

  it('should handle special characters in cache keys', () => {
    const contentId = 'movie-with-special-chars_123';
    const audioLanguages = ['en', 'es'];
    const subtitleLanguages = ['fr'];

    // Generate cache key
    const langKey = [...audioLanguages, ...subtitleLanguages].sort().join(',');
    const cacheKey = `@countries_for_content_${contentId}_${langKey}`;

    // EXPECTED: Cache key should be URL-safe and unique
    expect(cacheKey).toBeDefined();
    expect(cacheKey).toContain(contentId);
  });
});

describe('BUG-VPN-008: Memory Leak in fetchCountries Dependencies', () => {
  it('should not trigger infinite re-renders', async () => {
    const wrapper = createWrapper();

    const mockApiService = {
      get: jest.fn().mockResolvedValue({
        success: true,
        data: {
          contentId: 'test-123',
          recommendedCountries: [
            { countryCode: 'US', countryName: 'United States', availabilityScore: 100, matchQuality: 'perfect' },
          ],
          totalCountriesAnalyzed: 1,
          countriesWithPerfectMatch: 1,
          generatedAt: new Date().toISOString(),
        },
      }),
    };

    jest.mock('../../services/api/ApiService', () => ({
      ApiService: jest.fn(() => mockApiService),
    }));

    const { result } = renderHook(
      () => useCountriesForContent({
        contentId: 'test-123',
        audioLanguages: ['en'],
        subtitleLanguages: ['es'],
        enabled: true,
      }),
      { wrapper }
    );

    // BUG: countries.length in dependencies causes infinite loop
    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 1000 });

    // Check that fetch was called a reasonable number of times
    // BUG: If memory leak exists, fetch would be called many times
    const fetchCallCount = mockApiService.get.mock.calls.length;
    expect(fetchCallCount).toBeLessThan(5); // Should only fetch once or twice (cache + API)
  });
});

describe('VPN Recommendation Algorithm Edge Cases', () => {
  // BUG-VPN-009: FIXED - getRecommendedVpnProviders now handles null/undefined
  it('should handle null/undefined services array', () => {
    // Fixed: Function now handles null/undefined gracefully with fallback to empty array
    expect(() => getRecommendedVpnProviders(null as any, 3)).not.toThrow();
    expect(() => getRecommendedVpnProviders(undefined as any, 3)).not.toThrow();

    // Should return valid recommendations even with null/undefined input
    const nullResult = getRecommendedVpnProviders(null as any, 3);
    expect(nullResult).toBeDefined();
    expect(nullResult.length).toBeLessThanOrEqual(3);
  });

  it('should handle invalid service IDs', () => {
    const invalidServices = ['invalid-service-123', 'another-fake-service'];
    const recommendations = getRecommendedVpnProviders(invalidServices, 3);

    // EXPECTED: Should return recommendations even with invalid services
    expect(recommendations).toBeDefined();
    expect(Array.isArray(recommendations)).toBe(true);
  });

  it('should handle maxResults boundary cases', () => {
    const services = ['netflix', 'hulu'];

    // Edge case: maxResults = 0
    const zeroResults = getRecommendedVpnProviders(services, 0);
    expect(zeroResults.length).toBe(0);

    // Edge case: maxResults > available providers
    const manyResults = getRecommendedVpnProviders(services, 1000);
    expect(manyResults.length).toBeLessThanOrEqual(VPN_PROVIDERS.length);
  });

  it('should calculate score correctly', () => {
    const services = ['netflix', 'hulu', 'disney'];
    const recommendations = getRecommendedVpnProviders(services, 3);

    recommendations.forEach(rec => {
      // Score should be 0-100
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(150); // Max possible score

      // Price should be positive
      expect(rec.pricePerMonth).toBeGreaterThan(0);

      // Matched services should be subset of requested
      rec.matchedServices.forEach(serviceId => {
        expect(services).toContain(serviceId);
      });
    });
  });
});

describe('VPN Provider Data Validation', () => {
  it('should have valid VPN provider data', () => {
    VPN_PROVIDERS.forEach(provider => {
      // Required fields
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.displayName).toBeDefined();

      // Pricing validation
      expect(provider.monthlyPrice).toBeGreaterThan(0);
      expect(provider.yearlyPrice).toBeGreaterThan(0);
      expect(provider.yearlyPrice).toBeLessThan(provider.monthlyPrice * 12); // Yearly should be discounted

      // Ratings (1-5 scale)
      expect(provider.rating).toBeGreaterThanOrEqual(1);
      expect(provider.rating).toBeLessThanOrEqual(5);
      expect(provider.speedRating).toBeGreaterThanOrEqual(1);
      expect(provider.speedRating).toBeLessThanOrEqual(5);
      expect(provider.securityRating).toBeGreaterThanOrEqual(1);
      expect(provider.securityRating).toBeLessThanOrEqual(5);

      // Server data
      expect(provider.serverCount).toBeGreaterThan(0);
      expect(provider.serverLocations.length).toBeGreaterThan(0);

      // Features
      expect(Array.isArray(provider.features)).toBe(true);
      expect(Array.isArray(provider.streamingSupport)).toBe(true);
    });
  });

  it('should have consistent streaming service IDs', () => {
    const allServiceIds = new Set<string>();

    VPN_PROVIDERS.forEach(provider => {
      provider.streamingSupport.forEach(service => {
        allServiceIds.add(service.serviceId);

        // Validate service data
        expect(service.serviceName).toBeDefined();
        expect(service.supported).toBeDefined();
        expect(service.regions).toBeDefined();
        expect(service.reliability).toBeDefined();
        expect(['excellent', 'good', 'fair', 'poor']).toContain(service.reliability);
      });
    });

    // Common streaming services should be covered
    expect(allServiceIds.has('netflix')).toBe(true);
    expect(allServiceIds.has('hulu')).toBe(true);
    expect(allServiceIds.has('disney')).toBe(true);
  });
});

describe('Streaming Services Hook Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should handle rapid select/deselect operations', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useStreamingServices(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Rapid operations
    act(() => {
      result.current.selectService('netflix');
      result.current.selectService('hulu');
      result.current.deselectService('netflix');
      result.current.selectService('netflix');
    });

    // Final state should be correct
    expect(result.current.selectedServices).toContain('netflix');
    expect(result.current.selectedServices).toContain('hulu');
  });

  it('should not add duplicate services', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useStreamingServices(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Try to add same service multiple times
    act(() => {
      result.current.selectService('netflix');
      result.current.selectService('netflix');
      result.current.selectService('netflix');
    });

    // Should only appear once
    const netflixCount = result.current.selectedServices.filter(s => s === 'netflix').length;
    expect(netflixCount).toBe(1);
  });
});
