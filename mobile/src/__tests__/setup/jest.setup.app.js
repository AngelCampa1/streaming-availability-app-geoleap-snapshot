/**
 * Jest Setup - App-Specific Configuration
 *
 * This file contains app-level test setup:
 * - MSW (Mock Service Worker) for network-level HTTP mocking
 * - Test lifecycle hooks (beforeAll, afterEach, afterAll)
 * - Console suppression for expected test messages
 *
 * MSW provides network-level mocking so tests can use REAL service implementations
 * while controlling API responses.
 */

// ============================================================================
// MSW Server Setup - Network-Level HTTP Mocking
// ============================================================================

import { server } from '../../mocks/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
  });
});

// Reset handlers after each test to prevent test pollution
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// ============================================================================
// Console Suppression - Hide Expected Test Messages
// ============================================================================

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  // Suppress common console.log messages in tests
  console.log = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' && (
        message.includes('Notification preferences saved') ||
        message.includes('Notification service initialized')
      )
    ) {
      return;
    }
    originalLog(...args);
  };

  console.warn = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' && (
        message.includes('componentWillReceiveProps') ||
        message.includes('ProgressBarAndroid has been extracted') ||
        message.includes('Clipboard has been extracted') ||
        message.includes('PushNotificationIOS has been extracted') ||
        message.includes('each child in a list should have a unique "key" prop') ||
        message.includes('Warning: React.createElement')
      )
    ) {
      return;
    }
    originalWarn(...args);
  };

  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' && (
        message.includes('Warning: ReactDOM.render is deprecated') ||
        message.includes('Warning: An invalid form control') ||
        message.includes('act(...) is not supported') ||
        message.includes('StreamingAvailability is not a constructor') ||
        message.includes('Streaming search failed') ||
        message.includes('Logger error called')
      )
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
});
