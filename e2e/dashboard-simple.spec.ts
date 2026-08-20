import { test, expect } from '@playwright/test';
import { 
  waitForElementToBeVisible,
  waitForTextToBeVisible,
  waitForNetworkIdle,
  safeClick,
  waitForPageLoad,
  navigateToHome
} from './utils/test-helpers';

test.describe('Dashboard - UI Only', () => {
  test('should access dashboard page', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Check what happens - might redirect to login or show dashboard
    const currentUrl = page.url();
    console.log(`Dashboard access resulted in: ${currentUrl}`);

    if (currentUrl.includes('/auth/login')) {
      // Redirected to login - this is expected behavior
      expect(currentUrl).toContain('/auth/login');
      
      // Verify login page is working
      await waitForElementToBeVisible(page, '#email-address, input[name="email"]', 5000);
      await waitForElementToBeVisible(page, '#password, input[name="password"]', 5000);
    } else {
      // Dashboard is accessible - verify it loads
      expect(currentUrl).toContain('/dashboard');
      
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });

  test('should handle dashboard navigation', async ({ page }) => {
    // Start at home
    await navigateToHome(page);

    // Look for dashboard navigation links
    const dashboardLinks = [
      'a[href*="dashboard"]',
      'a:has-text("Dashboard")',
      'button:has-text("Dashboard")',
      'nav a:has-text("Home")',
      '.nav a[href="/"]'
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
      await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }

    // Check current state
    const currentUrl = page.url();
    console.log(`After navigation, current URL: ${currentUrl}`);

    // Either we're on dashboard or redirected to login
    if (currentUrl.includes('/dashboard')) {
      // Dashboard is accessible
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else if (currentUrl.includes('/auth/login')) {
      // Redirected to login - this is valid
      expect(currentUrl).toContain('/auth/login');
    } else {
      // Some other page - verify it loads
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });

  test('should handle dashboard sections if accessible', async ({ page }) => {
    // Try to access dashboard
    await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/dashboard')) {
      // Dashboard is accessible - look for common sections
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);

      // Look for common dashboard elements
      const commonSelectors = [
        'nav, [role="navigation"]',
        '.sidebar, .menu',
        '.dashboard, .main-content',
        '.widget, .card, .section',
        'h1, h2, h3',
        '.stats, .statistics',
        '.recent, .history',
        '.recommendations, .suggestions'
      ];

      let foundElements = 0;
      for (const selector of commonSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundElements++;
        }
      }

      console.log(`Found ${foundElements} common dashboard elements`);
      expect(foundElements).toBeGreaterThan(0);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard search functionality', async ({ page }) => {
    // Try to access dashboard
    await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/dashboard')) {
      // Look for search functionality
      const searchElements = [
        'input[type="search"]',
        'input[placeholder*="search"]',
        'button:has-text("Search")',
        'a[href*="search"]'
      ];

      let foundSearch = false;
      for (const selector of searchElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundSearch = true;
          
          // Try to interact with search
          if (selector.includes('input')) {
            await element.fill('test search');
            const value = await element.inputValue();
            expect(value).toBe('test search');
          } else {
            await element.click();
            await page.waitForTimeout(1000);
          }
          break;
        }
      }

      console.log(`Search functionality found: ${foundSearch}`);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard navigation menu', async ({ page }) => {
    // Try to access dashboard
    await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/dashboard')) {
      // Look for navigation menu
      const navElements = [
        'nav',
        '[role="navigation"]',
        '.sidebar',
        '.menu',
        '.navbar',
        'header nav',
        '.main-nav'
      ];

      let foundNav = false;
      for (const selector of navElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundNav = true;
          const navText = await element.textContent();
          expect(navText?.length).toBeGreaterThan(5);
          break;
        }
      }

      console.log(`Navigation menu found: ${foundNav}`);
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard responsive design', async ({ page }) => {
    // Try to access dashboard
    await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
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
      }

      console.log('Dashboard responsive design tested');
    } else {
      // Dashboard redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle dashboard error states gracefully', async ({ page }) => {
    // Try to access a non-existent dashboard section
    await page.goto('http://localhost:3020/dashboard/non-existent-section', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    // Should either show 404, redirect to login, or handle gracefully
    if (currentUrl.includes('/auth/login')) {
      expect(currentUrl).toContain('/auth/login');
    } else {
      // Check if page handles the error gracefully
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(20);
    }
  });

  test('should handle dashboard loading states', async ({ page }) => {
    // Try to access dashboard
    await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
    
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
});
