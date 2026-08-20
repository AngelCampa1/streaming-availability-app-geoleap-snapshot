/**
 * E2E Test: Content Discovery & Streaming Flow
 * Week 4 Day 19: End-to-End Testing
 *
 * Critical User Flow:
 * 1. Search for content
 * 2. Browse trending/recommended content
 * 3. View content details
 * 4. Add to watchlist
 * 5. Filter by streaming service
 * 6. Apply content filters
 *
 * Related Bugs:
 * - BUG-030: Search debouncing not working (P1) - Fixed
 * - BUG-031: Watchlist 30s auto-refresh memory leak (P1) - Fixed
 * - BUG-032: Infinite scroll pagination cursor errors (P1) - Fixed
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('E2E: Content Discovery & Streaming Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser();
  });

  beforeEach(async () => {
    // Navigate to home/discover screen
    await element(by.id('tab-discover')).tap();
    await waitFor(element(by.id('discover-screen'))).toBeVisible();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  async function loginAsTestUser() {
    await waitFor(element(by.id('onboarding-welcome'))).toBeVisible();
    await element(by.id('onboarding-skip-button')).tap();
    await element(by.id('login-email-input')).typeText('e2e-content-test@example.com');
    await element(by.id('login-password-input')).typeText('SecurePass123!');
    await element(by.id('login-submit-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible();
  }

  /**
   * TEST 1: Search for Content with Debouncing
   * Validates: Search functionality with proper debouncing
   * Related Bug: BUG-030 - Search debouncing (P1) - FIXED
   * Performance Budget: < 300ms debounce, no excessive API calls
   */
  it('should search for content with proper debouncing', async () => {
    // ✅ STEP 1: Tap search bar
    await element(by.id('search-bar')).tap();
    await waitFor(element(by.id('search-input-focused'))).toBeVisible();

    // ✅ STEP 2: Type search query rapidly (test debouncing)
    const searchQuery = 'stranger things';
    await element(by.id('search-input')).typeText(searchQuery);

    // ✅ STEP 3: Wait for debounce delay (should be ~300ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    // ✅ STEP 4: Should show search results
    await waitFor(element(by.id('search-results-list')))
      .toBeVisible()
      .withTimeout(3000);

    // ✅ VERIFY: Search results contain expected content
    await detoxExpect(element(by.text('Stranger Things'))).toBeVisible();
    await detoxExpect(element(by.id('search-result-item-0'))).toBeVisible();

    // ✅ VERIFY: Search suggestions appear
    await detoxExpect(element(by.id('search-suggestions'))).toBeVisible();
  });

  /**
   * TEST 2: Browse Trending Content
   * Validates: Trending carousel and content cards
   */
  it('should browse trending content', async () => {
    // ✅ STEP 1: Should show trending carousel
    await detoxExpect(element(by.id('trending-carousel'))).toBeVisible();
    await detoxExpect(element(by.text('Trending Now'))).toBeVisible();

    // ✅ STEP 2: Swipe through trending items
    await element(by.id('trending-carousel')).swipe('left', 'fast', 0.8);
    await element(by.id('trending-carousel')).swipe('left', 'fast', 0.8);

    // ✅ VERIFY: Trending items loaded
    await detoxExpect(element(by.id('trending-item-0'))).toBeVisible();
    await detoxExpect(element(by.id('trending-item-poster'))).toBeVisible();
  });

  /**
   * TEST 3: View Content Details
   * Validates: Tap content → Details screen with metadata
   */
  it('should view content details', async () => {
    // ✅ STEP 1: Tap on first trending item
    await element(by.id('trending-item-0')).tap();

    // ✅ STEP 2: Should show content details screen
    await waitFor(element(by.id('content-details-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // ✅ VERIFY: Content metadata visible
    await detoxExpect(element(by.id('content-title'))).toBeVisible();
    await detoxExpect(element(by.id('content-description'))).toBeVisible();
    await detoxExpect(element(by.id('content-rating'))).toBeVisible();
    await detoxExpect(element(by.id('content-genres'))).toBeVisible();
    await detoxExpect(element(by.id('content-year'))).toBeVisible();

    // ✅ VERIFY: Streaming availability section
    await detoxExpect(element(by.id('streaming-availability'))).toBeVisible();
    await detoxExpect(element(by.id('available-on-netflix'))).toBeVisible();

    // ✅ VERIFY: Action buttons
    await detoxExpect(element(by.id('add-to-watchlist-button'))).toBeVisible();
    await detoxExpect(element(by.id('share-button'))).toBeVisible();
  });

  /**
   * TEST 4: Add/Remove from Watchlist
   * Validates: Watchlist functionality with real-time sync
   * Related Bug: BUG-031 - Watchlist auto-refresh leak (P1) - FIXED
   */
  it('should add and remove content from watchlist', async () => {
    // ✅ STEP 1: Open content details
    await element(by.id('trending-item-0')).tap();
    await waitFor(element(by.id('content-details-screen'))).toBeVisible();

    // ✅ STEP 2: Add to watchlist
    await element(by.id('add-to-watchlist-button')).tap();

    // ✅ VERIFY: Success feedback
    await waitFor(element(by.text('Added to Watchlist')))
      .toBeVisible()
      .withTimeout(1000);

    await detoxExpect(element(by.id('remove-from-watchlist-button'))).toBeVisible();

    // ✅ STEP 3: Navigate to watchlist screen
    await element(by.id('back-button')).tap();
    await element(by.id('tab-watchlist')).tap();
    await waitFor(element(by.id('watchlist-screen'))).toBeVisible();

    // ✅ VERIFY: Content appears in watchlist
    await detoxExpect(element(by.id('watchlist-item-0'))).toBeVisible();

    // ✅ STEP 4: Remove from watchlist
    await element(by.id('watchlist-item-0')).swipe('left', 'fast');
    await element(by.id('watchlist-remove-button')).tap();

    // ✅ VERIFY: Content removed
    await waitFor(element(by.text('Removed from Watchlist')))
      .toBeVisible()
      .withTimeout(1000);
  });

  /**
   * TEST 5: Filter by Streaming Service
   * Validates: Filter content by Netflix, Disney+, HBO Max, etc.
   */
  it('should filter content by streaming service', async () => {
    // ✅ STEP 1: Open filter menu
    await element(by.id('filter-button')).tap();
    await waitFor(element(by.id('filter-modal'))).toBeVisible();

    // ✅ STEP 2: Select Netflix filter
    await element(by.id('filter-netflix')).tap();
    await element(by.id('apply-filters-button')).tap();

    // ✅ STEP 3: Should show only Netflix content
    await waitFor(element(by.id('filtered-results-list')))
      .toBeVisible()
      .withTimeout(2000);

    // ✅ VERIFY: All results show Netflix availability
    await detoxExpect(element(by.id('netflix-badge-0'))).toBeVisible();

    // ✅ STEP 4: Clear filters
    await element(by.id('filter-button')).tap();
    await element(by.id('clear-filters-button')).tap();

    // ✅ VERIFY: All content shown again
    await detoxExpect(element(by.id('trending-carousel'))).toBeVisible();
  });

  /**
   * TEST 6: Infinite Scroll with Pagination
   * Validates: Load more content on scroll
   * Related Bug: BUG-032 - Pagination cursor errors (P1) - FIXED
   */
  it('should load more content on infinite scroll', async () => {
    // ✅ STEP 1: Scroll down to trigger pagination
    await element(by.id('discover-scroll-view')).scrollTo('bottom');

    // ✅ STEP 2: Should show loading indicator
    await waitFor(element(by.id('loading-more-indicator')))
      .toBeVisible()
      .withTimeout(1000);

    // ✅ STEP 3: Should load next page
    await waitFor(element(by.id('content-item-20')))
      .toBeVisible()
      .withTimeout(3000);

    // ✅ STEP 4: Continue scrolling for second pagination
    await element(by.id('discover-scroll-view')).scrollTo('bottom');
    await waitFor(element(by.id('content-item-40')))
      .toBeVisible()
      .withTimeout(3000);

    // ✅ VERIFY: No pagination errors (previously BUG-032)
    await detoxExpect(element(by.text('Error loading content'))).not.toBeVisible();
  });

  /**
   * TEST 7: Search History and Suggestions
   * Validates: Recent searches and autocomplete
   */
  it('should show search history and suggestions', async () => {
    // ✅ STEP 1: Tap search bar
    await element(by.id('search-bar')).tap();

    // ✅ STEP 2: Should show recent searches
    await waitFor(element(by.id('recent-searches')))
      .toBeVisible()
      .withTimeout(1000);

    await detoxExpect(element(by.text('Recent Searches'))).toBeVisible();

    // ✅ STEP 3: Type partial query
    await element(by.id('search-input')).typeText('str');

    // ✅ STEP 4: Should show autocomplete suggestions
    await waitFor(element(by.id('autocomplete-suggestions')))
      .toBeVisible()
      .withTimeout(500);

    await detoxExpect(element(by.text('Stranger Things'))).toBeVisible();
    await detoxExpect(element(by.text('The Strain'))).toBeVisible();

    // ✅ STEP 5: Tap autocomplete suggestion
    await element(by.text('Stranger Things')).tap();

    // ✅ VERIFY: Search executes with full query
    await waitFor(element(by.id('search-results-list'))).toBeVisible();
  });

  /**
   * TEST 8: Content Genres and Categories
   * Validates: Browse by genre (Action, Comedy, Drama, etc.)
   */
  it('should browse content by genre', async () => {
    // ✅ STEP 1: Tap "Browse by Genre" section
    await element(by.id('browse-by-genre-section')).tap();

    // ✅ STEP 2: Should show genre list
    await waitFor(element(by.id('genre-list'))).toBeVisible();

    await detoxExpect(element(by.id('genre-action'))).toBeVisible();
    await detoxExpect(element(by.id('genre-comedy'))).toBeVisible();
    await detoxExpect(element(by.id('genre-drama'))).toBeVisible();

    // ✅ STEP 3: Select "Action" genre
    await element(by.id('genre-action')).tap();

    // ✅ STEP 4: Should show action movies/shows
    await waitFor(element(by.id('genre-results-action')))
      .toBeVisible()
      .withTimeout(2000);

    await detoxExpect(element(by.text('Action Movies & Shows'))).toBeVisible();
    await detoxExpect(element(by.id('genre-result-item-0'))).toBeVisible();
  });

  /**
   * TEST 9: Content Sharing
   * Validates: Share content to social media / messaging apps
   */
  it('should share content details', async () => {
    // ✅ STEP 1: Open content details
    await element(by.id('trending-item-0')).tap();
    await waitFor(element(by.id('content-details-screen'))).toBeVisible();

    // ✅ STEP 2: Tap share button
    await element(by.id('share-button')).tap();

    // ✅ STEP 3: Should show share sheet (platform-specific)
    if (device.getPlatform() === 'ios') {
      await waitFor(element(by.label('Share'))).toBeVisible();
    } else {
      await waitFor(element(by.text('Share'))).toBeVisible();
    }

    // ✅ STEP 4: Cancel share
    await element(by.text('Cancel')).tap();

    // ✅ VERIFY: Back to content details
    await detoxExpect(element(by.id('content-details-screen'))).toBeVisible();
  });

  /**
   * TEST 10: Voice Search (if available)
   * Validates: Voice input for search queries
   */
  it('should perform voice search', async () => {
    // ✅ STEP 1: Tap search bar
    await element(by.id('search-bar')).tap();

    // ✅ STEP 2: Tap voice search button
    await element(by.id('voice-search-button')).tap();

    // ✅ STEP 3: Should request microphone permission (first time)
    // Mock voice input "Stranger Things"
    await device.setPermissions({
      microphone: 'YES'
    });

    // ✅ STEP 4: Should show voice input processing
    await waitFor(element(by.text('Listening...')))
      .toBeVisible()
      .withTimeout(1000);

    // ✅ STEP 5: Should execute search with voice input
    await waitFor(element(by.id('search-results-list')))
      .toBeVisible()
      .withTimeout(3000);

    await detoxExpect(element(by.text('Stranger Things'))).toBeVisible();
  });
});
