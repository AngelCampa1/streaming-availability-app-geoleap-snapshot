/**
 * MSW Handlers Index
 *
 * Central export for all MSW request handlers.
 * Handlers are organized by domain for better maintainability.
 */

import { authHandlers } from './auth.handlers';
import { contentHandlers } from './content.handlers';
import { watchlistHandlers } from './watchlist.handlers';
import { userHandlers } from './user.handlers';
import { vpnHandlers } from './vpn.handlers';
import { subscriptionHandlers } from './subscription.handlers';
import { streamingHandlers } from './streaming.handlers';
import { recommendationHandlers } from './recommendation.handlers';
import { feedbackHandlers } from './feedback.handlers';
import { analyticsHandlers } from './analytics.handlers';

/**
 * All API request handlers
 * Add new handler groups here as needed
 */
export const handlers = [
  ...analyticsHandlers,
  ...feedbackHandlers, // Add at beginning for debugging
  ...authHandlers,
  ...contentHandlers,
  ...watchlistHandlers,
  ...userHandlers,
  ...vpnHandlers,
  ...subscriptionHandlers,
  ...streamingHandlers,
  ...recommendationHandlers,
];

/**
 * Export individual handler groups for selective testing
 */
export {
  authHandlers,
  contentHandlers,
  watchlistHandlers,
  userHandlers,
  vpnHandlers,
  subscriptionHandlers,
  streamingHandlers,
  recommendationHandlers,
  feedbackHandlers,
  analyticsHandlers,
};

/**
 * Export helper functions to reset mock data between tests
 */
export { resetMockWatchlist } from './watchlist.handlers';
export { resetMockUserData } from './user.handlers';
export { resetVpnState } from './vpn.handlers';
export { resetSubscriptionState } from './subscription.handlers';
export { resetRecommendationState } from './recommendation.handlers';
export { resetMockFeedback } from './feedback.handlers';
export { resetMockAnalytics, getStoredEvents, getStoredSessions } from './analytics.handlers';
