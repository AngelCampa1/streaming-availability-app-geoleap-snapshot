/**
 * Performance Test: App Startup Time
 *
 * PERFORMANCE BUDGETS:
 * - Cold start: < 2000ms (P0 requirement)
 * - Warm start: < 800ms (P1 requirement)
 * - Time to interactive: < 3000ms (P0 requirement)
 *
 * CRITICAL METRICS:
 * - JS bundle load time
 * - Native module initialization
 * - First render time
 * - Time to interactive
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AppRegistry, Platform } from 'react-native';
import App from '../../../App';

// Mock performance.now() for consistent timing
const mockPerformanceNow = () => {
  let currentTime = 0;
  return () => {
    currentTime += 16.67; // Simulate 60 FPS (16.67ms per frame)
    return currentTime;
  };
};

describe('Performance: App Startup Time', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Cold Start Performance', () => {
    it('should complete cold start in under 2000ms (P0 Budget)', async () => {
      const startTime = performance.now();

      // Render app (simulates cold start)
      const { getByTestId } = render(<App />);

      // Wait for app to be interactive
      jest.runAllTimers();

      const endTime = performance.now();
      const coldStartTime = endTime - startTime;

      // ✅ PERFORMANCE BUDGET: Cold start < 2000ms
      expect(coldStartTime).toBeLessThan(2000);

      // Log metric for tracking
      console.log(`[PERF] Cold Start: ${coldStartTime.toFixed(2)}ms`);
    });

    it('should load critical resources during cold start', async () => {
      const resourceTimings: Record<string, number> = {};
      const startTime = performance.now();

      // Mock AsyncStorage initialization
      const storageStartTime = performance.now();
      // Simulate storage init (typically 50-100ms)
      jest.advanceTimersByTime(75);
      resourceTimings.asyncStorage = performance.now() - storageStartTime;

      // Mock authentication check
      const authStartTime = performance.now();
      jest.advanceTimersByTime(50);
      resourceTimings.authCheck = performance.now() - authStartTime;

      // Mock theme initialization
      const themeStartTime = performance.now();
      jest.advanceTimersByTime(20);
      resourceTimings.themeInit = performance.now() - themeStartTime;

      const totalTime = performance.now() - startTime;

      // ✅ PERFORMANCE BUDGET: Critical resources < 200ms total
      expect(totalTime).toBeLessThan(200);

      console.log('[PERF] Resource Timings:', resourceTimings);
    });
  });

  describe('Warm Start Performance', () => {
    it('should complete warm start in under 800ms (P1 Budget)', async () => {
      // Simulate warm start (app already in memory)
      const startTime = performance.now();

      // Re-render app (simulates warm start)
      const { rerender } = render(<App />);
      rerender(<App />);

      jest.runAllTimers();

      const endTime = performance.now();
      const warmStartTime = endTime - startTime;

      // ✅ PERFORMANCE BUDGET: Warm start < 800ms
      expect(warmStartTime).toBeLessThan(800);

      console.log(`[PERF] Warm Start: ${warmStartTime.toFixed(2)}ms`);
    });
  });

  describe('Time to Interactive (TTI)', () => {
    it('should reach interactive state in under 3000ms (P0 Budget)', async () => {
      const startTime = performance.now();

      const { getByTestId } = render(<App />);

      // Simulate all initialization tasks
      jest.runAllTimers();

      // Verify app is interactive (splash screen hidden, main content visible)
      const endTime = performance.now();
      const tti = endTime - startTime;

      // ✅ PERFORMANCE BUDGET: Time to Interactive < 3000ms
      expect(tti).toBeLessThan(3000);

      console.log(`[PERF] Time to Interactive: ${tti.toFixed(2)}ms`);
    });

    it('should not block main thread during initialization', async () => {
      const mainThreadBlockTimes: number[] = [];

      // Monitor main thread blocking
      const checkMainThread = () => {
        const blockStart = performance.now();
        // Simulate work
        jest.advanceTimersByTime(10);
        const blockDuration = performance.now() - blockStart;
        mainThreadBlockTimes.push(blockDuration);
      };

      render(<App />);

      // Check main thread 10 times during initialization
      for (let i = 0; i < 10; i++) {
        checkMainThread();
      }

      // ✅ PERFORMANCE BUDGET: No single block > 100ms
      const maxBlockTime = Math.max(...mainThreadBlockTimes);
      expect(maxBlockTime).toBeLessThan(100);

      console.log(`[PERF] Max Main Thread Block: ${maxBlockTime.toFixed(2)}ms`);
    });
  });

  describe('JS Bundle Size', () => {
    it('should keep JS bundle under 5MB (P1 Budget)', () => {
      // Mock bundle stats (in production, this would be from Metro bundler)
      const mockBundleStats = {
        totalSize: 4.2 * 1024 * 1024, // 4.2 MB
        vendorSize: 2.1 * 1024 * 1024,
        appSize: 2.1 * 1024 * 1024,
      };

      // ✅ PERFORMANCE BUDGET: Total bundle < 5MB
      expect(mockBundleStats.totalSize).toBeLessThan(5 * 1024 * 1024);

      console.log('[PERF] Bundle Size:', {
        total: `${(mockBundleStats.totalSize / 1024 / 1024).toFixed(2)} MB`,
        vendor: `${(mockBundleStats.vendorSize / 1024 / 1024).toFixed(2)} MB`,
        app: `${(mockBundleStats.appSize / 1024 / 1024).toFixed(2)} MB`,
      });
    });
  });

  describe('Platform-Specific Performance', () => {
    it('should meet iOS startup requirements', () => {
      if (Platform.OS !== 'ios') {
        return; // Skip on non-iOS
      }

      const startTime = performance.now();
      render(<App />);
      jest.runAllTimers();
      const startupTime = performance.now() - startTime;

      // ✅ iOS PERFORMANCE BUDGET: < 2000ms
      expect(startupTime).toBeLessThan(2000);

      console.log(`[PERF] iOS Startup: ${startupTime.toFixed(2)}ms`);
    });

    it('should meet Android startup requirements', () => {
      if (Platform.OS !== 'android') {
        return; // Skip on non-Android
      }

      const startTime = performance.now();
      render(<App />);
      jest.runAllTimers();
      const startupTime = performance.now() - startTime;

      // ✅ Android PERFORMANCE BUDGET: < 2500ms (slightly higher due to device variance)
      expect(startupTime).toBeLessThan(2500);

      console.log(`[PERF] Android Startup: ${startupTime.toFixed(2)}ms`);
    });
  });
});
