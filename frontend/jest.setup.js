/**
 * Jest Setup File
 *
 * This file runs AFTER the test environment is set up.
 * Polyfills are loaded in jest.polyfills.js which runs before this.
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
// NOTE: Do NOT import whatwg-fetch here!
// MSW v2 requires undici's fetch implementation which is set up in jest.polyfills.js
// Importing whatwg-fetch would override it and break MSW interception

// MSW Server Setup for network-level API mocking
// This intercepts actual HTTP requests at the network level
import { server } from './src/mocks/server'

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'bypass', // Don't warn about unhandled requests (e.g., static assets)
  })
})

// Reset handlers after each test to prevent test pollution
afterEach(() => {
  server.resetHandlers()
})

// Clean up after all tests
afterAll(() => {
  try {
    server.close()
  } catch (_error) {
    // Server may already be closed or in invalid state - ignore cleanup errors
  }
})

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock window.alert for tests
global.alert = jest.fn()

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

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
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock pointer capture APIs for Radix UI components
// Radix UI uses hasPointerCapture which JSDOM doesn't support
Element.prototype.hasPointerCapture = jest.fn(() => false)
Element.prototype.setPointerCapture = jest.fn()
Element.prototype.releasePointerCapture = jest.fn()

// Mock scrollIntoView for Radix UI dropdown components
// JSDOM doesn't implement scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

// Add Blob.text() polyfill for Jest environment
// Node's Blob doesn't have .text() or .arrayBuffer() methods, so we need to add them
if (typeof Blob !== 'undefined') {
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = async function() {
      // In Node/Jest, Blob has an internal buffer we can access via stream
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    };
  }

  if (!Blob.prototype.text) {
    Blob.prototype.text = async function() {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this);
      });
    };
  }
}

// Clean up after each test
afterEach(() => {
  cleanup() // Clean up React components and DOM
  jest.clearAllMocks()
})
