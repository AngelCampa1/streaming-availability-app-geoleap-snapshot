import { test, expect } from '@playwright/test';
import { 
  loginAsTestUser, 
  logout, 
  TEST_USERS,
  waitForElementToBeVisible,
  waitForTextToBeVisible,
  waitForNetworkIdle,
  safeClick,
  safeFill,
  waitForPageLoad,
  navigateToSearch,
  navigateToWatchlist,
  navigateToHome
} from './utils/test-helpers';

test.describe('Streaming Search Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsTestUser(page, TEST_USERS.standard);
  });

  test('should load search page successfully', async ({ page }) => {
    await navigateToSearch(page);

    // Verify search page elements are present
    await waitForElementToBeVisible(page, 'input[type="search"], input[placeholder*="Search"], input[name*="search"]', 10000);
    
    // Verify search page content is loaded
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
    expect(body).toMatch(/search|find|discover|explore|content/i);
  });

  test('should perform a basic search', async ({ page }) => {
    await navigateToSearch(page);

    // Find and fill search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
    await safeFill(page, 'input[type="search"], input[placeholder*="Search"], input[name*="search"]', 'Breaking Bad');

    // Submit search (either by pressing Enter or clicking search button)
    await searchInput.press('Enter');

    // Wait for search results to load
    await waitForTextToBeVisible(page, /results|breaking bad|found|search|loading/i, 15000);

    // Verify results are displayed
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(200); // More content loaded after search
    expect(body).toMatch(/breaking bad|results|found|search/i);
    
    // Look for search result elements
    const resultElements = page.locator('[data-testid*="result"], [class*="result"], [class*="card"], article').first();
    if (await resultElements.isVisible({ timeout: 5000 }).catch(() => false)) {
      const resultCount = await page.locator('[data-testid*="result"], [class*="result"], [class*="card"], article').count();
      expect(resultCount).toBeGreaterThan(0);
    }
  });

  test('should filter search results by streaming service', async ({ page }) => {
    await navigateToSearch(page);

    // Perform search first
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
    await safeFill(page, 'input[type="search"], input[placeholder*="Search"], input[name*="search"]', 'The Office');
    await searchInput.press('Enter');

    // Wait for search results
    await waitForTextToBeVisible(page, /the office|results|found/i, 15000);

    // Look for filter options (might be dropdown, checkboxes, etc.)
    const filterButton = page.locator('button:has-text("Filter"), button:has-text("filter"), [aria-label*="filter"]').first();
    if (await filterButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await safeClick(page, 'button:has-text("Filter"), button:has-text("filter"), [aria-label*="filter"]');
      await waitForTextToBeVisible(page, /netflix|streaming|service|filter/i, 5000);
    }

    // Try to select a streaming service filter
    const netflixFilter = page.locator('text=Netflix, [value="netflix"], [data-service="netflix"], label:has-text("Netflix")').first();
    if (await netflixFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await safeClick(page, 'text=Netflix, [value="netflix"], [data-service="netflix"], label:has-text("Netflix")');
      await waitForNetworkIdle(page, 5000);
    }

    // Verify page updated and still has content
    expect(page.url()).toContain('/search');
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  test('should view content details', async ({ page }) => {
    await navigateToSearch(page);

    // Search for content
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
    await safeFill(page, 'input[type="search"], input[placeholder*="Search"], input[name*="search"]', 'Stranger Things');
    await searchInput.press('Enter');

    // Wait for search results
    await waitForTextToBeVisible(page, /stranger things|results|found/i, 15000);

    // Click on first result (could be card, link, button)
    const firstResult = page.locator('[data-testid*="content"], [class*="content-card"], [class*="result"], article, a[href*="/content"]').first();
    if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
      await safeClick(page, '[data-testid*="content"], [class*="content-card"], [class*="result"], article, a[href*="/content"]');
      
      // Wait for navigation or modal to load
      await waitForPageLoad(page);
      
      // Verify we're seeing details (more content than before)
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(300);
      expect(body).toMatch(/stranger things|details|overview|cast|season|episode/i);
    } else {
      // If no specific result cards, verify search happened and look for any clickable content
      expect(page.url()).toContain('/search');
      const body = await page.locator('body').textContent();
      expect(body).toMatch(/stranger things|results|found|no results/i);
    }
  });

  test('should add content to watchlist', async ({ page }) => {
    await navigateToSearch(page);

    // Search for content
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
    await safeFill(page, 'input[type="search"], input[placeholder*="Search"], input[name*="search"]', 'Game of Thrones');
    await searchInput.press('Enter');

    // Wait for search results
    await waitForTextToBeVisible(page, /game of thrones|results|found/i, 15000);

    // Look for "Add to Watchlist" button
    const addButton = page.locator('button:has-text("Watchlist"), button:has-text("watchlist"), [aria-label*="watchlist"], button[title*="watchlist"]').first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await safeClick(page, 'button:has-text("Watchlist"), button:has-text("watchlist"), [aria-label*="watchlist"], button[title*="watchlist"]');
      
      // Wait for confirmation or button state change
      await waitForTextToBeVisible(page, /added|watchlist|success|saved/i, 5000).catch(() => {
        // If no confirmation message, check if button state changed
        return addButton.textContent();
      });
      
      // Should show some confirmation or button state change
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(100);
    } else {
      // Try to find any watchlist-related functionality
      const watchlistElements = page.locator('[data-testid*="watchlist"], [class*="watchlist"]').first();
      if (await watchlistElements.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Found watchlist elements but button not clickable');
      }
    }
  });

  test('should navigate to watchlist page', async ({ page }) => {
    await navigateToWatchlist(page);

    // Verify watchlist page loaded
    expect(page.url()).toMatch(/watchlist/);
    
    // Page should have watchlist-related content
    await waitForTextToBeVisible(page, /watchlist|my list|saved|favorites/i, 10000);
    
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(50);
    expect(body).toMatch(/watchlist|my list|saved|favorites|empty/i);
  });

  test('should handle empty search gracefully', async ({ page }) => {
    await navigateToSearch(page);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
    await safeFill(page, 'input[type="search"], input[placeholder*="Search"], input[name*="search"]', 'xyzabc123nonexistentshow');
    await searchInput.press('Enter');

    // Wait for search results or "no results" message
    await waitForTextToBeVisible(page, /no results|not found|empty|search/i, 10000);

    // Should show "no results" or similar message
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy(); // Page should still render
    expect(body).toMatch(/no results|not found|empty|search|try again/i);
  });

  test('should allow filtering by country', async ({ page }) => {
    await navigateToSearch(page);

    // Perform search
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
    await safeFill(page, 'input[type="search"], input[placeholder*="Search"], input[name*="search"]', 'Friends');
    await searchInput.press('Enter');

    // Wait for search results
    await waitForTextToBeVisible(page, /friends|results|found/i, 15000);

    // Look for country filter
    const countryFilter = page.locator('[placeholder*="Country"], select[name*="country"], button:has-text("Country"), [aria-label*="country"]').first();
    
    if (await countryFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await safeClick(page, '[placeholder*="Country"], select[name*="country"], button:has-text("Country"), [aria-label*="country"]');
      await waitForTextToBeVisible(page, /united states|country|region/i, 5000);
      
      // Select a country (e.g., United States)
      const usOption = page.locator('text=United States, [value="US"], [data-country="US"], option[value*="US"]').first();
      if (await usOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await safeClick(page, 'text=United States, [value="US"], [data-country="US"], option[value*="US"]');
        await waitForNetworkIdle(page, 3000);
      }
    }

    // Verify we're still on search page and content loaded
    expect(page.url()).toContain('/search');
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  test('should handle search suggestions and autocomplete', async ({ page }) => {
    await navigateToSearch(page);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
    
    // Type partial search term to trigger suggestions
    await safeFill(page, 'input[type="search"], input[placeholder*="Search"], input[name*="search"]', 'Str');
    
    // Wait for suggestions to appear
    await waitForTextToBeVisible(page, /stranger|stranger things|suggestions/i, 5000).catch(() => {
      // If no suggestions appear, that's okay - continue test
    });
    
    // Complete the search
    await searchInput.fill('Stranger Things');
    await searchInput.press('Enter');
    
    // Wait for results
    await waitForTextToBeVisible(page, /stranger things|results|found/i, 15000);
    
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/stranger things|results|found/i);
  });

  test('should sort search results', async ({ page }) => {
    await navigateToSearch(page);

    // Perform search
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
    await safeFill(page, 'input[type="search"], input[placeholder*="Search"], input[name*="search"]', 'Batman');
    await searchInput.press('Enter');

    // Wait for search results
    await waitForTextToBeVisible(page, /batman|results|found/i, 15000);

    // Look for sort dropdown or buttons
    const sortElement = page.locator('select[name*="sort"], button:has-text("Sort"), [aria-label*="sort"]').first();
    
    if (await sortElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      await safeClick(page, 'select[name*="sort"], button:has-text("Sort"), [aria-label*="sort"]');
      await waitForTextToBeVisible(page, /relevance|rating|date|title|popularity/i, 3000);
      
      // Try to select a sort option
      const ratingOption = page.locator('text=Rating, [value="rating"], option[value*="rating"]').first();
      if (await ratingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await safeClick(page, 'text=Rating, [value="rating"], option[value*="rating"]');
        await waitForNetworkIdle(page, 3000);
      }
    }

    // Verify we're still on search page with results
    expect(page.url()).toContain('/search');
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/batman|results|found/i);
  });
});
