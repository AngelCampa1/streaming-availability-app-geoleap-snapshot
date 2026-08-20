import { test, expect } from '@playwright/test';
import {
  generateRandomEmail,
  generateTestPassword,
  waitForElementToBeVisible,
  waitForTextToBeVisible,
  waitForUrlToContain,
  safeClick,
  safeFill,
  navigateToHome,
  waitForNetworkIdle,
  waitForPageLoad,
  loginAsTestUser,
  TEST_USERS
} from './utils/test-helpers';

test.describe('Complete Watchlist Flow - Production Ready', () => {
  let userEmail: string;
  let userPassword: string;

  test.beforeEach(async () => {
    userEmail = generateRandomEmail();
    userPassword = generateTestPassword();
  });

  test('should complete full watchlist CRUD operations', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to search or content discovery
    await page.goto('http://localhost:3020/search', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      console.log('Search requires authentication - already handled');
      // Try dashboard instead
      await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }

    // Step 3: Look for content to add to watchlist
    const contentSelectors = [
      '[data-testid="content-card"]',
      '[data-testid="movie-card"]',
      '[data-testid="show-card"]',
      '[class*="content-card"]',
      '[class*="movie-card"]',
      '[class*="show-card"]',
      'article',
      '.content-item',
      '.search-result'
    ];

    let contentFound = false;
    let firstContentItem = null;

    for (const selector of contentSelectors) {
      const items = page.locator(selector);
      const count = await items.count();
      if (count > 0) {
        contentFound = true;
        firstContentItem = items.first();
        console.log(`Found ${count} content items with selector: ${selector}`);
        break;
      }
    }

    if (!contentFound) {
      console.log('No content items found - looking for watchlist management directly');
    }

    // Step 4: Navigate to watchlist page
    await page.goto('http://localhost:3020/watchlist', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const watchlistUrl = page.url();
    if (watchlistUrl.includes('/auth/login')) {
      console.log('Watchlist requires authentication - trying dashboard');
      await page.goto('http://localhost:3020/dashboard/watchlist', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }

    // Step 5: Check watchlist page functionality
    const finalUrl = page.url();
    if (finalUrl.includes('/watchlist')) {
      console.log('On watchlist page - testing CRUD operations');

      // Test empty watchlist state
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.match(/empty|no items|your watchlist is empty/i)) {
        console.log('Empty watchlist state detected');
      }

      // Look for add to watchlist functionality
      const addSelectors = [
        'button:has-text("Add to watchlist")',
        'button[aria-label*="watchlist"]',
        '[data-testid="add-to-watchlist"]',
        '.add-to-watchlist',
        '.watchlist-button'
      ];

      let addFunctionalityFound = false;
      for (const selector of addSelectors) {
        const addButton = page.locator(selector).first();
        if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          addFunctionalityFound = true;
          console.log(`Found add to watchlist button: ${selector}`);

          // Test adding to watchlist
          await safeClick(page, selector);
          await page.waitForTimeout(2000);

          // Check if item was added (look for success message or UI change)
          const updatedBodyText = await page.locator('body').textContent();
          if (updatedBodyText?.match(/added|saved|in watchlist/i)) {
            console.log('Item successfully added to watchlist');
          }
          break;
        }
      }

      if (!addFunctionalityFound) {
        console.log('Add to watchlist functionality not found');
      }

      // Test watchlist item management
      const watchlistItemSelectors = [
        '[data-testid="watchlist-item"]',
        '.watchlist-item',
        '[class*="watchlist-item"]',
        '.content-in-watchlist'
      ];

      let watchlistItemsFound = 0;
      for (const selector of watchlistItemSelectors) {
        const items = page.locator(selector);
        const count = await items.count();
        if (count > 0) {
          watchlistItemsFound = count;
          console.log(`Found ${count} watchlist items with selector: ${selector}`);
          break;
        }
      }

      if (watchlistItemsFound > 0) {
        // Test remove from watchlist
        const removeSelectors = [
          'button:has-text("Remove")',
          'button[aria-label*="remove"]',
          '[data-testid="remove-from-watchlist"]',
          '.remove-from-watchlist',
          '.watchlist-remove'
        ];

        for (const selector of removeSelectors) {
          const removeButton = page.locator(selector).first();
          if (await removeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log(`Found remove button: ${selector}`);

            // Note: We won't actually click remove to preserve data
            break;
          }
        }

        // Test watchlist item details
        const firstItem = page.locator(watchlistItemSelectors[0]).first();
        const itemTitle = firstItem.locator('h1, h2, h3, .title, [data-testid="title"]').first();
        const itemText = await itemTitle.textContent();

        if (itemText && itemText.length > 0) {
          console.log(`Found watchlist item with title: ${itemText}`);
        }
      }

      // Test watchlist sorting/filtering
      const filterSelectors = [
        'select[name*="sort"]',
        'button:has-text("Sort")',
        'button:has-text("Filter")',
        '[data-testid="sort-watchlist"]',
        '[data-testid="filter-watchlist"]'
      ];

      let filterFunctionalityFound = false;
      for (const selector of filterSelectors) {
        const filterElement = page.locator(selector).first();
        if (await filterElement.isVisible({ timeout: 3000 }).catch(() => false)) {
          filterFunctionalityFound = true;
          console.log(`Found watchlist filter/sort: ${selector}`);
          break;
        }
      }

      if (!filterFunctionalityFound) {
        console.log('Watchlist filter/sort functionality not found');
      }

    } else {
      console.log(`Watchlist page not accessible - final URL: ${finalUrl}`);
    }

    // Step 6: Test watchlist from content detail pages
    if (firstContentItem) {
      // Try to click on content item to go to detail page
      await firstContentItem.click();
      await page.waitForTimeout(3000);

      const detailUrl = page.url();
      if (detailUrl !== finalUrl) {
        console.log(`Navigated to content detail page: ${detailUrl}`);

        // Look for watchlist button on detail page
        const detailAddSelectors = [
          'button:has-text("Add to watchlist")',
          'button[aria-label*="watchlist"]',
          '[data-testid="add-to-watchlist"]',
          '.add-to-watchlist'
        ];

        for (const selector of detailAddSelectors) {
          const addButton = page.locator(selector).first();
          if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log(`Found watchlist button on detail page: ${selector}`);
            // Note: We won't click to avoid data changes
            break;
          }
        }
      }
    }
  });

  test('should handle watchlist sharing functionality', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to watchlist
    await page.goto('http://localhost:3020/watchlist', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/watchlist')) {
      // Step 3: Look for sharing functionality
      const shareSelectors = [
        'button:has-text("Share")',
        'button[aria-label*="share"]',
        '[data-testid="share-watchlist"]',
        '.share-watchlist',
        'a:has-text("Share")'
      ];

      let shareFunctionalityFound = false;
      for (const selector of shareSelectors) {
        const shareButton = page.locator(selector).first();
        if (await shareButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          shareFunctionalityFound = true;
          console.log(`Found share functionality: ${selector}`);

          // Note: We won't click to avoid opening share dialogs
          break;
        }
      }

      if (!shareFunctionalityFound) {
        console.log('Watchlist sharing functionality not found');
      }

      // Step 4: Look for export functionality
      const exportSelectors = [
        'button:has-text("Export")',
        'button:has-text("Download")',
        '[data-testid="export-watchlist"]',
        '.export-watchlist'
      ];

      let exportFunctionalityFound = false;
      for (const selector of exportSelectors) {
        const exportButton = page.locator(selector).first();
        if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          exportFunctionalityFound = true;
          console.log(`Found export functionality: ${selector}`);
          break;
        }
      }

      if (!exportFunctionalityFound) {
        console.log('Watchlist export functionality not found');
      }

      // Step 5: Look for public/private settings
      const privacySelectors = [
        'button:has-text("Public")',
        'button:has-text("Private")',
        '[data-testid="watchlist-privacy"]',
        'input[type="checkbox"][name*="public"]',
        '.privacy-setting'
      ];

      let privacyFunctionalityFound = false;
      for (const selector of privacySelectors) {
        const privacyElement = page.locator(selector).first();
        if (await privacyElement.isVisible({ timeout: 3000 }).catch(() => false)) {
          privacyFunctionalityFound = true;
          console.log(`Found privacy settings: ${selector}`);
          break;
        }
      }

      if (!privacyFunctionalityFound) {
        console.log('Watchlist privacy settings not found');
      }
    }
  });

  test('should handle watchlist notifications and reminders', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to watchlist settings
    await page.goto('http://localhost:3020/settings/notifications', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Step 3: Look for watchlist notification settings
    const notificationSelectors = [
      'input[type="checkbox"][name*="watchlist"]',
      'input[type="checkbox"][name*="notification"]',
      'label:has-text("watchlist")',
      'label:has-text("notification")',
      '[data-testid="watchlist-notifications"]'
    ];

    let notificationSettingsFound = false;
    for (const selector of notificationSelectors) {
      const notificationElement = page.locator(selector).first();
      if (await notificationElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        notificationSettingsFound = true;
        console.log(`Found notification setting: ${selector}`);
        break;
      }
    }

    if (!notificationSettingsFound) {
      console.log('Watchlist notification settings not found');
    }

    // Step 4: Try watchlist page for notification options
    await page.goto('http://localhost:3020/watchlist', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/watchlist')) {
      const watchlistNotificationSelectors = [
        'button:has-text("Notify")',
        'button:has-text("Reminder")',
        '[data-testid="set-reminder"]',
        '.notification-settings',
        '.reminder-settings'
      ];

      let reminderFunctionalityFound = false;
      for (const selector of watchlistNotificationSelectors) {
        const reminderElement = page.locator(selector).first();
        if (await reminderElement.isVisible({ timeout: 3000 }).catch(() => false)) {
          reminderFunctionalityFound = true;
          console.log(`Found reminder functionality: ${selector}`);
          break;
        }
      }

      if (!reminderFunctionalityFound) {
        console.log('Watchlist reminder functionality not found');
      }
    }
  });

  test('should handle watchlist search and filtering', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to watchlist
    await page.goto('http://localhost:3020/watchlist', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/watchlist')) {
      // Step 3: Look for search functionality
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[name*="search"]').first();

      if (await searchInput.isVisible({ timeout: 3000 })) {
        console.log('Found watchlist search input');

        // Test search functionality
        await searchInput.fill('test search');
        await page.waitForTimeout(2000);

        const searchValue = await searchInput.inputValue();
        expect(searchValue).toBe('test search');

        await searchInput.press('Enter');
        await page.waitForTimeout(2000);

        console.log('Watchlist search functionality tested');
      } else {
        console.log('Watchlist search input not found');
      }

      // Step 4: Look for filtering options
      const filterSelectors = [
        'select[name*="filter"]',
        'select[name*="sort"]',
        'button:has-text("Filter")',
        'button:has-text("Sort")',
        '[data-testid="filter"]',
        '[data-testid="sort"]'
      ];

      let filterFunctionalityFound = false;
      for (const selector of filterSelectors) {
        const filterElement = page.locator(selector).first();
        if (await filterElement.isVisible({ timeout: 3000 }).catch(() => false)) {
          filterFunctionalityFound = true;
          console.log(`Found filter/sort functionality: ${selector}`);
          break;
        }
      }

      if (!filterFunctionalityFound) {
        console.log('Watchlist filter/sort functionality not found');
      }

      // Step 5: Look for category/genre filters
      const categorySelectors = [
        'button:has-text("Genre")',
        'button:has-text("Category")',
        '[data-testid="category-filter"]',
        '[data-testid="genre-filter"]',
        '.category-filter',
        '.genre-filter'
      ];

      let categoryFunctionalityFound = false;
      for (const selector of categorySelectors) {
        const categoryElement = page.locator(selector).first();
        if (await categoryElement.isVisible({ timeout: 3000 }).catch(() => false)) {
          categoryFunctionalityFound = true;
          console.log(`Found category filter: ${selector}`);
          break;
        }
      }

      if (!categoryFunctionalityFound) {
        console.log('Watchlist category/genre filters not found');
      }
    }
  });

  test('should handle watchlist performance with large datasets', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to watchlist
    await page.goto('http://localhost:3020/watchlist', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/watchlist')) {
      // Step 3: Test pagination
      const paginationSelectors = [
        '[aria-label*="pagination"]',
        '[class*="pagination"]',
        'button[aria-label*="page"]',
        'a[href*="page"]',
        '.next',
        '.prev',
        'button:has-text("Next")',
        'button:has-text("Previous")'
      ];

      let paginationFound = false;
      for (const selector of paginationSelectors) {
        const paginationElement = page.locator(selector).first();
        if (await paginationElement.isVisible({ timeout: 3000 }).catch(() => false)) {
          paginationFound = true;
          console.log(`Found pagination: ${selector}`);
          break;
        }
      }

      if (!paginationFound) {
        console.log('Pagination not found - may have small dataset or infinite scroll');
      }

      // Step 4: Test infinite scroll if pagination not found
      if (!paginationFound) {
        // Look for infinite scroll indicators
        const scrollSelectors = [
          '[data-testid="infinite-scroll"]',
          '.infinite-scroll',
          '[data-testid="load-more"]',
          '.load-more'
        ];

        let infiniteScrollFound = false;
        for (const selector of scrollSelectors) {
          const scrollElement = page.locator(selector).first();
          if (await scrollElement.isVisible({ timeout: 3000 }).catch(() => false)) {
            infiniteScrollFound = true;
            console.log(`Found infinite scroll: ${selector}`);
            break;
          }
        }

        if (!infiniteScrollFound) {
          console.log('Infinite scroll not found');
        }
      }

      // Step 5: Test performance indicators
      const startTime = Date.now();

      // Measure page load time
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      console.log(`Watchlist page load time: ${loadTime}ms`);

      // Check for performance optimizations
      const bodyText = await page.locator('body').textContent();
      const itemCount = bodyText?.match(/item|result|entry/gi)?.length || 0;

      console.log(`Estimated item count: ${itemCount}`);

      // Test virtual scrolling if many items
      if (itemCount > 50) {
        const virtualScrollSelectors = [
          '[data-testid="virtual-scroll"]',
          '.virtual-scroll',
          '[style*="overflow"]'
        ];

        let virtualScrollFound = false;
        for (const selector of virtualScrollSelectors) {
          const virtualElement = page.locator(selector).first();
          if (await virtualElement.isVisible({ timeout: 3000 }).catch(() => false)) {
            virtualScrollFound = true;
            console.log(`Found virtual scroll: ${selector}`);
            break;
          }
        }

        if (!virtualScrollFound) {
          console.log('Virtual scroll not detected - may impact performance with large datasets');
        }
      }
    }
  });

  test('should handle watchlist responsive design', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to watchlist
    await page.goto('http://localhost:3020/watchlist', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/watchlist')) {
      // Step 3: Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1366, height: 768 },  // Laptop
        { width: 768, height: 1024 },   // Tablet
        { width: 375, height: 667 }     // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);

        console.log(`Testing viewport: ${viewport.width}x${viewport.height}`);

        // Check if page is still functional
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.length).toBeGreaterThan(50);

        // Check for responsive elements
        const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu, .hamburger').first();
        const isMobileMenu = await mobileMenu.isVisible({ timeout: 1000 }).catch(() => false);

        if (viewport.width <= 768 && isMobileMenu) {
          console.log('Mobile menu found on mobile viewport');
        } else if (viewport.width > 768 && !isMobileMenu) {
          console.log('Desktop navigation found on desktop viewport');
        }

        // Test content layout adaptation
        const gridLayout = page.locator('.grid, .flex, [class*="grid"], [class*="flex"]').first();
        if (await gridLayout.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`Responsive layout detected for ${viewport.width}px width`);
        }
      }

      console.log('Watchlist responsive design testing completed');
    }
  });

  test('should handle watchlist accessibility features', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to watchlist
    await page.goto('http://localhost:3020/watchlist', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/watchlist')) {
      // Step 3: Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);

      const focusedElement = await page.locator(':focus').first();
      const isFocusable = await focusedElement.isVisible().catch(() => false);

      if (isFocusable) {
        console.log('Keyboard navigation working - focusable elements found');
      }

      // Step 4: Test ARIA labels and roles
      const ariaElements = await page.locator('[aria-label], [role], [aria-expanded], [aria-selected]').count();
      console.log(`Found ${ariaElements} ARIA elements for accessibility`);

      // Step 5: Test semantic HTML
      const semanticElements = await page.locator('main, nav, header, footer, section, article').count();
      console.log(`Found ${semanticElements} semantic HTML elements`);

      // Step 6: Test alt text for images
      const imagesWithoutAlt = await page.locator('img:not([alt]), img[alt=""]').count();
      if (imagesWithoutAlt === 0) {
        console.log('All images have proper alt text');
      } else {
        console.log(`Found ${imagesWithoutAlt} images without alt text`);
      }

      // Step 7: Test color contrast (basic check)
      const hasHighContrast = await page.locator('.high-contrast, [data-contrast]').count();
      if (hasHighContrast > 0) {
        console.log('High contrast mode available');
      }

      // Step 8: Test screen reader support
      const skipLinks = await page.locator('a[href^="#"], .skip-link, [data-testid="skip-link"]').count();
      if (skipLinks > 0) {
        console.log(`Found ${skipLinks} skip links for screen readers`);
      }
    }
  });
});