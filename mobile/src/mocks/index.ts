/**
 * MSW Mocks - Main Export
 *
 * Re-exports all MSW-related utilities for easy importing in tests.
 *
 * Usage:
 *   import { server, handlers, mockUser, mockTokens } from '../mocks';
 *   import { createNetworkErrorHandler, authErrorHandlers } from '../mocks';
 */

// Server setup
export { server, startServer, resetServer, stopServer } from './server';

// Default handlers and mock data
export {
  handlers,
  mockUser,
  mockTokens,
  mockSearchResults,
  mockWatchlist,
  mockRecommendations,
  mockUserPreferences,
} from './handlers';

// Error handlers for testing error scenarios
export {
  // Handler collections
  networkErrorHandlers,
  serverErrorHandlers,
  unauthorizedHandlers,
  forbiddenHandlers,
  validationErrorHandlers,
  notFoundHandlers,
  rateLimitHandlers,
  slowResponseHandlers,
  emptyResponseHandlers,
  malformedJsonHandlers,
  wrongContentTypeHandlers,

  // Handler factory functions
  createNetworkErrorHandler,
  createServerErrorHandler,
  createBadGatewayHandler,
  createServiceUnavailableHandler,
  createGatewayTimeoutHandler,
  createUnauthorizedHandler,
  createForbiddenHandler,
  createValidationErrorHandler,
  createUnprocessableEntityHandler,
  createNotFoundHandler,
  createRateLimitHandler,
  createSlowResponseHandler,

  // Auth-specific error handlers
  authErrorHandlers,

  // Convenience collection
  errorHandlerCollections,
} from './errorHandlers';
