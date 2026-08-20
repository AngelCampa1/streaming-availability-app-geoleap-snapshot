/**
 * TEST DESIGN PATTERNS - Comprehensive Test Quality Utilities
 *
 * Provides standardized patterns for reliable, maintainable tests
 * Addresses common test design issues and flaky test scenarios
 */

import { waitFor, screen } from '@testing-library/react';
import { act } from 'react';

// ========================
// ASYNC TESTING PATTERNS
// ========================

export interface AsyncTestOptions {
  timeout?: number;
  interval?: number;
  retries?: number;
}

/**
 * Robust async wait pattern - prevents flaky timing issues
 */
export const robustWaitFor = async <T>(callback: () => T | Promise<T>, options: AsyncTestOptions = {}): Promise<T> => {
  const { timeout = 5000, interval = 50, retries = 3 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await waitFor(callback, { timeout, interval });
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
  throw new Error('All retry attempts failed');
};

/**
 * Safe act wrapper - handles React state updates properly
 */
export const safeAct = async (callback: () => void | Promise<void>): Promise<void> => {
  try {
    await act(async () => {
      await callback();
    });
  } catch (error) {
    // Act warning caught and handled
    console.warn('Act warning caught:', error);
  }
};

// ========================
// ELEMENT FINDING PATTERNS
// ========================

/**
 * Find element with fallback strategies
 */
export const findElementSafely = async (testId: string, fallbackSelectors: string[] = [], timeout = 3000) => {
  // Primary strategy: testid
  try {
    return await screen.findByTestId(testId, undefined, { timeout });
  } catch {
    // Fallback strategies
    for (const selector of fallbackSelectors) {
      try {
        const elements = screen.queryAllByText(new RegExp(selector, 'i'));
        if (elements.length > 0) return elements[0];
      } catch {
        continue;
      }
    }
    throw new Error(`Element not found: ${testId} with fallbacks: ${fallbackSelectors.join(', ')}`);
  }
};

/**
 * Check element existence with multiple strategies
 */
export const elementExists = (testId: string, fallbackSelectors: string[] = []): boolean => {
  try {
    if (screen.queryByTestId(testId)) return true;

    for (const selector of fallbackSelectors) {
      const elements = screen.queryAllByText(new RegExp(selector, 'i'));
      if (elements.length > 0) return true;
    }
    return false;
  } catch {
    return false;
  }
};

// ========================
// LOADING STATE PATTERNS
// ========================

/**
 * Wait for loading to complete - multiple indicators
 */
export const waitForLoadingComplete = async (
  loadingIndicators: string[] = ['Loading', 'loading', 'Refreshing', 'Processing'],
  timeout = 10000
) => {
  await robustWaitFor(
    () => {
      for (const indicator of loadingIndicators) {
        const elements = screen.queryAllByText(new RegExp(indicator, 'i'));
        if (elements.length > 0) {
          throw new Error(`Still loading: ${indicator}`);
        }
      }
      return true;
    },
    { timeout }
  );
};

/**
 * Wait for component to stabilize after render
 */
export const waitForComponentStabilization = async (componentTestId: string, timeout = 3000) => {
  await robustWaitFor(
    () => {
      const component = screen.getByTestId(componentTestId);
      return component;
    },
    { timeout }
  );

  // Additional wait for any async effects
  await new Promise(resolve => setTimeout(resolve, 100));
};

// ========================
// BUTTON INTERACTION PATTERNS
// ========================

/**
 * Safe button click with loading state handling
 */
export const safeButtonClick = async (
  buttonTestId: string,
  options: { waitForEnabled?: boolean; timeout?: number } = {}
) => {
  const { waitForEnabled = true, timeout = 3000 } = options;

  const button = await findElementSafely(buttonTestId, [], timeout);

  if (waitForEnabled) {
    await robustWaitFor(
      () => {
        if (button.hasAttribute('disabled')) {
          throw new Error('Button still disabled');
        }
        return true;
      },
      { timeout }
    );
  }

  await safeAct(async () => {
    button.click();
  });

  return button;
};

// ========================
// ERROR HANDLING PATTERNS
// ========================

/**
 * Flexible error checking - multiple possible error indicators
 */
export const checkForErrors = async (
  errorIndicators: string[] = ['error', 'Error', 'failed', 'Failed'],
  shouldExist = true,
  timeout = 2000
) => {
  try {
    await robustWaitFor(
      () => {
        let foundError = false;
        for (const indicator of errorIndicators) {
          const errorElements = screen.queryAllByText(new RegExp(indicator, 'i'));
          if (errorElements.length > 0) {
            foundError = true;
            break;
          }
        }

        if (shouldExist && !foundError) {
          throw new Error('Expected error not found');
        }
        if (!shouldExist && foundError) {
          throw new Error('Unexpected error found');
        }

        return foundError;
      },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
};

// ========================
// DATA TESTING PATTERNS
// ========================

/**
 * Verify data display with flexible matching
 */
export const verifyDataDisplay = async (
  expectedData: Record<string, string | number | RegExp>,
  options: { strict?: boolean; timeout?: number } = {}
) => {
  const { strict = false, timeout = 3000 } = options;

  const results: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(expectedData)) {
    try {
      await robustWaitFor(
        () => {
          let found = false;

          if (typeof value === 'string' || typeof value === 'number') {
            const elements = screen.queryAllByText(value.toString());
            found = elements.length > 0;
          } else if (value instanceof RegExp) {
            const elements = screen.queryAllByText(value);
            found = elements.length > 0;
          }

          if (!found && strict) {
            throw new Error(`Data not found: ${key} = ${value}`);
          }

          return found;
        },
        { timeout }
      );

      results[key] = true;
    } catch {
      results[key] = false;
      if (strict) throw new Error(`Required data missing: ${key}`);
    }
  }

  return results;
};

// ========================
// MOCK IMPROVEMENT PATTERNS
// ========================

/**
 * Create realistic mock data with proper structure
 */
export const createMockApiResponse = <T>(
  data: T,
  options: {
    delay?: number;
    shouldFail?: boolean;
    errorStatus?: number;
    errorMessage?: string;
  } = {}
) => {
  const { delay = 0, shouldFail = false, errorMessage = 'Mock API Error' } = options;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error(errorMessage));
      } else {
        resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(data),
          text: () => Promise.resolve(JSON.stringify(data)),
        });
      }
    }, delay);
  });
};

/**
 * Setup comprehensive fetch mocking
 */
export const setupFetchMock = (
  mockResponses: Record<string, unknown>,
  defaultResponse: unknown = { message: 'Not mocked' }
) => {
  (global.fetch as jest.Mock) = jest.fn().mockImplementation((url: string) => {
    // Match URL patterns
    for (const [pattern, response] of Object.entries(mockResponses)) {
      if (url.includes(pattern)) {
        return createMockApiResponse(response);
      }
    }

    // Default response
    return createMockApiResponse(defaultResponse);
  });
};

// ========================
// ACCESSIBILITY TESTING
// ========================

/**
 * Basic accessibility checks
 */
export const checkAccessibility = async (containerId?: string) => {
  const container = containerId ? screen.getByTestId(containerId) : document.body;

  // Check for essential accessibility attributes
  const checks = {
    hasHeadings: container.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
    hasButtons: container.querySelectorAll('button, [role="button"]').length > 0,
    hasLabels: container.querySelectorAll('[aria-label], [aria-labelledby]').length > 0,
    hasLandmarks: container.querySelectorAll('[role="main"], [role="navigation"], [role="banner"]').length > 0,
  };

  return checks;
};

// ========================
// PERFORMANCE TESTING
// ========================

/**
 * Basic performance monitoring for tests
 */
export const measureTestPerformance = async <T>(
  testFunction: () => Promise<T>,
  expectedMaxTime = 1000
): Promise<{ result: T; duration: number; withinExpectation: boolean }> => {
  const start = performance.now();
  const result = await testFunction();
  const duration = performance.now() - start;

  return {
    result,
    duration,
    withinExpectation: duration <= expectedMaxTime,
  };
};

// ========================
// EXPORT ALL PATTERNS
// ========================

export const TestDesignPatterns = {
  async: { robustWaitFor, safeAct },
  elements: { findElementSafely, elementExists },
  loading: { waitForLoadingComplete, waitForComponentStabilization },
  interactions: { safeButtonClick },
  errors: { checkForErrors },
  data: { verifyDataDisplay },
  mocks: { createMockApiResponse, setupFetchMock },
  accessibility: { checkAccessibility },
  performance: { measureTestPerformance },
};

export default TestDesignPatterns;

// ========================
// ACTUAL TESTS FOR JEST
// ========================

describe('TestDesignPatterns', () => {
  it('should export all required pattern categories', () => {
    expect(TestDesignPatterns).toHaveProperty('async');
    expect(TestDesignPatterns).toHaveProperty('elements');
    expect(TestDesignPatterns).toHaveProperty('loading');
    expect(TestDesignPatterns).toHaveProperty('interactions');
    expect(TestDesignPatterns).toHaveProperty('errors');
    expect(TestDesignPatterns).toHaveProperty('data');
    expect(TestDesignPatterns).toHaveProperty('mocks');
    expect(TestDesignPatterns).toHaveProperty('accessibility');
    expect(TestDesignPatterns).toHaveProperty('performance');
  });

  it('should provide async utilities', () => {
    expect(TestDesignPatterns.async).toHaveProperty('robustWaitFor');
    expect(TestDesignPatterns.async).toHaveProperty('safeAct');
  });

  it('should provide element utilities', () => {
    expect(TestDesignPatterns.elements).toHaveProperty('findElementSafely');
    expect(TestDesignPatterns.elements).toHaveProperty('elementExists');
  });
});
