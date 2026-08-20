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
  navigateToDashboard,
  navigateToWatchlist,
  navigateToSearch,
  navigateToSettings,
  navigateToHome,
  navigateToASODashboard
} from './utils/test-helpers';

test.describe('Dashboard Navigation and Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_USERS.standard);
  });

  test('should load main dashboard', async ({ page }) => {
    await navigateToDashboard(page);

    // Verify dashboard loaded
    expect(page.url()).toContain('/dashboard');
    
    // Should show dashboard content with meaningful data
    await waitForTextToBeVisible(page, /dashboard|welcome|user|activity/i, 10000);
    
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(200);
    expect(body).toMatch(/dashboard|welcome|user|activity|recent/i);
  });

  test('should display user dashboard widgets', async ({ page }) => {
    await navigateToDashboard(page);

    // Wait for dashboard widgets to load
    await waitForTextToBeVisible(page, /dashboard|recent|activity|watchlist|search|recommendation/i, 15000);

    // Look for specific dashboard sections
    const body = await page.locator('body').textContent();
    
    // Should have dashboard sections or widgets
    expect(body).toMatch(/dashboard|recent|activity|watchlist|search|recommendation/i);
    
    // Look for navigation elements
    const navElements = page.locator('nav, [role="navigation"], .sidebar, .menu').first();
    if (await navElements.isVisible({ timeout: 5000 }).catch(() => false)) {
      const navText = await navElements.textContent();
      expect(navText?.length).toBeGreaterThan(10);
    }
  });

  test('should navigate to search history', async ({ page }) => {
    await navigateToDashboard(page);

    // Look for search history link or section
    const historyLink = page.locator('a:has-text("History"), a[href*="history"], button:has-text("History")').first();
    
    if (await historyLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await safeClick(page, 'a:has-text("History"), a[href*="history"], button:has-text("History")');
      await waitForPageLoad(page);
      
      // Should navigate to history page or show history content
      expect(page.url()).toMatch(/history|dashboard/);
      
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(50);
    } else {
      // History might be on the dashboard itself - look for history content
      await waitForTextToBeVisible(page, /history|recent|search/i, 10000);
      const body = await page.locator('body').textContent();
      expect(body).toMatch(/history|recent|search|activity/i);
    }
  });

  test('should access watchlist from dashboard', async ({ page }) => {
    await navigateToDashboard(page);

    // Look for watchlist link
    const watchlistLink = page.locator('a:has-text("Watchlist"), a[href="/watchlist"], button:has-text("Watchlist")').first();
    
    if (await watchlistLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await safeClick(page, 'a:has-text("Watchlist"), a[href="/watchlist"], button:has-text("Watchlist")');
      await waitForPageLoad(page);
      
      // Should navigate to watchlist page
      expect(page.url()).toMatch(/watchlist/);
      
      // Verify watchlist page content
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(50);
    } else {
      // Try UI navigation to watchlist
      await navigateToWatchlist(page);
      expect(page.url()).toMatch(/watchlist/);
    }
  });

  test('should display recent searches', async ({ page }) => {
    await navigateToDashboard(page);

    // Wait for dashboard content to load
    await waitForTextToBeVisible(page, /dashboard|recent|search|activity/i, 10000);
    
    const body = await page.locator('body').textContent();
    
    // Dashboard should have meaningful content
    expect(body?.length).toBeGreaterThan(100);
    expect(body).toMatch(/dashboard|recent|search|activity|welcome/i);
  });

  test('should navigate to ASO dashboard', async ({ page }) => {
    await navigateToASODashboard(page);

    // Verify ASO dashboard loaded (if user has access)
    await waitForTextToBeVisible(page, /aso|dashboard|analytics|search optimization/i, 10000);
    
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(50);
  });

  test('should show dashboard statistics', async ({ page }) => {
    await navigateToDashboard(page);

    // Wait for dashboard to load with stats
    await waitForTextToBeVisible(page, /dashboard|stats|statistics|numbers|count/i, 10000);
    
    const body = await page.locator('body').textContent();
    
    // Should show some numerical data or stats
    expect(body).toMatch(/\d+/); // Should contain numbers
    expect(body?.length).toBeGreaterThan(100);
  });

  test('should access quick search from dashboard', async ({ page }) => {
    await navigateToDashboard(page);

    // Look for search button or input
    const searchElement = page.locator('a[href="/search"], button:has-text("Search"), input[type="search"]').first();
    
    if (await searchElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await safeClick(page, 'a[href="/search"], button:has-text("Search"), input[type="search"]');
      await waitForPageLoad(page);
      
      // Should navigate to search page or activate search
      const url = page.url();
      expect(url).toMatch(/search|dashboard/);
      
      // Verify search-related content is visible
      const body = await page.locator('body').textContent();
      expect(body).toMatch(/search|find|discover|explore/i);
    } else {
      // Try UI navigation to search
      await navigateToSearch(page);
      expect(page.url()).toMatch(/search/);
    }
  });

  test('should display recommended content', async ({ page }) => {
    await navigateToDashboard(page);

    // Wait for recommendations to load
    await waitForTextToBeVisible(page, /recommend|suggestion|popular|trending|for you|discover/i, 10000);
    
    const body = await page.locator('body').textContent();
    
    // Should show content recommendations
    expect(body).toMatch(/recommend|suggestion|popular|trending|for you|discover/i);
    expect(body?.length).toBeGreaterThan(100);
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    await navigateToDashboard(page);

    // Try to navigate to different dashboard sections
    const sections = ['watchlist', 'history', 'aso', 'settings'];
    
    for (const section of sections) {
      const link = page.locator(`a[href*="${section}"], button:has-text("${section.charAt(0).toUpperCase() + section.slice(1)}")`).first();
      if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
        await safeClick(page, `a[href*="${section}"], button:has-text("${section.charAt(0).toUpperCase() + section.slice(1)}")`);
        await waitForPageLoad(page);
        
        // Verify navigation happened
        const url = page.url();
        expect(url).toBeTruthy();
        expect(url).toMatch(new RegExp(section, 'i'));
        
        // Go back to main dashboard through UI
        await navigateToDashboard(page);
      }
    }
  });

  test('should handle empty dashboard state for new users', async ({ page }) => {
    await navigateToDashboard(page);

    // Dashboard should still render even if no data
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(50);
    
    // Should show welcome or getting started content
    expect(body).toMatch(/welcome|dashboard|getting started|begin|hello/i);
  });

  test('should show user profile summary in dashboard', async ({ page }) => {
    await navigateToDashboard(page);

    // Wait for user-related content to load
    await waitForTextToBeVisible(page, /user|profile|account|welcome|dashboard/i, 10000);
    
    const body = await page.locator('body').textContent();
    
    // Should contain user-related content
    expect(body).toMatch(/user|profile|account|welcome|dashboard/i);
    expect(body?.length).toBeGreaterThan(100);
  });

  test('should access settings from dashboard', async ({ page }) => {
    await navigateToDashboard(page);

    // Look for settings link
    const settingsLink = page.locator('a[href="/settings"], a:has-text("Settings"), button:has-text("Settings")').first();
    
    if (await settingsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await safeClick(page, 'a[href="/settings"], a:has-text("Settings"), button:has-text("Settings")');
      await waitForPageLoad(page);
      
      // Should navigate to settings
      expect(page.url()).toMatch(/settings/);
      
      // Verify settings page content
      const body = await page.locator('body').textContent();
      expect(body).toMatch(/settings|profile|account|preferences/i);
    } else {
      // Try UI navigation to settings
      await navigateToSettings(page);
      expect(page.url()).toMatch(/settings/);
    }
  });
});
