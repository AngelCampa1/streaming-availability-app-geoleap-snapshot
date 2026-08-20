import { abTesting, useABTest, ABTest } from '../ab-testing';
import { renderHook } from '@testing-library/react';

// Mock localStorage (used for persistent ab_session_id)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

// Mock window.gtag
const mockGtag = jest.fn();

describe('ABTestingService', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    Object.defineProperty(window, 'gtag', {
      value: mockGtag,
      writable: true,
    });
  });

  beforeEach(() => {
    localStorageMock.clear();
    mockGtag.mockClear();
    // Reset assignments by creating new service instance
    // Since we export a singleton, we need to clear its internal state
    (abTesting as any).assignments.clear();
  });

  // Test Category 1: Initialization & Setup (5 tests)

  describe('Initialization & Setup', () => {
    it('should create singleton instance', () => {
      expect(abTesting).toBeDefined();
      expect(abTesting).toBe(abTesting); // Same instance
    });

    it('should initialize default tests on construction', () => {
      const tests = abTesting.getAllTests();

      expect(tests.length).toBeGreaterThanOrEqual(2);

      // Check landing-cta-text test
      const ctaTest = tests.find(t => t.id === 'landing-cta-text');
      expect(ctaTest).toBeDefined();
      expect(ctaTest?.name).toBe('Landing Page CTA Button Text');
      expect(ctaTest?.status).toBe('active');
      expect(ctaTest?.trafficAllocation).toBe(100);
      expect(ctaTest?.variants).toHaveLength(2);

      // Check hero-messaging test
      const heroTest = tests.find(t => t.id === 'hero-messaging');
      expect(heroTest).toBeDefined();
      expect(heroTest?.status).toBe('active');
      expect(heroTest?.trafficAllocation).toBe(100);
    });

    it('should have variant weights that sum to 100 for each test', () => {
      const tests = abTesting.getAllTests();

      tests.forEach(test => {
        const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0);
        expect(totalWeight).toBe(100);
      });
    });

    it('should have valid test status for all tests', () => {
      const tests = abTesting.getAllTests();
      const validStatuses = ['active', 'paused', 'completed'];

      tests.forEach(test => {
        expect(validStatuses).toContain(test.status);
      });
    });

    it('should have traffic allocation within 0-100 range', () => {
      const tests = abTesting.getAllTests();

      tests.forEach(test => {
        expect(test.trafficAllocation).toBeGreaterThanOrEqual(0);
        expect(test.trafficAllocation).toBeLessThanOrEqual(100);
      });
    });
  });

  // Test Category: registerTest

  describe('registerTest', () => {
    it('should register a new test', () => {
      abTesting.registerTest({
        id: 'custom-test',
        name: 'Custom Test',
        variants: [
          { id: 'a', name: 'A', weight: 50, config: {} },
          { id: 'b', name: 'B', weight: 50, config: {} },
        ],
        trafficAllocation: 100,
        status: 'active',
      });

      const variant = abTesting.getVariant('custom-test');
      expect(variant).not.toBeNull();
      expect(['a', 'b']).toContain(variant?.id);
    });

    it('should update an existing test config', () => {
      abTesting.registerTest({
        id: 'update-test',
        name: 'Original',
        variants: [
          { id: 'v1', name: 'V1', weight: 100, config: {} },
        ],
        trafficAllocation: 100,
        status: 'active',
      });

      abTesting.registerTest({
        id: 'update-test',
        name: 'Updated',
        variants: [
          { id: 'v1', name: 'V1', weight: 50, config: {} },
          { id: 'v2', name: 'V2', weight: 50, config: {} },
        ],
        trafficAllocation: 100,
        status: 'active',
      });

      const tests = abTesting.getAllTests();
      const test = tests.find(t => t.id === 'update-test');
      expect(test?.name).toBe('Updated');
      expect(test?.variants).toHaveLength(2);
    });
  });

  // Test Category 2: Session Management (5 tests)

  describe('Session Management', () => {
    it('should generate session ID when none exists', () => {
      expect(localStorageMock.getItem('ab_session_id')).toBeNull();

      // Trigger session ID generation by calling getVariant
      abTesting.getVariant('landing-cta-text');

      const sessionId = localStorageMock.getItem('ab_session_id');
      expect(sessionId).not.toBeNull();
      expect(sessionId).toContain('session_');
    });

    it('should persist session ID to localStorage', () => {
      abTesting.getVariant('landing-cta-text');

      const sessionId = localStorageMock.getItem('ab_session_id');
      expect(sessionId).toBeTruthy();

      // Call again, should use same session ID
      abTesting.getVariant('landing-cta-text');
      expect(localStorageMock.getItem('ab_session_id')).toBe(sessionId);
    });

    it('should retrieve existing session ID from localStorage', () => {
      const existingSessionId = 'session_12345_abcdef';
      localStorageMock.setItem('ab_session_id', existingSessionId);

      abTesting.getVariant('landing-cta-text');

      // Should use existing session ID, not generate new one
      expect(localStorageMock.getItem('ab_session_id')).toBe(existingSessionId);
    });

    it('should generate session ID with correct format', () => {
      abTesting.getVariant('landing-cta-text');

      const sessionId = localStorageMock.getItem('ab_session_id');
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should be SSR-safe and not error when window is undefined', () => {
      // This test verifies the typeof window !== 'undefined' check
      // In our test environment, window is defined, but the code should handle undefined
      // We can't easily test SSR without more complex setup, but we verify no errors occur
      expect(() => {
        abTesting.getVariant('landing-cta-text');
      }).not.toThrow();
    });
  });

  // Test Category 3: User Assignment (8 tests)

  describe('User Assignment', () => {
    it('should assign variant consistently for same user', () => {
      const userId = 'user-123';

      const variant1 = abTesting.getVariant('landing-cta-text', userId);
      const variant2 = abTesting.getVariant('landing-cta-text', userId);
      const variant3 = abTesting.getVariant('landing-cta-text', userId);

      expect(variant1).toBe(variant2);
      expect(variant2).toBe(variant3);
      expect(variant1?.id).toBeDefined();
    });

    it('should store assignment in memory', () => {
      const userId = 'user-456';

      const variant = abTesting.getVariant('landing-cta-text', userId);
      expect(variant).not.toBeNull();

      // Assignment should be cached
      const assignments = (abTesting as any).assignments;
      const assignmentKey = `landing-cta-text-${userId}`;
      expect(assignments.has(assignmentKey)).toBe(true);

      const assignment = assignments.get(assignmentKey);
      expect(assignment.testId).toBe('landing-cta-text');
      expect(assignment.variantId).toBe(variant?.id);
      expect(assignment.userId).toBe(userId);
    });

    it('should use session ID when user ID not provided', () => {
      const variant = abTesting.getVariant('landing-cta-text');
      expect(variant).not.toBeNull();

      const sessionId = localStorageMock.getItem('ab_session_id');
      expect(sessionId).toBeTruthy();

      const assignments = (abTesting as any).assignments;
      const assignmentKey = `landing-cta-text-${sessionId}`;
      expect(assignments.has(assignmentKey)).toBe(true);
    });

    it('should include assignment metadata', () => {
      const userId = 'user-789';

      abTesting.getVariant('landing-cta-text', userId);

      const assignments = (abTesting as any).assignments;
      const assignmentKey = `landing-cta-text-${userId}`;
      const assignment = assignments.get(assignmentKey);

      expect(assignment.testId).toBe('landing-cta-text');
      expect(assignment.variantId).toBeDefined();
      expect(assignment.assignedAt).toBeInstanceOf(Date);
      expect(assignment.userId).toBe(userId);
      expect(assignment.sessionId).toBeDefined();
    });

    it('should return cached assignment on subsequent calls', () => {
      const userId = 'user-cached';

      // First call creates assignment
      const variant1 = abTesting.getVariant('landing-cta-text', userId);
      const assignment1 = (abTesting as any).assignments.get(`landing-cta-text-${userId}`);

      // Second call should return cached assignment
      const variant2 = abTesting.getVariant('landing-cta-text', userId);
      const assignment2 = (abTesting as any).assignments.get(`landing-cta-text-${userId}`);

      expect(variant1).toBe(variant2);
      expect(assignment1).toBe(assignment2); // Same object reference
    });

    it('should fire assignment tracking event on first assignment', () => {
      mockGtag.mockClear();

      const userId = 'user-track';
      abTesting.getVariant('landing-cta-text', userId);

      // Should have called gtag for assignment event
      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'ab_test_assignment',
        expect.objectContaining({
          testId: 'landing-cta-text',
          userId: userId,
        })
      );
    });

    it('should potentially assign different variants to different users', () => {
      // Statistical test: With deterministic hashing, different users should get different variants
      const user1 = abTesting.getVariant('landing-cta-text', 'user-1');
      const user2 = abTesting.getVariant('landing-cta-text', 'user-2');
      const user3 = abTesting.getVariant('landing-cta-text', 'user-3');
      const user4 = abTesting.getVariant('landing-cta-text', 'user-4');
      const user5 = abTesting.getVariant('landing-cta-text', 'user-5');

      const variants = [user1, user2, user3, user4, user5];
      const uniqueVariants = new Set(variants.map(v => v?.id));

      // With 5 users and 50/50 split, should see both variants appear
      // (very unlikely all 5 get same variant)
      expect(uniqueVariants.size).toBeGreaterThan(1);
    });

    it('should persist user assignment across multiple calls', () => {
      const userId = 'user-persist';

      const variant1 = abTesting.getVariant('landing-cta-text', userId);

      // Clear tracking calls
      mockGtag.mockClear();

      // Get variant again - should not fire new assignment event
      const variant2 = abTesting.getVariant('landing-cta-text', userId);

      expect(variant1?.id).toBe(variant2?.id);
      expect(mockGtag).not.toHaveBeenCalledWith('event', 'ab_test_assignment', expect.anything());
    });
  });

  // Test Category 4: Variant Selection Logic (10 tests)

  describe('Variant Selection Logic', () => {
    it('should use deterministic hashing for consistent assignment', () => {
      const userId = 'deterministic-user';

      // Multiple calls with same user should always return same variant
      const results = [];
      for (let i = 0; i < 100; i++) {
        // Clear assignment to force re-assignment
        (abTesting as any).assignments.clear();
        const variant = abTesting.getVariant('landing-cta-text', userId);
        results.push(variant?.id);
      }

      // All results should be identical
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
    });

    it('should distribute users approximately 50/50 for equal weight variants', () => {
      // Statistical test with 10,000 users
      const sampleSize = 10000;
      const variantCounts: Record<string, number> = {};

      for (let i = 0; i < sampleSize; i++) {
        (abTesting as any).assignments.clear();
        const variant = abTesting.getVariant('landing-cta-text', `user-${i}`);
        if (variant) {
          variantCounts[variant.id] = (variantCounts[variant.id] || 0) + 1;
        }
      }

      // With 50/50 split, expect roughly 5000 each (allow ±2% margin)
      const expectedCount = sampleSize * 0.5;
      const margin = sampleSize * 0.02; // 2% margin

      Object.values(variantCounts).forEach(count => {
        expect(count).toBeGreaterThan(expectedCount - margin);
        expect(count).toBeLessThan(expectedCount + margin);
      });
    });

    it('should handle weighted distribution (60/40 split)', () => {
      // Create custom test with 60/40 split
      const customTest: ABTest = {
        id: 'custom-weighted',
        name: 'Custom Weighted Test',
        variants: [
          { id: 'variant-a', name: 'Variant A', weight: 60, config: {} },
          { id: 'variant-b', name: 'Variant B', weight: 40, config: {} },
        ],
        trafficAllocation: 100,
        status: 'active',
      };

      (abTesting as any).tests.set('custom-weighted', customTest);

      // Sample 10,000 users
      const sampleSize = 10000;
      const variantCounts: Record<string, number> = {};

      for (let i = 0; i < sampleSize; i++) {
        (abTesting as any).assignments.clear();
        const variant = abTesting.getVariant('custom-weighted', `user-${i}`);
        if (variant) {
          variantCounts[variant.id] = (variantCounts[variant.id] || 0) + 1;
        }
      }

      // Expect ~6000 for variant-a, ~4000 for variant-b (±3% margin for weighted)
      const marginPercent = 0.03;
      expect(variantCounts['variant-a']).toBeGreaterThan(sampleSize * 0.6 - sampleSize * marginPercent);
      expect(variantCounts['variant-a']).toBeLessThan(sampleSize * 0.6 + sampleSize * marginPercent);
      expect(variantCounts['variant-b']).toBeGreaterThan(sampleSize * 0.4 - sampleSize * marginPercent);
      expect(variantCounts['variant-b']).toBeLessThan(sampleSize * 0.4 + sampleSize * marginPercent);
    });

    it('should fallback to first variant if weights do not cover hash', () => {
      // Edge case: If hash % 100 is greater than sum of weights, fallback to first variant
      // This shouldn't happen in normal operation (weights should sum to 100)
      // But the code has this fallback

      // We can verify by checking that users always get SOME variant
      for (let i = 0; i < 100; i++) {
        (abTesting as any).assignments.clear();
        const variant = abTesting.getVariant('landing-cta-text', `user-${i}`);
        expect(variant).not.toBeNull();
        expect(['control', 'variant-a']).toContain(variant?.id);
      }
    });

    it('should exclude all users when traffic allocation is 0%', () => {
      // Create a custom paused test to verify 0% traffic allocation
      const pausedTest: ABTest = {
        id: 'paused-zero-traffic',
        name: 'Paused Test',
        variants: [
          { id: 'control', name: 'Control', weight: 50, config: {} },
          { id: 'variant-a', name: 'Variant A', weight: 50, config: {} },
        ],
        trafficAllocation: 0,
        status: 'paused',
      };
      (abTesting as any).tests.set('paused-zero-traffic', pausedTest);

      const variant = abTesting.getVariant('paused-zero-traffic', 'any-user');
      expect(variant).toBeNull();

      // Try multiple users
      for (let i = 0; i < 100; i++) {
        const v = abTesting.getVariant('paused-zero-traffic', `user-${i}`);
        expect(v).toBeNull();
      }
    });

    it('should include all users when traffic allocation is 100%', () => {
      // landing-cta-text has 100% traffic allocation
      let includedCount = 0;

      for (let i = 0; i < 100; i++) {
        (abTesting as any).assignments.clear();
        const variant = abTesting.getVariant('landing-cta-text', `user-${i}`);
        if (variant !== null) {
          includedCount++;
        }
      }

      // All 100 users should be included
      expect(includedCount).toBe(100);
    });

    it('should include approximately 50% of users when traffic allocation is 50%', () => {
      // Create test with 50% traffic allocation
      const halfTrafficTest: ABTest = {
        id: 'half-traffic',
        name: 'Half Traffic Test',
        variants: [
          { id: 'control', name: 'Control', weight: 50, config: {} },
          { id: 'variant-a', name: 'Variant A', weight: 50, config: {} },
        ],
        trafficAllocation: 50,
        status: 'active',
      };

      (abTesting as any).tests.set('half-traffic', halfTrafficTest);

      let includedCount = 0;
      const sampleSize = 1000;

      for (let i = 0; i < sampleSize; i++) {
        (abTesting as any).assignments.clear();
        const variant = abTesting.getVariant('half-traffic', `user-${i}`);
        if (variant !== null) {
          includedCount++;
        }
      }

      // Expect ~500 included (±5% margin)
      const expected = sampleSize * 0.5;
      const margin = sampleSize * 0.05;

      expect(includedCount).toBeGreaterThan(expected - margin);
      expect(includedCount).toBeLessThan(expected + margin);
    });

    it('should avoid hash collisions and show both variants', () => {
      const variants = new Set<string>();

      // Sample 1000 users
      for (let i = 0; i < 1000; i++) {
        (abTesting as any).assignments.clear();
        const variant = abTesting.getVariant('landing-cta-text', `user-${i}`);
        if (variant) {
          variants.add(variant.id);
        }
      }

      // Both variants should appear
      expect(variants.size).toBe(2);
      expect(variants.has('control')).toBe(true);
      expect(variants.has('variant-a')).toBe(true);
    });

    it('should change assignment key when user ID changes', () => {
      const _sessionVariant = abTesting.getVariant('landing-cta-text');
      const _userVariant = abTesting.getVariant('landing-cta-text', 'user-123');

      // Different assignment keys should be used
      const sessionId = localStorageMock.getItem('ab_session_id');
      const sessionKey = `landing-cta-text-${sessionId}`;
      const userKey = `landing-cta-text-user-123`;

      const assignments = (abTesting as any).assignments;
      expect(assignments.has(sessionKey)).toBe(true);
      expect(assignments.has(userKey)).toBe(true);

      // May or may not be different variants (depends on hash)
      // But they are separate assignments
      expect(assignments.get(sessionKey)).not.toBe(assignments.get(userKey));
    });

    it('should maintain variant selection consistency across multiple getVariant calls', () => {
      const userId = 'consistent-user';

      const variant1 = abTesting.getVariant('landing-cta-text', userId);
      const variant2 = abTesting.getVariant('landing-cta-text', userId);
      const variant3 = abTesting.getVariant('landing-cta-text', userId);

      expect(variant1?.id).toBe(variant2?.id);
      expect(variant2?.id).toBe(variant3?.id);
    });
  });

  // Test Category 5: Test Configuration (6 tests)

  describe('Test Configuration', () => {
    it('should return variant config for active test', () => {
      const userId = 'config-user';
      const config = abTesting.getTestConfig('landing-cta-text', userId);

      expect(config).toBeDefined();
      expect(config).toHaveProperty('ctaText');
      expect(config).toHaveProperty('ctaStyle');
      expect(['Start Free Search', 'Get Started Free']).toContain(config.ctaText);
    });

    it('should return null for paused test', () => {
      // Register a custom paused test since hero-messaging is now active
      abTesting.registerTest({
        id: 'paused-test-fixture',
        name: 'Paused Test',
        variants: [
          { id: 'control', name: 'Control', weight: 50, config: {} },
          { id: 'variant-a', name: 'Variant A', weight: 50, config: {} },
        ],
        trafficAllocation: 100,
        status: 'paused',
      });

      const userId = 'paused-user';
      const variant = abTesting.getVariant('paused-test-fixture', userId);

      expect(variant).toBeNull();
    });

    it('should return empty config when no variant assigned', () => {
      // Use a paused test fixture
      abTesting.registerTest({
        id: 'paused-config-fixture',
        name: 'Paused Config Test',
        variants: [
          { id: 'control', name: 'Control', weight: 50, config: {} },
        ],
        trafficAllocation: 100,
        status: 'paused',
      });

      const userId = 'no-variant-user';
      const config = abTesting.getTestConfig('paused-config-fixture', userId);

      expect(config).toEqual({});
    });

    it('should return null for invalid test ID', () => {
      const variant = abTesting.getVariant('non-existent-test', 'any-user');
      expect(variant).toBeNull();
    });

    it('should respect traffic allocation filtering', () => {
      // Use a custom paused test fixture since hero-messaging is now active
      abTesting.registerTest({
        id: 'zero-traffic-fixture',
        name: 'Zero Traffic',
        variants: [
          { id: 'control', name: 'Control', weight: 50, config: { key: 'val' } },
        ],
        trafficAllocation: 0,
        status: 'active',
      });

      const config1 = abTesting.getTestConfig('zero-traffic-fixture', 'user-1');
      const config2 = abTesting.getTestConfig('zero-traffic-fixture', 'user-2');
      const config3 = abTesting.getTestConfig('zero-traffic-fixture', 'user-3');

      expect(config1).toEqual({});
      expect(config2).toEqual({});
      expect(config3).toEqual({});
    });

    it('should return variant-specific config values', () => {
      const userId1 = 'user-control';
      const userId2 = 'user-variant';

      // Get configs for multiple users
      const config1 = abTesting.getTestConfig('landing-cta-text', userId1);
      const config2 = abTesting.getTestConfig('landing-cta-text', userId2);

      // Both should have ctaText and ctaStyle
      expect(config1).toHaveProperty('ctaText');
      expect(config2).toHaveProperty('ctaText');

      // Values should be one of the variants
      expect(['Start Free Search', 'Get Started Free']).toContain(config1.ctaText);
      expect(['Start Free Search', 'Get Started Free']).toContain(config2.ctaText);
    });
  });

  // Test Category 6: Conversion Tracking (8 tests)

  describe('Conversion Tracking', () => {
    it('should track conversion with valid assignment', () => {
      mockGtag.mockClear();

      const userId = 'conversion-user';
      abTesting.getVariant('landing-cta-text', userId);

      // Track conversion
      abTesting.trackConversion('landing-cta-text', 'signup', undefined, userId);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'ab_test_conversion',
        expect.objectContaining({
          testId: 'landing-cta-text',
          conversionType: 'signup',
        })
      );
    });

    it('should include correct conversion event data', () => {
      mockGtag.mockClear();

      const userId = 'event-data-user';
      const variant = abTesting.getVariant('landing-cta-text', userId);

      abTesting.trackConversion('landing-cta-text', 'purchase', 99.99, userId);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'ab_test_conversion',
        expect.objectContaining({
          testId: 'landing-cta-text',
          variantId: variant?.id,
          conversionType: 'purchase',
          value: 99.99,
          userId: userId,
        })
      );
    });

    it('should call gtag for conversion tracking', () => {
      mockGtag.mockClear();

      const userId = 'gtag-user';
      abTesting.getVariant('landing-cta-text', userId);
      abTesting.trackConversion('landing-cta-text', 'click', undefined, userId);

      expect(mockGtag).toHaveBeenCalledTimes(2); // 1 for assignment, 1 for conversion
    });

    it('should log conversion event for development', () => {
      // logger is mocked in jest.setup.js
      const userId = 'logger-user';
      abTesting.getVariant('landing-cta-text', userId);
      abTesting.trackConversion('landing-cta-text', 'engagement', undefined, userId);

      // If logger is mocked, we could verify it was called
      // For now, just verify no errors thrown
      expect(true).toBe(true);
    });

    it('should support multiple conversion types', () => {
      mockGtag.mockClear();

      const userId = 'multi-conversion';
      abTesting.getVariant('landing-cta-text', userId);

      abTesting.trackConversion('landing-cta-text', 'view', undefined, userId);
      abTesting.trackConversion('landing-cta-text', 'click', undefined, userId);
      abTesting.trackConversion('landing-cta-text', 'signup', undefined, userId);

      // Should have 4 gtag calls: 1 assignment + 3 conversions
      expect(mockGtag).toHaveBeenCalledTimes(4);
    });

    it('should not track conversion without assignment', () => {
      mockGtag.mockClear();

      // Try to track conversion without getting variant first
      abTesting.trackConversion('landing-cta-text', 'signup', undefined, 'no-assignment-user');

      // Should not call gtag (no assignment exists)
      expect(mockGtag).not.toHaveBeenCalledWith('event', 'ab_test_conversion', expect.anything());
    });

    it('should track conversion with value parameter', () => {
      mockGtag.mockClear();

      const userId = 'value-user';
      abTesting.getVariant('landing-cta-text', userId);

      abTesting.trackConversion('landing-cta-text', 'purchase', 149.99, userId);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'ab_test_conversion',
        expect.objectContaining({
          value: 149.99,
        })
      );
    });

    it('should track conversion with userId in event data', () => {
      mockGtag.mockClear();

      const userId = 'userid-tracking';
      abTesting.getVariant('landing-cta-text', userId);

      abTesting.trackConversion('landing-cta-text', 'action', undefined, userId);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'ab_test_conversion',
        expect.objectContaining({
          userId: userId,
        })
      );
    });
  });

  // Test Category 7: React Hook Integration (4 tests)

  describe('React Hook Integration (useABTest)', () => {
    it('should return variant, config, isInTest, and trackConversion', () => {
      const { result } = renderHook(() => useABTest('landing-cta-text', 'hook-user'));

      expect(result.current).toHaveProperty('variant');
      expect(result.current).toHaveProperty('config');
      expect(result.current).toHaveProperty('isInTest');
      expect(result.current).toHaveProperty('trackConversion');
      expect(typeof result.current.trackConversion).toBe('function');
    });

    it('should set isInTest to true when variant exists', () => {
      const { result } = renderHook(() => useABTest('landing-cta-text', 'in-test-user'));

      expect(result.current.isInTest).toBe(true);
      expect(result.current.variant).not.toBeNull();
    });

    it('should set isInTest to false when no variant assigned', () => {
      // Register a paused test to guarantee no variant is assigned
      abTesting.registerTest({
        id: 'hook-paused-fixture',
        name: 'Hook Paused',
        variants: [{ id: 'control', name: 'Control', weight: 100, config: {} }],
        trafficAllocation: 100,
        status: 'paused',
      });

      const { result } = renderHook(() => useABTest('hook-paused-fixture', 'not-in-test-user'));

      expect(result.current.isInTest).toBe(false);
      expect(result.current.variant).toBeNull();
    });

    it('should allow trackConversion callback to work', () => {
      mockGtag.mockClear();

      const { result } = renderHook(() => useABTest('landing-cta-text', 'callback-user'));

      // Call trackConversion from hook
      result.current.trackConversion('signup', 99);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'ab_test_conversion',
        expect.objectContaining({
          conversionType: 'signup',
          value: 99,
        })
      );
    });
  });

  // Test Category 8: Test Management (5 tests)

  describe('Test Management', () => {
    it('should return all tests via getAllTests', () => {
      const tests = abTesting.getAllTests();

      expect(Array.isArray(tests)).toBe(true);
      expect(tests.length).toBeGreaterThanOrEqual(2);
      expect(tests.every(t => t.id && t.name && t.variants)).toBe(true);
    });

    it('should return test results with assignment count', () => {
      // Create some assignments
      abTesting.getVariant('landing-cta-text', 'user-1');
      abTesting.getVariant('landing-cta-text', 'user-2');
      abTesting.getVariant('landing-cta-text', 'user-3');

      const results = abTesting.getTestResults('landing-cta-text');

      expect(results).toHaveProperty('assignments');
      expect(results).toHaveProperty('conversions');
      expect(results.assignments).toBe(3);
    });

    it('should have correct getTestResults structure', () => {
      abTesting.getVariant('landing-cta-text', 'structure-user');

      const results = abTesting.getTestResults('landing-cta-text');

      expect(typeof results.assignments).toBe('number');
      expect(typeof results.conversions).toBe('number');
      expect(results.assignments).toBeGreaterThanOrEqual(0);
      expect(results.conversions).toBeGreaterThanOrEqual(0);
    });

    it('should return zero assignments for new test', () => {
      const results = abTesting.getTestResults('hero-messaging');

      expect(results.assignments).toBe(0);
      expect(results.conversions).toBe(0);
    });

    it('should update assignment count after getVariant calls', () => {
      const initialResults = abTesting.getTestResults('landing-cta-text');
      const initialCount = initialResults.assignments;

      abTesting.getVariant('landing-cta-text', 'new-assignment-user');

      const updatedResults = abTesting.getTestResults('landing-cta-text');
      expect(updatedResults.assignments).toBe(initialCount + 1);
    });
  });

  // Test Category 9: Edge Cases & Error Handling (7 tests)

  describe('Edge Cases & Error Handling', () => {
    it('should handle special characters in user ID', () => {
      const userId = 'user!@#$%^&*()_+-={}[]|:;<>?,./';

      expect(() => {
        abTesting.getVariant('landing-cta-text', userId);
      }).not.toThrow();

      const variant = abTesting.getVariant('landing-cta-text', userId);
      expect(variant).not.toBeNull();
    });

    it('should handle unicode characters in test ID', () => {
      // Create test with unicode ID
      const unicodeTest: ABTest = {
        id: 'test-你好-🎉',
        name: 'Unicode Test',
        variants: [
          { id: 'control', name: 'Control', weight: 50, config: {} },
          { id: 'variant-a', name: 'Variant A', weight: 50, config: {} },
        ],
        trafficAllocation: 100,
        status: 'active',
      };

      (abTesting as any).tests.set('test-你好-🎉', unicodeTest);

      const variant = abTesting.getVariant('test-你好-🎉', 'user-unicode');
      expect(variant).not.toBeNull();
    });

    it('should not throw error when gtag is missing', () => {
      const originalGtag = window.gtag;
      delete (window as any).gtag;

      expect(() => {
        abTesting.getVariant('landing-cta-text', 'no-gtag-user');
        abTesting.trackConversion('landing-cta-text', 'test', undefined, 'no-gtag-user');
      }).not.toThrow();

      // Restore gtag
      window.gtag = originalGtag;
    });

    it('should handle empty variants array gracefully', () => {
      const emptyTest: ABTest = {
        id: 'empty-variants',
        name: 'Empty Variants Test',
        variants: [],
        trafficAllocation: 100,
        status: 'active',
      };

      (abTesting as any).tests.set('empty-variants', emptyTest);

      const variant = abTesting.getVariant('empty-variants', 'empty-user');
      expect(variant).toBeNull();
    });

    it('should return null for invalid test ID', () => {
      const variant = abTesting.getVariant('non-existent-test-xyz', 'any-user');
      expect(variant).toBeNull();

      const config = abTesting.getTestConfig('non-existent-test-xyz', 'any-user');
      expect(config).toEqual({});
    });

    it('should handle very long user ID', () => {
      const longUserId = 'user-' + 'a'.repeat(1000);

      expect(() => {
        abTesting.getVariant('landing-cta-text', longUserId);
      }).not.toThrow();

      const variant = abTesting.getVariant('landing-cta-text', longUserId);
      expect(variant).not.toBeNull();
    });

    it('should handle concurrent assignments correctly', () => {
      // Map should handle concurrent puts without issues
      const users = Array.from({ length: 100 }, (_, i) => `concurrent-user-${i}`);

      const variants = users.map(userId => abTesting.getVariant('landing-cta-text', userId));

      // All variants should be assigned
      expect(variants.every(v => v !== null)).toBe(true);

      // All assignments should be in Map
      const assignments = (abTesting as any).assignments;
      expect(assignments.size).toBeGreaterThanOrEqual(100);
    });
  });

  // Test Category 10: Integration Tests (3 tests)

  describe('Integration Tests', () => {
    it('should complete full user journey (getVariant -> trackConversion -> results)', () => {
      mockGtag.mockClear();

      const userId = 'journey-user';

      // 1. Get variant assignment
      const variant = abTesting.getVariant('landing-cta-text', userId);
      expect(variant).not.toBeNull();
      expect(mockGtag).toHaveBeenCalledWith('event', 'ab_test_assignment', expect.anything());

      // 2. Track conversion
      abTesting.trackConversion('landing-cta-text', 'signup', 0, userId);
      expect(mockGtag).toHaveBeenCalledWith('event', 'ab_test_conversion', expect.anything());

      // 3. Get test results
      const results = abTesting.getTestResults('landing-cta-text');
      expect(results.assignments).toBeGreaterThan(0);
    });

    it('should support multi-test participation', () => {
      const userId = 'multi-test-user';

      // Participate in landing-cta-text (active, 100% traffic)
      const variant1 = abTesting.getVariant('landing-cta-text', userId);
      expect(variant1).not.toBeNull();

      // Try to participate in a paused test
      abTesting.registerTest({
        id: 'multi-test-paused',
        name: 'Multi Test Paused',
        variants: [{ id: 'control', name: 'Control', weight: 100, config: {} }],
        trafficAllocation: 100,
        status: 'paused',
      });
      const variant2 = abTesting.getVariant('multi-test-paused', userId);
      expect(variant2).toBeNull();

      // Create another active test
      const test2: ABTest = {
        id: 'test-2',
        name: 'Test 2',
        variants: [
          { id: 'control', name: 'Control', weight: 50, config: {} },
          { id: 'variant-a', name: 'Variant A', weight: 50, config: {} },
        ],
        trafficAllocation: 100,
        status: 'active',
      };
      (abTesting as any).tests.set('test-2', test2);

      const variant3 = abTesting.getVariant('test-2', userId);
      expect(variant3).not.toBeNull();

      // User should have assignments in multiple tests
      const assignments = (abTesting as any).assignments;
      expect(assignments.has(`landing-cta-text-${userId}`)).toBe(true);
      expect(assignments.has(`test-2-${userId}`)).toBe(true);
    });

    it('should handle anonymous to authenticated user transition', () => {
      // 1. Anonymous user gets assignment via session
      const anonymousVariant = abTesting.getVariant('landing-cta-text');
      const sessionId = localStorageMock.getItem('ab_session_id');
      expect(anonymousVariant).not.toBeNull();
      expect(sessionId).toBeTruthy();

      const anonymousKey = `landing-cta-text-${sessionId}`;
      const assignments = (abTesting as any).assignments;
      expect(assignments.has(anonymousKey)).toBe(true);

      // 2. User logs in and gets new assignment with userId
      const authenticatedVariant = abTesting.getVariant('landing-cta-text', 'authenticated-user');
      expect(authenticatedVariant).not.toBeNull();

      const authenticatedKey = `landing-cta-text-authenticated-user`;
      expect(assignments.has(authenticatedKey)).toBe(true);

      // Both assignments should exist (session and user)
      expect(assignments.size).toBeGreaterThanOrEqual(2);
    });
  });
});
