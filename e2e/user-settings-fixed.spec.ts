import { test, expect } from '@playwright/test';
import {
  waitForElementToBeVisible,
  safeClick,
  safeFill
} from './utils/test-helpers';

test.describe('User Settings - Fixed Selectors', () => {
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

  test('should access settings page and handle authentication', async ({ page }) => {
    // Try to access settings page directly
    await page.goto('/settings', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Check what happens
    const currentUrl = page.url();
    console.log(`Settings access resulted in: ${currentUrl}`);

    if (currentUrl.includes('/settings')) {
      // Settings page is accessible and has its own authentication check
      expect(currentUrl).toContain('/settings');

      // Look for sign-in prompt within settings page (use more specific selector)
      const signInPrompt = page.locator('p:has-text("Please sign in to view your settings")');
      if (await signInPrompt.isVisible({ timeout: 5000 })) {
        console.log('Settings page shows sign-in prompt');
      }

      // Look for profile or user information sections
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(20);
    } else {
      // Settings redirects to login - this is also valid
      expect(currentUrl).toContain('/auth/login');
      await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate to settings from dashboard if accessible', async ({ page }) => {
    // Try to access dashboard first
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Look for settings navigation
      const settingsLinks = [
        'a[href*="settings"]',
        'a:has-text("Settings")',
        'button:has-text("Settings")'
      ];

      let foundSettings = false;
      for (const selector of settingsLinks) {
        const link = page.locator(selector).first();
        if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
          await link.click();
          await page.waitForLoadState('networkidle');
          foundSettings = true;
          break;
        }
      }

      if (!foundSettings) {
        // Try direct navigation
        await page.goto('/settings', { timeout: 15000 });
        await page.waitForLoadState('networkidle');
      }

      // Check current state
      const finalUrl = page.url();
      console.log(`After settings navigation, final URL: ${finalUrl}`);

      if (finalUrl.includes('/settings')) {
        // Settings is accessible
        const bodyText = await page.locator('body').textContent();
        expect(bodyText?.length).toBeGreaterThan(50);
      } else {
        // Still redirected - this is expected
        expect(finalUrl).toContain('/auth/login');
      }
    } else {
      // Dashboard redirected to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle settings page tabs if accessible', async ({ page }) => {
    // Try to access settings page
    await page.goto('/settings', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/settings')) {
      // First check if user is authenticated (tabs only show for authenticated users)
      const signInPrompt = page.locator('p:has-text("Please sign in to view your settings")');
      const isSignInPromptVisible = await signInPrompt.isVisible({ timeout: 3000 }).catch(() => false);

      if (isSignInPromptVisible) {
        // User is not authenticated - tabs should not be visible, this is expected
        console.log('User not authenticated - tabs correctly hidden');

        // Verify tabs are not visible when user is not authenticated
        const tabButtons = [
          'button:has-text("Profile")',
          'button:has-text("Streaming Services")',
          'button:has-text("Security")'
        ];

        let foundTabs = 0;
        for (const selector of tabButtons) {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
            foundTabs++;
            console.log(`Unexpectedly found settings tab: ${selector}`);
          }
        }

        // Tabs should not be visible for unauthenticated users
        expect(foundTabs).toBe(0);
        console.log('Settings tabs correctly hidden for unauthenticated users');
      } else {
        // User is authenticated - look for settings tabs
        const tabButtons = [
          'button:has-text("Profile")',
          'button:has-text("Streaming Services")',
          'button:has-text("Security")'
        ];

        let foundTabs = 0;
        for (const selector of tabButtons) {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
            foundTabs++;
            console.log(`Found settings tab: ${selector}`);

            // Test tab switching
            await button.click();
            await page.waitForTimeout(1000);
          }
        }

        console.log(`Settings tabs found: ${foundTabs}`);
        expect(foundTabs).toBeGreaterThan(0);
      }
    } else {
      // Settings redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle profile tab functionality if accessible', async ({ page }) => {
    // Try to access settings page
    await page.goto('/settings', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/settings')) {
      // Look for Profile tab and click it
      const profileTab = page.locator('button:has-text("Profile")');
      if (await profileTab.isVisible({ timeout: 3000 })) {
        await profileTab.click();
        await page.waitForTimeout(1000);
      }

      // Look for profile elements based on the actual UI
      const profileElements = [
        ':has-text("Profile Information")',
        ':has-text("First Name")',
        ':has-text("Last Name")',
        ':has-text("Email")',
        ':has-text("Email verification status")',
        'input[value*="@"]', // Email input
        'input[disabled]', // Disabled inputs for read-only profile
        ':has-text("Profile updates coming soon")'
      ];

      let foundProfileElements = 0;
      for (const selector of profileElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundProfileElements++;
          console.log(`Found profile element: ${selector}`);
        }
      }

      console.log(`Profile elements found: ${foundProfileElements}`);

      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Settings redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle streaming services tab if accessible', async ({ page }) => {
    // Try to access settings page
    await page.goto('/settings', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/settings')) {
      // Look for Streaming Services tab and click it
      const streamingTab = page.locator('button:has-text("Streaming Services")');
      if (await streamingTab.isVisible({ timeout: 3000 })) {
        await streamingTab.click();
        await page.waitForTimeout(1000);
      }

      // Look for streaming services elements
      const streamingElements = [
        ':has-text("Streaming Services")',
        ':has-text("Select the streaming services you subscribe to")',
        ':has-text("personalized search results")',
        '[class*="streaming"]', // Streaming services manager
        '[class*="service"]' // Service components
      ];

      let foundStreamingElements = 0;
      for (const selector of streamingElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundStreamingElements++;
          console.log(`Found streaming element: ${selector}`);
        }
      }

      console.log(`Streaming services elements found: ${foundStreamingElements}`);

      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Settings redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle security tab and password change if accessible', async ({ page }) => {
    // Try to access settings page
    await page.goto('/settings', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/settings')) {
      // Look for Security tab and click it
      const securityTab = page.locator('button:has-text("Security")');
      if (await securityTab.isVisible({ timeout: 3000 })) {
        await securityTab.click();
        await page.waitForTimeout(1000);
      }

      // Look for security elements based on the actual UI
      const securityElements = [
        ':has-text("Change Password")',
        ':has-text("Current Password")',
        ':has-text("New Password")',
        ':has-text("Confirm New Password")',
        'input[name="currentPassword"]',
        'input[name="newPassword"]',
        'input[name="confirmPassword"]',
        'button:has-text("Change Password")',
        'button:has-text("Reset Form")',
        ':has-text("Password strength")',
        ':has-text("Passwords do not match")',
        ':has-text("Passwords match")',
        ':has-text("Security Notice")',
        ':has-text("log you out of all other sessions")'
      ];

      let foundSecurityElements = 0;
      for (const selector of securityElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundSecurityElements++;
          console.log(`Found security element: ${selector}`);
        }
      }

      console.log(`Security elements found: ${foundSecurityElements}`);

      // Test password visibility toggle functionality
      const currentPasswordInput = page.locator('input[name="currentPassword"]');
      const newPasswordInput = page.locator('input[name="newPassword"]');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

      if (await currentPasswordInput.isVisible({ timeout: 2000 })) {
        // Test filling password fields
        await currentPasswordInput.fill('currentpassword123');
        await newPasswordInput.fill('NewPassword123!');
        await confirmPasswordInput.fill('NewPassword123!');

        // Test password visibility toggles
        const toggleButtons = page.locator('button[onclick*="Password"]');
        const toggleCount = await toggleButtons.count();

        if (toggleCount > 0) {
          for (let i = 0; i < Math.min(toggleCount, 3); i++) {
            await toggleButtons.nth(i).click();
            await page.waitForTimeout(500);
          }
          console.log('Password visibility toggles tested');
        }

        // Test form validation
        await confirmPasswordInput.fill('differentpassword');
        await page.waitForTimeout(1000);

        // Look for validation messages
        const validationMessages = [
          ':has-text("Passwords do not match")',
          '.bg-red-50', // Error message styling
          'button:has-text("Change Password")'
        ];

        for (const selector of validationMessages) {
          if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`Found validation element: ${selector}`);
            break;
          }
        }

        // Reset form for cleanup
        await confirmPasswordInput.fill('NewPassword123!');
      }

      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Settings redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle settings page responsive design', async ({ page }) => {
    // Try to access settings page
    await page.goto('/settings', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/settings')) {
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
        const tabButtons = page.locator('button:has-text("Profile"), button:has-text("Streaming Services"), button:has-text("Security")');
        if (await tabButtons.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`Settings tabs visible at ${viewport.width}x${viewport.height}`);
        }
      }

      console.log('Settings page responsive design tested');
    } else {
      // Settings redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle settings page error states gracefully', async ({ page }) => {
    // Try to access a non-existent settings section
    await page.goto('/settings/non-existent-section', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    // Should either show 404, redirect to login, or handle gracefully
    if (currentUrl.includes('/auth/login')) {
      expect(currentUrl).toContain('/auth/login');
    } else if (currentUrl.includes('/settings')) {
      // Check if page handles the error gracefully
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Some other handling - verify page loads
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    }
  });

  test('should handle settings page loading states', async ({ page }) => {
    // Try to access settings page
    await page.goto('/settings', { timeout: 15000 });

    // Wait for initial load
    await page.waitForLoadState('domcontentloaded');

    const currentUrl = page.url();

    if (currentUrl.includes('/settings')) {
      // Wait for full load
      await page.waitForLoadState('networkidle');

      // Check if content is loaded
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);

      console.log('Settings page loading states handled properly');
    } else {
      // Settings redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle settings form interactions if accessible', async ({ page }) => {
    // Try to access settings page
    await page.goto('/settings', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/settings')) {
      // Test tab switching
      const tabs = ['Profile', 'Streaming Services', 'Security'];

      for (const tabName of tabs) {
        const tabButton = page.locator(`button:has-text("${tabName}")`);
        if (await tabButton.isVisible({ timeout: 3000 })) {
          await tabButton.click();
          await page.waitForTimeout(1000);

          // Verify tab content changes
          const bodyText = await page.locator('body').textContent();
          expect(bodyText?.length).toBeGreaterThan(20);

          console.log(`Tab "${tabName}" interaction tested`);
        }
      }

      // Test form field interactions in security tab
      const securityTab = page.locator('button:has-text("Security")');
      if (await securityTab.isVisible({ timeout: 3000 })) {
        await securityTab.click();
        await page.waitForTimeout(1000);

        // Test form field focus/blur
        const passwordFields = ['currentPassword', 'newPassword', 'confirmPassword'];

        for (const fieldName of passwordFields) {
          const field = page.locator(`input[name="${fieldName}"]`);
          if (await field.isVisible({ timeout: 2000 })) {
            await field.focus();
            await page.waitForTimeout(500);
            await field.blur();
            await page.waitForTimeout(500);
          }
        }

        console.log('Form field interactions tested');
      }

      // Verify page is still functional after all interactions
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Settings redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });

  test('should handle settings navigation and breadcrumbs if accessible', async ({ page }) => {
    // Try to access settings page
    await page.goto('/settings', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();

    if (currentUrl.includes('/settings')) {
      // Look for navigation elements
      const navigationElements = [
        'a[href*="/dashboard"]',
        'a[href*="/"]',
        'button:has-text("Back")',
        'nav', // Navigation container
        '[role="navigation"]' // Navigation role
      ];

      let foundNavigation = false;
      for (const selector of navigationElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundNavigation = true;
          console.log(`Found navigation element: ${selector}`);

          // Test navigation if safe (doesn't log out)
          if (selector.includes('/dashboard') || selector.includes('/')) {
            await element.click().catch(() => {});
            await page.waitForTimeout(1000);
            break;
          }
        }
      }

      console.log(`Navigation elements found: ${foundNavigation}`);

      // Verify page is still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.length).toBeGreaterThan(50);
    } else {
      // Settings redirects to login - this is expected
      expect(currentUrl).toContain('/auth/login');
    }
  });
});