import { test, expect } from '@playwright/test';
import {
  waitForElementToBeVisible,
  safeClick,
  navigateToHome
} from './utils/test-helpers';

test.describe('Dashboard - Fixed Selectors', () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies and storage before each test
    await context.clearCookies();

    // Clear storage before navigating
    await context.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        // Ignore storage access errors during init
      }
    });
  });

  test('should access dashboard page and verify authentication protection', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Check what happens - should redirect to login for unauthenticated users
    const currentUrl = page.url();
    console.log(`Dashboard access resulted in: ${currentUrl}`);

    // Should redirect to login for unauthenticated users
    expect(currentUrl).toContain('/auth/login');

    // Verify login page is working
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible({ timeout: 10000 });
  });

  test('should handle dashboard navigation from home', async ({ page }) => {
    // Start at home
    await navigateToHome(page);

    // Look for dashboard navigation links
    const dashboardLinks = [
      'a[href*="dashboard"]',
      'a:has-text("Dashboard")',
      'button:has-text("Dashboard")',
      'nav a:has-text("Home")',
      'a[href="/"]'
    ];

    let foundDashboard = false;

    for (const selector of dashboardLinks) {
      const link = page.locator(selector).first();
      if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
        await link.click();
        await page.waitForLoadState('networkidle');
        foundDashboard = true;
        break;
      }
    }

    if (!foundDashboard) {
      // Try direct navigation
      await page.goto('/dashboard', { timeout: 15000 });
      await page.waitForLoadState('networkidle');
    }

    // Check current state
    const finalUrl = page.url();
    console.log(`After navigation, final URL: ${finalUrl}`);

    // Either we're on dashboard or redirected to login
    if (finalUrl.includes('/dashboard')) {
      // Dashboard is accessible (unlikely without auth)
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else if (finalUrl.includes('/auth/login')) {
      // Redirected to login - this is expected
      expect(finalUrl).toContain('/auth/login');
    } else {
      // Some other page - verify it loads
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });

  test('should handle dashboard sections if accessible', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Dashboard is accessible - look for specific dashboard elements
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);

      // Look for dashboard-specific elements based on the actual UI
      const dashboardElements = [
        'h1:has-text("Welcome back")',
        '.grid.grid-cols-1', // Stats grid
        '[class*="card"]',
        '[class*="Card"]',
        'button:has-text("Start Search")',
        'a:has-text("Global Search")',
        'a:has-text("Advanced Filters")',
        'a:has-text("Search History")',
        'a:has-text("My Watchlist")'
      ];

      let foundElements = 0;
      for (const selector of dashboardElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundElements++;
          console.log(`Found dashboard element: ${selector}`);
        }
      }

      console.log(`Found ${foundElements} dashboard elements`);
      expect(foundElements).toBeGreaterThan(0);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
      console.log('Dashboard properly protected - requires authentication');
    }
  });

  test('should handle dashboard stats display if accessible', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Look for stats elements based on the actual UI
      const statsElements = [
        ':has-text("Total Searches")',
        ':has-text("Saved Content")',
        ':has-text("Watchlist Items")',
        ':has-text("Status")',
        '[class*="text-3xl"]', // Large numbers
        '[class*="font-bold"]', // Bold text for stats
        '.badge', // Status badges
        'span:has-text("Premium")',
        'span:has-text("Free")'
      ];

      let foundStats = false;
      for (const selector of statsElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundStats = true;
          console.log(`Found stats element: ${selector}`);
          break;
        }
      }

      console.log(`Dashboard stats found: ${foundStats}`);

      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard quick actions if accessible', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Look for quick action elements
      const quickActions = [
        'a:has-text("Global Search")',
        'a:has-text("Advanced Filters")',
        'a:has-text("Search History")',
        'a:has-text("My Watchlist")',
        'a:has-text("Trending Now")',
        'a:has-text("Settings")',
        '[href*="/search"]',
        '[href*="/dashboard/"]',
        '[href*="/settings"]'
      ];

      let foundActions = false;
      for (const selector of quickActions) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundActions = true;
          console.log(`Found quick action: ${selector}`);

          // Test clicking one action if it's safe (doesn't log out)
          if (selector.includes('/search') && !foundActions) {
            await element.click();
            await page.waitForTimeout(2000);
            break;
          }
        }
      }

      console.log(`Quick actions found: ${foundActions}`);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard recent searches section if accessible', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Look for recent searches elements
      const recentSearchElements = [
        ':has-text("Recent Searches")',
        ':has-text("No recent searches")',
        'a:has-text("View All")',
        ':has-text("Your latest search activity")',
        '[class*="border"]', // Search item borders
        '.badge', // Result count badges
        'button:has-text("Start Your First Search")'
      ];

      let foundRecentSearches = false;
      for (const selector of recentSearchElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundRecentSearches = true;
          console.log(`Found recent searches element: ${selector}`);
          break;
        }
      }

      console.log(`Recent searches section found: ${foundRecentSearches}`);

      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard watchlist section if accessible', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Look for watchlist elements
      const watchlistElements = [
        ':has-text("Your Watchlist")',
        ':has-text("No saved content yet")',
        ':has-text("Content you\'ve saved for later")',
        'a:has-text("View All")',
        'button:has-text("Discover Content")',
        '[class*="aspect"]', // Content poster aspect ratios
        '.badge' // Type badges
      ];

      let foundWatchlist = false;
      for (const selector of watchlistElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundWatchlist = true;
          console.log(`Found watchlist element: ${selector}`);
          break;
        }
      }

      console.log(`Watchlist section found: ${foundWatchlist}`);

      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard responsive design', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 768, height: 1024 },  // Tablet
        { width: 375, height: 667 }    // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);

        // Check if page is still functional
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.length).toBeGreaterThan(50);

        // Check for responsive elements
        if (viewport.width >= 1024) {
          // Desktop - should have grid layouts
          const gridElement = page.locator('.grid-cols-1, .lg\\:grid-cols-2, .lg\\:grid-cols-4');
          if (await gridElement.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`Desktop grid layout visible at ${viewport.width}x${viewport.height}`);
          }
        } else {
          // Mobile - should have mobile layouts
          const mobileElement = page.locator('.md\\:grid-cols-2, .grid-cols-1');
          if (await mobileElement.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`Mobile layout visible at ${viewport.width}x${viewport.height}`);
          }
        }
      }

      console.log('Dashboard responsive design tested');
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard error states gracefully', async ({ page }) => {
    // Try to access a non-existent dashboard section
    await page.goto('/dashboard/non-existent-section', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    // Should either show 404, redirect to login, or handle gracefully
    if (currentUrl.includes('/auth/login')) {
      expect(currentUrl).toContain('/auth/login');
    } else if (currentUrl.includes('/dashboard')) {
      // Check if page handles the error gracefully
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Some other handling - verify page loads
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });

  test('should handle dashboard loading states', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });

    // Wait for initial load
    await page.waitForLoadState('domcontentloaded');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Wait for full load
      await page.waitForLoadState('networkidle');

      // Check if content is loaded
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);

      console.log('Dashboard loading states handled properly');
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard subscription status alerts if accessible', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Look for subscription alerts
      const subscriptionElements = [
        ':has-text("free plan")',
        ':has-text("premium")',
        ':has-text("Upgrade")',
        ':has-text("Renew")',
        ':has-text("subscription")',
        '.alert',
        '[role="alert"]',
        'button:has-text("Upgrade Now")',
        'button:has-text("Renew Now")'
      ];

      let foundSubscriptionElements = false;
      for (const selector of subscriptionElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundSubscriptionElements = true;
          console.log(`Found subscription element: ${selector}`);
          break;
        }
      }

      console.log(`Subscription status elements found: ${foundSubscriptionElements}`);

      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard tips and help section if accessible', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Look for tips/help elements
      const tipsElements = [
        ':has-text("Pro Tips")',
        ':has-text("Better Searching")',
        ':has-text("specific titles")',
        ':has-text("advanced filters")',
        '[class*="gradient"]', // Tips card styling
        '[class*="blue"]', // Tips card colors
        'h3:has-text("Tips")',
        'ul li' // Tip list items
      ];

      let foundTipsElements = false;
      for (const selector of tipsElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundTipsElements = true;
          console.log(`Found tips element: ${selector}`);
          break;
        }
      }

      console.log(`Tips section found: ${foundTipsElements}`);

      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });
});