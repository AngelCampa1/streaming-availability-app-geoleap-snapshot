/**
 * Isolated Test Pattern for GeoLeap Frontend
 * Ensures 100% test isolation and independence for reliable test execution
 */

import { jest } from '@jest/globals';

/**
 * Test Isolation Configuration
 * Use this pattern for all critical tests to ensure independence
 */

// 1. SETUP PATTERN: Independent test environment
export const setupIsolatedTest = () => {
  const cleanup: Array<() => void> = [];

  beforeEach(() => {
    // Clear all mocks and state before each test
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Reset any global state
    if (typeof window !== 'undefined') {
      // Clear localStorage
      window.localStorage.clear();
      // Clear sessionStorage
      window.sessionStorage.clear();
    }
  });

  afterEach(() => {
    // Run all cleanup functions
    cleanup.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
    
    // Clear cleanup array
    cleanup.length = 0;
    
    // Final cleanup
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // Return function to register cleanup
  return (cleanupFn: () => void) => {
    cleanup.push(cleanupFn);
  };
};

// 2. MOCK PATTERN: Consistent API mocking
export const createIsolatedApiMocks = () => {
  const mocks = {
    // User API mocks
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    
    // Streaming Services API mocks
    getAllStreamingServices: jest.fn(),
    getPopularStreamingServices: jest.fn(),
    addUserStreamingService: jest.fn(),
    removeUserStreamingService: jest.fn(),
    bulkAddUserStreamingServices: jest.fn(),
    
    // Content API mocks
    getContentBySlug: jest.fn(),
    getContentByCategory: jest.fn(),
    searchContent: jest.fn(),
    getRelatedContent: jest.fn(),
    
    // Preferences API mocks
    getUserPreferences: jest.fn(),
    updateUserPreferences: jest.fn(),
    getPreferenceOptions: jest.fn(),
  };

  // Reset all mocks before each test
  beforeEach(() => {
    Object.values(mocks).forEach(mock => mock.mockReset());
  });

  return mocks;
};

// 3. ASYNC PATTERN: Proper async testing with act()
export const withAsyncTest = async <T>(
  testFn: () => Promise<T> | T
): Promise<T> => {
  const { act } = await import('@testing-library/react');
  
  let result: T;
  
  await act(async () => {
    result = await testFn();
  });
  
  return result!;
};

// 4. COMPONENT PATTERN: Isolated component testing
export const createIsolatedComponentTest = () => {
  const { render, cleanup } = require('@testing-library/react');
  
  afterEach(() => {
    cleanup();
  });

  return {
    renderComponent: async (component: React.ReactElement) => {
      return withAsyncTest(() => render(component));
    }
  };
};

// 5. TIMEOUT PATTERN: Consistent timeout handling
export const TEST_TIMEOUTS = {
  FAST: 1000,      // For unit tests
  MEDIUM: 5000,    // For integration tests
  SLOW: 10000,     // For e2e tests
  NETWORK: 15000,  // For network-dependent tests
} as const;

export const withTimeout = <T>(
  promise: Promise<T>,
  timeout: number = TEST_TIMEOUTS.MEDIUM,
  errorMessage = 'Test operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeout);
    })
  ]);
};

// 6. ERROR HANDLING PATTERN: Consistent error testing
export const expectError = async (
  fn: () => Promise<any> | any,
  expectedError?: string | RegExp
): Promise<Error> => {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect(error).toHaveProperty('message', expectedError);
      } else {
        expect(error).toHaveProperty('message');
        expect((error as Error).message).toMatch(expectedError);
      }
    }
    return error as Error;
  }
};

// 7. STATE PATTERN: Isolated state testing
export const createIsolatedStateTest = <T>(initialState: T) => {
  let currentState = initialState;
  
  const setState = (newState: Partial<T> | ((prev: T) => T)) => {
    if (typeof newState === 'function') {
      currentState = newState(currentState);
    } else {
      currentState = { ...currentState, ...newState };
    }
  };
  
  const getState = () => currentState;
  
  const resetState = () => {
    currentState = { ...initialState };
  };
  
  beforeEach(() => {
    resetState();
  });
  
  return { setState, getState, resetState };
};

// 8. PERFORMANCE PATTERN: Test performance validation
export const validateTestPerformance = (
  testName: string,
  maxDuration: number = 1000
) => {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    if (duration > maxDuration) {
      console.warn(
        `⚠️ Test "${testName}" took ${duration.toFixed(2)}ms (max: ${maxDuration}ms)`
      );
    } else {
      console.log(
        `✅ Test "${testName}" completed in ${duration.toFixed(2)}ms`
      );
    }
    return duration;
  };
};

// 9. MEMORY PATTERN: Memory leak prevention
export const preventMemoryLeaks = () => {
  const cleanupCallbacks: Array<() => void> = [];
  
  const addCleanup = (callback: () => void) => {
    cleanupCallbacks.push(callback);
  };
  
  const forceCleanup = () => {
    cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Cleanup callback failed:', error);
      }
    });
    cleanupCallbacks.length = 0;
  };
  
  afterEach(() => {
    forceCleanup();
  });
  
  return { addCleanup, forceCleanup };
};

// 10. VALIDATION PATTERN: Data validation testing
export const validateTestData = {
  isValidUser: (user: any): boolean => {
    return user && 
           typeof user.id === 'string' && 
           typeof user.email === 'string' &&
           user.email.includes('@');
  },
  
  isValidStreamingService: (service: any): boolean => {
    return service &&
           typeof service.id === 'string' &&
           typeof service.name === 'string' &&
           typeof service.isActive === 'boolean';
  },
  
  isValidContentItem: (content: any): boolean => {
    return content &&
           typeof content.id === 'string' &&
           typeof content.title === 'string' &&
           typeof content.type === 'string';
  }
};

export default {
  setupIsolatedTest,
  createIsolatedApiMocks,
  withAsyncTest,
  createIsolatedComponentTest,
  TEST_TIMEOUTS,
  withTimeout,
  expectError,
  createIsolatedStateTest,
  validateTestPerformance,
  preventMemoryLeaks,
  validateTestData
};