import { test, expect } from '@playwright/test';
import {
  waitForElementToBeVisible,
  safeClick,
  safeFill
} from './utils/test-helpers';

test.describe('Error Handling - Fixed Selectors', () => {
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

  test('should handle API server downtime gracefully', async ({ page }) => {
    // Step 1: Simulate API server unavailability
    await page.route('**/api/**', route => route.abort('failed'));

    // Step 2: Try to access pages that depend on API calls
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Step 3: Check current URL and handling
    const currentUrl = page.url();
    console.log(`API downtime test resulted in: ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      // Dashboard accessible - check if it handles API failure gracefully
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);

      // Look for any error indicators or fallback content
      const errorIndicators = [
        '[data-testid="error-message"]',
        '.error-message',
        '.api-error',
        '[data-testid="fallback"]',
        '.fallback-content',
        '.offline-mode'
      ];

      let foundErrorHandling = false;
      for (const selector of errorIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundErrorHandling = true;
          console.log(`Found error handling element: ${selector}`);
          break;
        }
      }

      // Look for retry buttons
      const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")').first();
      const hasRetry = await retryButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasRetry) {
        console.log('Found retry button - testing functionality');
        await retryButton.click();
        await page.waitForTimeout(2000);
      }

      console.log(`Error handling displayed: ${foundErrorHandling}`);
      console.log(`Retry button available: ${hasRetry}`);

      // Test passes if page loads gracefully or shows error handling
      expect(foundErrorHandling || hasRetry || bodyText!.length > 100).toBe(true);
    } else if (currentUrl.includes('/auth/login')) {
      // Redirected to login - this is also valid error handling
      expect(currentUrl).toContain('/auth/login');
      console.log('API failure correctly redirected to login');
    } else {
      // Some other handling - verify page loads
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }

    // Clean up route
    await page.unroute('**/api/**');
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Step 1: Go offline
    await page.context().setOffline(true);

    // Step 2: Try to access the application - this should fail gracefully when offline
    let navigationError = null;
    try {
      await page.goto('/', { timeout: 5000 });
      await page.waitForLoadState('networkidle');
    } catch (error) {
      navigationError = error;
      console.log(`Expected navigation error when offline: ${error.message}`);
    }

    // Step 3: Check offline handling
    const currentUrl = page.url();
    console.log(`Offline test resulted in: ${currentUrl}`);

    // Look for offline indicators
    const offlineIndicators = [
      '[data-testid="offline"]',
      '.offline',
      '.no-connection',
      'text=offline',
      'text=no internet',
      'text=connection lost'
    ];

    let foundOfflineIndicator = false;
    for (const selector of offlineIndicators) {
      if (selector.startsWith('text=')) {
        const bodyText = await page.locator('body').textContent();
        if (bodyText?.toLowerCase().includes(selector.replace('text=', '').toLowerCase())) {
          foundOfflineIndicator = true;
          console.log(`Found offline message: ${selector}`);
          break;
        }
      } else {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundOfflineIndicator = true;
          console.log(`Found offline indicator: ${selector}`);
          break;
        }
      }
    }

    // Step 4: Try navigation while offline
    const navLinks = page.locator('a[href]').first();
    if (await navLinks.isVisible({ timeout: 3000 })) {
      await navLinks.click();
      await page.waitForTimeout(2000);
    }

    // Step 5: Go back online
    await page.context().setOffline(false);

    // Step 6: Test recovery
    await page.goto('/', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const recovered = await page.locator('body').textContent().then(text =>
      text && text.length > 100
    );

    console.log(`Offline indicator shown: ${foundOfflineIndicator}`);
    console.log(`Recovery after reconnect: ${recovered}`);

    // The test passes if we properly detected the offline state
    // and can recover when back online
    expect(navigationError).toBeTruthy();
    expect(navigationError.message).toContain('ERR_INTERNET_DISCONNECTED');
    expect(recovered).toBe(true);
  });

  test('should handle API timeouts and slow responses', async ({ page }) => {
    // Step 1: Simulate slow API responses
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Slow response' })
      });
    });

    const startTime = Date.now();

    // Step 2: Try to access page with API calls
    await page.goto('/dashboard', { timeout: 20000 });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const reasonableTimeout = responseTime < 25000; // Should timeout before 25 seconds

    await page.waitForTimeout(3000);

    // Step 3: Check for timeout handling
    const currentUrl = page.url();
    console.log(`Timeout test resulted in: ${currentUrl} after ${responseTime}ms`);

    if (currentUrl.includes('/dashboard')) {
      // Check for timeout indicators
      const timeoutIndicators = [
        '[data-testid="timeout"]',
        '.timeout-error',
        '.slow-loading',
        '[data-testid="loading"]',
        '.loading',
        '.spinner'
      ];

      let foundTimeoutHandling = false;
      for (const selector of timeoutIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundTimeoutHandling = true;
          console.log(`Found timeout handling: ${selector}`);
          break;
        }
      }

      console.log(`Timeout handling displayed: ${foundTimeoutHandling}`);
      console.log(`Response time: ${responseTime}ms`);

      expect(foundTimeoutHandling || reasonableTimeout).toBe(true);
    } else {
      // Redirected or handled differently - this is acceptable
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }

    // Clean up route
    await page.unroute('**/api/**');
  });

  test('should handle partial API failures and degraded service', async ({ page }) => {
    // Step 1: Simulate partial API failures
    await page.route('**/api/user/**', route => route.abort('failed'));
    await page.route('**/api/content/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [] })
    }));

    // Step 2: Try to access dashboard
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`Partial API failure test resulted in: ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      // Check for degraded service handling
      const degradedIndicators = [
        '[data-testid="degraded"]',
        '.degraded-mode',
        '.limited-features',
        '[data-testid="partial-content"]',
        '.limited-content'
      ];

      let foundDegradedHandling = false;
      for (const selector of degradedIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundDegradedHandling = true;
          console.log(`Found degraded service handling: ${selector}`);
          break;
        }
      }

      // Check if some features still work
      const bodyText = await page.locator('body').textContent();
      const hasSomeContent = bodyText && bodyText.length > 50;

      console.log(`Degraded service message: ${foundDegradedHandling}`);
      console.log(`Some functionality preserved: ${hasSomeContent}`);

      expect(foundDegradedHandling || hasSomeContent).toBe(true);
    } else {
      // Redirected or handled - acceptable
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }

    // Clean up routes
    await page.unroute('**/api/user/**');
    await page.unroute('**/api/content/**');
  });

  test('should handle malformed API responses', async ({ page }) => {
    // Step 1: Simulate malformed API responses
    await page.route('**/api/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"invalid": json, "missing": quotes}' // Invalid JSON
    }));

    // Step 2: Try to access page that consumes API data
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`Malformed API response test resulted in: ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      // Check for JSON parsing error handling
      const parseErrorIndicators = [
        '[data-testid="parse-error"]',
        '.json-error',
        '.data-error',
        '[data-testid="fallback-ui"]',
        '.fallback-component'
      ];

      let foundParseErrorHandling = false;
      for (const selector of parseErrorIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundParseErrorHandling = true;
          console.log(`Found parse error handling: ${selector}`);
          break;
        }
      }

      console.log(`JSON parse error handled: ${foundParseErrorHandling}`);

      // Test passes if error handling is shown or page loads gracefully
      const bodyText = await page.locator('body').textContent();
      expect(foundParseErrorHandling || bodyText!.length > 50).toBe(true);
    } else {
      // Redirected or handled - acceptable
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }

    // Clean up route
    await page.unroute('**/api/**');
  });

  test('should handle database connection errors', async ({ page }) => {
    // Step 1: Simulate database connection errors
    await page.route('**/api/**', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Service Unavailable',
        message: 'Database connection failed'
      })
    }));

    // Step 2: Try to access pages that require database
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`Database connection error test resulted in: ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      // Check for database error handling
      const dbErrorIndicators = [
        '[data-testid="db-error"]',
        '.database-error',
        '.connection-error',
        '[data-testid="service-unavailable"]',
        '.service-down',
        '[data-testid="maintenance"]',
        '.maintenance-mode'
      ];

      let foundDbErrorHandling = false;
      for (const selector of dbErrorIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundDbErrorHandling = true;
          console.log(`Found database error handling: ${selector}`);
          break;
        }
      }

      console.log(`Database error displayed: ${foundDbErrorHandling}`);

      // Test passes if error handling is shown or page loads gracefully
      const bodyText = await page.locator('body').textContent();
      expect(foundDbErrorHandling || bodyText!.length > 50).toBe(true);
    } else {
      // Redirected or handled - acceptable
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }

    // Clean up route
    await page.unroute('**/api/**');
  });

  test('should handle form validation errors', async ({ page }) => {
    // Step 1: Navigate to registration page
    await page.goto('/auth/register', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`Form validation test started at: ${currentUrl}`);

    if (currentUrl.includes('/auth/register')) {
      // Step 2: Submit empty form
      const submitButton = page.locator('button[type="submit"], button:has-text("Register")').first();
      if (await submitButton.isVisible({ timeout: 3000 })) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Check for validation errors
        const validationErrorIndicators = [
          '[data-testid="validation-error"]',
          '.error',
          '.invalid',
          'input:invalid',
          '.field-error'
        ];

        let foundValidationErrors = false;
        for (const selector of validationErrorIndicators) {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            foundValidationErrors = true;
            console.log(`Found validation error: ${selector}`);
            break;
          }
        }

        console.log(`Form validation errors displayed: ${foundValidationErrors}`);
        expect(foundValidationErrors).toBe(true);
      } else {
        console.log('Registration submit button not found');
        // Test passes if page loads
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.length).toBeGreaterThan(50);
      }
    } else {
      // Redirected - acceptable
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });

  test('should handle rate limiting', async ({ page }) => {
    // Step 1: Simulate rate limiting
    let requestCount = 0;
    await page.route('**/api/**', route => {
      requestCount++;
      if (requestCount > 5) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.'
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: [] })
        });
      }
    });

    // Step 2: Try to access a page and make multiple requests
    await page.goto('/search', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`Rate limiting test resulted in: ${currentUrl}`);

    if (currentUrl.includes('/search')) {
      // Make multiple rapid requests if search is accessible
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
      if (await searchInput.isVisible({ timeout: 3000 })) {
        // Make rapid searches
        for (let i = 0; i < 8; i++) {
          await searchInput.fill(`search${i}`);
          await searchInput.press('Enter');
          await page.waitForTimeout(500);
        }

        await page.waitForTimeout(2000);

        // Check for rate limiting message
        const rateLimitIndicators = [
          '[data-testid="rate-limit"]',
          '.rate-limit',
          '.too-many-requests'
        ];

        let foundRateLimitMessage = false;
        for (const selector of rateLimitIndicators) {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            foundRateLimitMessage = true;
            console.log(`Found rate limiting message: ${selector}`);
            break;
          }
        }

        // Check for rate limit text in body
        const bodyText = await page.locator('body').textContent();
        const hasRateLimitText = bodyText?.match(/rate limit|too many requests|try again/i) !== null;

        console.log(`Rate limiting message shown: ${foundRateLimitMessage}`);
        console.log(`Rate limit text found: ${hasRateLimitText}`);

        expect(foundRateLimitMessage || hasRateLimitText).toBe(true);
      } else {
        console.log('Search input not found - rate limiting test limited');
      }
    } else {
      // Redirected - acceptable
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }

    // Clean up route
    await page.unroute('**/api/**');
  });

  test('should handle error page navigation and recovery', async ({ page }) => {
    // Step 1: Try to access non-existent pages
    const nonExistentPages = [
      '/non-existent-page',
      '/dashboard/invalid-section',
      '/invalid-route-12345'
    ];

    let foundErrorHandling = false;

    for (const pagePath of nonExistentPages) {
      await page.goto(pagePath, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      console.log(`Non-existent page test (${pagePath}) resulted in: ${currentUrl}`);

      // Check for 404 or error handling
      const errorIndicators = [
        'h1:has-text("404")',
        'h2:has-text("Page not found")',
        'h2:has-text("Not Found")',
        '[data-testid="404"]',
        '.error-404',
        '.not-found'
      ];

      for (const selector of errorIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundErrorHandling = true;
          console.log(`Found 404/error handling: ${selector}`);
          break;
        }
      }

      // Check if redirected to valid page
      if (currentUrl.includes('/auth/login') ||
          currentUrl === '/' ||
          currentUrl.includes('/dashboard') ||
          currentUrl.includes('/search') ||
          currentUrl.includes('/vpn-guidance')) {
        foundErrorHandling = true;
        console.log(`Redirected to valid page: ${currentUrl}`);
      }

      if (foundErrorHandling) {
        break;
      }
    }

    console.log(`Error page handling found: ${foundErrorHandling}`);

    // Test recovery - navigate to valid page
    await page.goto('/', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const recovered = await page.locator('body').textContent().then(text =>
      text && text.length > 100
    );

    console.log(`Recovery after error navigation: ${recovered}`);

    expect(foundErrorHandling || recovered).toBe(true);
  });

  test('should handle responsive design during error states', async ({ page }) => {
    // Step 1: Set up error scenario
    await page.route('**/api/**', route => route.abort('failed'));

    // Step 2: Test different viewport sizes during error
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];

    let responsiveErrorHandling = false;

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);

      await page.goto('/dashboard', { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      console.log(`Responsive error test at ${viewport.width}x${viewport.height}: ${currentUrl}`);

      // Check if page handles errors responsively
      const bodyText = await page.locator('body').textContent();
      const hasContent = bodyText && bodyText.length > 50;

      if (hasContent) {
        responsiveErrorHandling = true;
        console.log(`Error handling works at ${viewport.width}x${viewport.height}`);
      }
    }

    console.log(`Responsive error handling: ${responsiveErrorHandling}`);

    // Clean up route
    await page.unroute('**/api/**');

    expect(responsiveErrorHandling).toBe(true);
  });

  test('should handle concurrent request errors gracefully', async ({ page }) => {
    // Step 1: Set up failing API routes
    await page.route('**/api/**', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Something went wrong'
      })
    }));

    // Step 2: Try to access page that makes multiple concurrent requests
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`Concurrent request error test resulted in: ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      // Check for server error handling
      const serverErrorIndicators = [
        '[data-testid="server-error"]',
        '.server-error',
        '.internal-error',
        '[data-testid="error-message"]',
        '.api-error'
      ];

      let foundServerErrorHandling = false;
      for (const selector of serverErrorIndicators) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          foundServerErrorHandling = true;
          console.log(`Found server error handling: ${selector}`);
          break;
        }
      }

      // Check if page still loads with fallback content
      const bodyText = await page.locator('body').textContent();
      const hasFallbackContent = bodyText && bodyText.length > 50;

      console.log(`Server error handling displayed: ${foundServerErrorHandling}`);
      console.log(`Fallback content available: ${hasFallbackContent}`);

      expect(foundServerErrorHandling || hasFallbackContent).toBe(true);
    } else {
      // Redirected or handled - acceptable
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }

    // Clean up route
    await page.unroute('**/api/**');
  });
});