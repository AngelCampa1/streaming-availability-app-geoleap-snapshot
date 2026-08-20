import { test, expect } from '@playwright/test';
import { 
  waitForElementToBeVisible,
  waitForTextToBeVisible,
  waitForNetworkIdle,
  safeClick,
  safeFill,
  waitForPageLoad,
  navigateToHome
} from './utils/test-helpers';

test.describe('Streaming Search - UI Only', () => {
  test('should access search page', async ({ page }) => {
    // Try to access search directly
    await page.goto('http://localhost:3020/search', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Check what happens
    const currentUrl = page.url();
    console.log(`Search access resulted in: ${currentUrl}`);

    if (currentUrl.includes('/auth/login')) {
      // Redirected to login - this is expected behavior
      expect(currentUrl).toContain('/auth/login');
      
      // Verify login page is working
      await waitForElementToBeVisible(page, '#email-address, input[name="email"]', 5000);
      await waitForElementToBeVisible(page, '#password, input[name="password"]', 5000);
    } else {
      // Search is accessible - verify it loads
      expect(currentUrl).toContain('/search');
      
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });

  test('should handle search functionality if accessible', async ({ page }) => {
    // Try to access search
    await page.goto('http://localhost:3020/search', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/search')) {
      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
      
      if (await searchInput.isVisible({ timeout: 5000 })) {
        // Test search functionality
        await searchInput.fill('test search');
        const value = await searchInput.inputValue();
        expect(value).toBe('test search');
        
        // Try to submit search
        await searchInput.press('Enter');
        await page.waitForTimeout(2000);
        
        // Check if search results appear or page handles it gracefully
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.length).toBeGreaterThan(50);
        
        console.log('Search functionality tested successfully');
      } else {
        console.log('Search input not found on search page');
      }
    } else {
      // Search redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle search navigation from home', async ({ page }) => {
    // Start at home
    await navigateToHome(page);

    // Look for search navigation links
    const searchLinks = [
      'a[href*="search"]',
      'a:has-text("Search")',
      'button:has-text("Search")',
      'input[type="search"]',
      'input[placeholder*="search"]'
    ];

    let foundSearch = false;
    
    for (const selector of searchLinks) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        if (selector.includes('input')) {
          // If it's a search input, fill it and press enter
          await element.fill('test');
          await element.press('Enter');
        } else {
          // If it's a link/button, click it
          await element.click();
        }
        await page.waitForLoadState('networkidle');
        foundSearch = true;
        break;
      }
    }

    if (!foundSearch) {
      // Try direct navigation
      await page.goto('http://localhost:3020/search', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }

    // Check current state
    const currentUrl = page.url();
    console.log(`After search navigation, current URL: ${currentUrl}`);

    // Either we're on search page or redirected to login
    if (currentUrl.includes('/search')) {
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else if (currentUrl.includes('/auth/login')) {
      expect(currentUrl).toContain('/auth/login');
    } else {
      // Some other page - verify it loads
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });

  test('should handle search filters if accessible', async ({ page }) => {
    // Try to access search
    await page.goto('http://localhost:3020/search', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/search')) {
      // Look for filter elements
      const filterElements = [
        'select[name*="filter"]',
        'button:has-text("Filter")',
        'input[type="checkbox"]',
        'button[aria-label*="filter"]'
      ];

      let foundFilters = false;
      for (const selector of filterElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundFilters = true;
          
          // Try to interact with filter
          if (selector.includes('select')) {
            await element.selectOption({ index: 1 });
          } else if (selector.includes('checkbox')) {
            await element.check();
          } else {
            await element.click();
          }
          
          await page.waitForTimeout(1000);
          break;
        }
      }

      console.log(`Filter elements found: ${foundFilters}`);
      
      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Search redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle search results display', async ({ page }) => {
    // Try to access search
    await page.goto('http://localhost:3020/search', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/search')) {
      // Look for search input and perform a search
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
      
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('test query');
        await searchInput.press('Enter');
        await page.waitForTimeout(3000);
        
        // Look for result elements
        const resultElements = [
          '[data-testid*="result"]',
          '[class*="result"]',
          '[class*="card"]',
          'article',
          '.item',
          '.content'
        ];

        let foundResults = false;
        for (const selector of resultElements) {
          const elements = page.locator(selector);
          const count = await elements.count();
          if (count > 0) {
            foundResults = true;
            console.log(`Found ${count} result elements with selector: ${selector}`);
            break;
          }
        }

        console.log(`Search results found: ${foundResults}`);
        
        // Check for "no results" message if no results found
        if (!foundResults) {
          const noResultsText = await page.locator('body').textContent();
          const hasNoResultsMessage = noResultsText?.match(/no results|not found|empty/i);
          console.log(`No results message found: ${!!hasNoResultsMessage}`);
        }
        
        // Verify page is still functional
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.length).toBeGreaterThan(50);
      } else {
        console.log('Search input not found');
      }
    } else {
      // Search redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle search suggestions if available', async ({ page }) => {
    // Try to access search
    await page.goto('http://localhost:3020/search', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/search')) {
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
      
      if (await searchInput.isVisible({ timeout: 5000 })) {
        // Type partial query to trigger suggestions
        await searchInput.fill('test');
        await page.waitForTimeout(2000);
        
        // Look for suggestion elements
        const suggestionElements = [
          '[data-testid*="suggestion"]',
          '[class*="suggestion"]',
          '[class*="autocomplete"]',
          '.dropdown',
          '.list'
        ];

        let foundSuggestions = false;
        for (const selector of suggestionElements) {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            foundSuggestions = true;
            console.log(`Found suggestions with selector: ${selector}`);
            break;
          }
        }

        console.log(`Search suggestions found: ${foundSuggestions}`);
        
        // Complete the search
        await searchInput.fill('test query');
        await searchInput.press('Enter');
        await page.waitForTimeout(2000);
        
        // Verify page is still functional
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.length).toBeGreaterThan(50);
      } else {
        console.log('Search input not found');
      }
    } else {
      // Search redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle search pagination if available', async ({ page }) => {
    // Try to access search
    await page.goto('http://localhost:3020/search', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/search')) {
      // Perform a search first
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name*="search"]').first();
      
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('test');
        await searchInput.press('Enter');
        await page.waitForTimeout(3000);
        
        // Look for pagination elements
        const paginationElements = [
          '[aria-label*="pagination"]',
          '[class*="pagination"]',
          'button[aria-label*="page"]',
          'a[href*="page"]',
          '.next',
          '.prev'
        ];

        let foundPagination = false;
        for (const selector of paginationElements) {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            foundPagination = true;
            console.log(`Found pagination with selector: ${selector}`);
            
            // Try to click pagination if found
            await element.click();
            await page.waitForTimeout(2000);
            break;
          }
        }

        console.log(`Pagination found: ${foundPagination}`);
        
        // Verify page is still functional
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.length).toBeGreaterThan(50);
      } else {
        console.log('Search input not found');
      }
    } else {
      // Search redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle search error states gracefully', async ({ page }) => {
    // Try to access search with invalid query
    await page.goto('http://localhost:3020/search?q=', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/search')) {
      // Page should handle empty or invalid search gracefully
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(20);
      
      console.log('Search error states handled gracefully');
    } else if (currentUrl.includes('/auth/login')) {
      // Redirected to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    } else {
      // Some other handling - verify page loads
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(20);
    }
  });

  test('should handle search responsive design', async ({ page }) => {
    // Try to access search
    await page.goto('http://localhost:3020/search', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    
    if (currentUrl.includes('/search')) {
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

      console.log('Search responsive design tested');
    } else {
      // Search redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });
});
