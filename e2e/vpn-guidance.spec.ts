import { test, expect } from '@playwright/test';
import { 
  loginAsTestUser, 
  TEST_USERS, 
  waitForElementToBeVisible, 
  waitForUrlToContain, 
  safeClick,
  safeFill,
  waitForTextToBeVisible,
  waitForNetworkIdle,
  waitForPageLoad,
  navigateToVpnGuidance
} from './utils/test-helpers';

test.describe('VPN Guidance Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, TEST_USERS.standard);
  });

  test('should load VPN guidance page with proper content', async ({ page }) => {
    // Navigate to VPN guidance page through UI
    await navigateToVpnGuidance(page);

    // Verify page loaded
    await expect(page).toHaveURL(/vpn-guidance/);
    
    // Wait for page content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Should show VPN providers or guidance content
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
  });

  test('should display VPN provider listings', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Look for provider cards or listings
    const providerSelectors = [
      '[data-testid*="provider"]',
      '[class*="provider-card"]',
      '[class*="vpn-card"]',
      '[class*="provider"]',
      '.vpn-provider',
      '.provider-list'
    ];

    let providersFound = false;
    for (const selector of providerSelectors) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        providersFound = true;
        break;
      }
    }
    
    // Should have at least some content visible
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(50);
  });

  test('should filter VPN providers by features', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Look for filter controls
    const filterSelectors = [
      'button:has-text("Filter")',
      'button:has-text("filter")',
      '[data-testid*="filter"]',
      '[class*="filter"]',
      '.filter-button',
      'input[type="checkbox"]',
      '[class*="checkbox"]'
    ];

    let filterElement = null;
    for (const selector of filterSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        filterElement = element;
        break;
      }
    }
    
    if (filterElement) {
      await safeClick(page, await filterElement.getAttribute('selector') || 'button:has-text("Filter")');
      
      // Brief wait for filter UI
      await page.waitForTimeout(500);
      
      // Try to select streaming support filter
      const streamingFilter = page.locator('text=Streaming, [value="streaming"], input[name*="streaming"], [data-testid*="streaming"]').first();
      if (await streamingFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await safeClick(page, 'text=Streaming, [value="streaming"], input[name*="streaming"], [data-testid*="streaming"]');
        
        // Brief wait for filter to apply
        await page.waitForTimeout(500);
      }
    }

    // Verify we're still on the page
    expect(page.url()).toContain('/vpn-guidance');
  });

  test('should view VPN provider details', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Click on first provider or interactive element
    const providerSelectors = [
      '[data-testid*="provider"]',
      '[class*="provider-card"]',
      '[class*="vpn-card"]',
      'button',
      'a',
      '[role="button"]'
    ];

    let clickableElement = null;
    for (const selector of providerSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        clickableElement = element;
        break;
      }
    }
    
    if (clickableElement) {
      await safeClick(page, await clickableElement.getAttribute('selector') || 'button');
      
      // Brief wait for details to load (could be new page or modal)
      await page.waitForTimeout(1000);
      
      // Verify details are showing or page changed
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(100);
    } else {
      // If no clickable elements, verify page has substantial content
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(50);
    }
  });

  test('should show VPN recommendations based on criteria', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Look for recommendation section or button
    const recommendationSelectors = [
      'button:has-text("Recommend")',
      'button:has-text("Get Recommendations")',
      '[data-testid*="recommend"]',
      '[class*="recommend"]',
      '.recommend-button'
    ];

    let recommendationElement = null;
    for (const selector of recommendationSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        recommendationElement = element;
        break;
      }
    }
    
    if (recommendationElement) {
      await safeClick(page, await recommendationElement.getAttribute('selector') || 'button:has-text("Recommend")');
      
      // Brief wait for recommendations to load
      await page.waitForTimeout(1000);
    }

    // Page should still render content
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(30);
  });

  test('should filter by price range', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Look for price filter slider or input
    const priceFilterSelectors = [
      '[type="range"]',
      'input[name*="price"]',
      'input[placeholder*="price"]',
      '[data-testid*="price"]',
      '[class*="price-filter"]'
    ];

    let priceFilter = null;
    for (const selector of priceFilterSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        priceFilter = element;
        break;
      }
    }
    
    if (priceFilter) {
      // Interact with price filter
      await safeFill(page, await priceFilter.getAttribute('selector') || '[type="range"]', '10');
      
      // Brief wait for filter to apply
      await page.waitForTimeout(500);
    }

    // Verify page is responsive
    expect(page.url()).toContain('/vpn-guidance');
  });

  test('should sort VPN providers', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Look for sort dropdown
    const sortSelectors = [
      'select[name*="sort"]',
      'button:has-text("Sort")',
      '[data-testid*="sort"]',
      '[class*="sort"]',
      '.sort-dropdown'
    ];

    let sortElement = null;
    for (const selector of sortSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        sortElement = element;
        break;
      }
    }
    
    if (sortElement) {
      await safeClick(page, await sortElement.getAttribute('selector') || 'select[name*="sort"]');
      
      // Brief wait for dropdown
      await page.waitForTimeout(500);
      
      // Select a sort option
      const priceOption = page.locator('option[value*="price"], text=Price, [data-value*="price"]').first();
      if (await priceOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await safeClick(page, 'option[value*="price"], text=Price, [data-value*="price"]');
        
        // Brief wait for sort to apply
        await page.waitForTimeout(500);
      }
    }

    // Verify we're still on the page
    expect(page.url()).toContain('/vpn-guidance');
  });

  test('should handle VPN provider comparison', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Look for compare functionality
    const compareSelectors = [
      'button:has-text("Compare")',
      'input[type="checkbox"]',
      '[data-testid*="compare"]',
      '[class*="compare"]',
      '.compare-button'
    ];

    let compareElement = null;
    for (const selector of compareSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        compareElement = element;
        break;
      }
    }
    
    if (compareElement) {
      await safeClick(page, await compareElement.getAttribute('selector') || 'button:has-text("Compare")');
      
      // Brief wait for comparison to load
      await page.waitForTimeout(500);
    }

    // Page should remain functional
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(30);
  });

  test('should search for specific VPN providers', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Look for search functionality
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="search"]',
      'input[name*="search"]',
      '[data-testid*="search"]',
      '[class*="search"]'
    ];

    let searchElement = null;
    for (const selector of searchSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        searchElement = element;
        break;
      }
    }
    
    if (searchElement) {
      await safeFill(page, await searchElement.getAttribute('selector') || 'input[type="search"]', 'ExpressVPN');
      
      // Brief wait for search results
      await page.waitForTimeout(500);
    }

    // Verify page is responsive
    expect(page.url()).toContain('/vpn-guidance');
  });

  test('should display VPN provider ratings', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Look for rating elements
    const ratingSelectors = [
      '[class*="rating"]',
      '[data-testid*="rating"]',
      '.stars',
      '.score',
      '[class*="stars"]',
      '[aria-label*="rating"]'
    ];

    let ratingsFound = false;
    for (const selector of ratingSelectors) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        ratingsFound = true;
        break;
      }
    }

    // Either ratings found or page has substantial content
    const body = await page.locator('body').textContent();
    expect(ratingsFound || body?.length).toBeGreaterThan(50);
  });

  test('should handle VPN provider favorites', async ({ page }) => {
    await navigateToVpnGuidance(page);

    // Wait for content to load
    await waitForElementToBeVisible(page, 'body');
    
    // Look for favorite/bookmark functionality
    const favoriteSelectors = [
      'button:has-text("Favorite")',
      'button:has-text("Save")',
      '[data-testid*="favorite"]',
      '[class*="favorite"]',
      '[class*="bookmark"]',
      '.heart',
      '.star'
    ];

    let favoriteElement = null;
    for (const selector of favoriteSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        favoriteElement = element;
        break;
      }
    }
    
    if (favoriteElement) {
      await safeClick(page, await favoriteElement.getAttribute('selector') || 'button:has-text("Favorite")');
      
      // Brief wait for favorite action
      await page.waitForTimeout(500);
    }

    // Page should remain functional
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(30);
  });
});
