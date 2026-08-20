 
/**
 * SEO Test Setup
 * Global setup and configuration for SEO-related tests
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
Object.assign(global, { TextDecoder, TextEncoder });

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      beforePopState: jest.fn(),
      prefetch: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
  notFound: jest.fn(),
}));

// Mock Next.js image component
jest.mock('next/image', () => {
  return function MockImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    return React.createElement('img', props);
  };
});

// Import React for createElement
import * as React from 'react';

// Mock environment variables
process.env.NEXT_PUBLIC_SITE_URL = 'https://geoleap.app';
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    configurable: true,
  });
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    ...performance,
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  // Suppress React warnings that are not relevant to SEO testing
  console.error = jest.fn((message, ...args) => {
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render is no longer supported') ||
        message.includes('Warning: Each child in a list should have a unique "key" prop') ||
        message.includes('Warning: Failed prop type'))
    ) {
      return;
    }
    originalError(message, ...args);
  });

  console.warn = jest.fn((message, ...args) => {
    if (typeof message === 'string' && message.includes('componentWillReceiveProps has been renamed')) {
      return;
    }
    originalWarn(message, ...args);
  });
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
  jest.clearAllMocks();
});

// Global test utilities for SEO testing
global.seoTestUtils = {
  // Utility to validate meta tag structure
  validateMetaTag: (document: Document, property: string, expectedContent?: string) => {
    const metaTag = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
    expect(metaTag).toBeInTheDocument();

    if (expectedContent) {
      const content = metaTag?.getAttribute('content');
      expect(content).toContain(expectedContent);
    }

    return metaTag;
  },

  // Utility to validate structured data
  validateStructuredData: (document: Document, expectedType?: string) => {
    const scriptTag = document.querySelector('script[type="application/ld+json"]');
    expect(scriptTag).toBeInTheDocument();

    if (scriptTag) {
      const jsonData = JSON.parse(scriptTag.textContent || '{}');
      expect(jsonData['@context']).toBe('https://schema.org');

      if (expectedType) {
        if (Array.isArray(jsonData)) {
          expect(jsonData.some((item: Record<string, unknown>) => item['@type'] === expectedType)).toBe(true);
        } else {
          expect(jsonData['@type']).toBe(expectedType);
        }
      }

      return jsonData;
    }

    return null;
  },

  // Utility to validate heading hierarchy
  validateHeadingHierarchy: (document: Document) => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingLevels: number[] = [];

    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      headingLevels.push(level);
    });

    // Check that we start with h1
    expect(headingLevels[0]).toBe(1);

    // Check that heading levels don't skip (e.g., h1 -> h3)
    for (let i = 1; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i];
      const maxPreviousLevel = Math.max(...headingLevels.slice(0, i));

      expect(currentLevel).toBeLessThanOrEqual(maxPreviousLevel + 1);
    }

    return headingLevels;
  },

  // Utility to validate ARIA attributes
  validateARIA: (element: Element) => {
    const requiredARIAAttributes = ['aria-label', 'aria-labelledby', 'aria-describedby', 'role'];

    const hasARIA = requiredARIAAttributes.some(attr => element.hasAttribute(attr));

    if (!hasARIA && element.tagName !== 'DIV' && element.tagName !== 'SPAN') {
      console.warn(`Element ${element.tagName} might benefit from ARIA attributes`);
    }

    return hasARIA;
  },

  // Utility to measure performance
  measurePerformance: async <T>(asyncOperation: () => Promise<T>) => {
    const start = performance.now();
    const result = await asyncOperation();
    const end = performance.now();

    return {
      result,
      duration: end - start,
      performanceEntry: {
        name: 'test-operation',
        startTime: start,
        duration: end - start,
      },
    };
  },

  // Utility to simulate user interactions
  simulateUserInteraction: {
    click: (element: Element) => {
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
    },

    keyPress: (element: Element, key: string) => {
      const event = new KeyboardEvent('keydown', {
        key,
        code: `Key${key.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(event);
    },

    touch: (element: Element) => {
      const touchEvent = new TouchEvent('touchstart', {
        touches: [
          new Touch({
            identifier: 1,
            target: element,
            clientX: 100,
            clientY: 100,
          }),
        ],
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(touchEvent);
    },
  },
};

// Type definitions for global test utilities
declare global {
  var seoTestUtils: {
    validateMetaTag: (document: Document, property: string, expectedContent?: string) => Element | null;
    validateStructuredData: (document: Document, expectedType?: string) => Record<string, unknown> | null;
    validateHeadingHierarchy: (document: Document) => number[];
    validateARIA: (element: Element) => boolean;
    measurePerformance: <T>(asyncOperation: () => Promise<T>) => Promise<{
      result: T;
      duration: number;
      performanceEntry: {
        name: string;
        startTime: number;
        duration: number;
      };
    }>;
    simulateUserInteraction: {
      click: (element: Element) => void;
      keyPress: (element: Element, key: string) => void;
      touch: (element: Element) => void;
    };
  };
}

// Add tests for Jest
if (typeof describe !== 'undefined') {
  describe('SEO Test Setup', () => {
    it('should provide global seo test utilities', () => {
      expect(global.seoTestUtils).toBeDefined();
      expect(global.seoTestUtils.validateMetaTag).toBeInstanceOf(Function);
      expect(global.seoTestUtils.validateStructuredData).toBeInstanceOf(Function);
    });
  });
}

export {};
