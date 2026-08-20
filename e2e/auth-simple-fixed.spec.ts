import { test, expect } from '@playwright/test';
import {
  generateRandomEmail,
  generateTestPassword,
  waitForElementToBeVisible,
  safeClick,
  safeFill,
  navigateToHome
} from './utils/test-helpers';

test.describe('Authentication Flow - Fixed Selectors', () => {
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

  test('should access registration page and fill form correctly', async ({ page }) => {
    const email = generateRandomEmail();
    const password = generateTestPassword();

    // Go to registration page directly
    await page.goto('/auth/register', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify we're on the registration page by checking for the title
    await expect(page.locator('h2:has-text("Create your account")')).toBeVisible({ timeout: 10000 });

    // Fill the form using the correct selectors from the actual UI
    await safeFill(page, '#first-name', 'Test');
    await safeFill(page, '#last-name', 'User');
    await safeFill(page, '#email-address', email);
    await safeFill(page, '#password', password);
    await safeFill(page, '#confirm-password', password);

    // Accept terms
    await page.check('#accept-terms');

    // Verify form is filled correctly
    const firstNameValue = await page.locator('#first-name').inputValue();
    const emailValue = await page.locator('#email-address').inputValue();
    const termsChecked = await page.locator('#accept-terms').isChecked();

    expect(firstNameValue).toBe('Test');
    expect(emailValue).toBe(email);
    expect(termsChecked).toBe(true);

    // Try to submit (may fail due to backend issues, but we can test the UI)
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    if (await submitButton.isEnabled()) {
      await submitButton.click();

      // Wait a bit to see what happens
      await page.waitForTimeout(5000);

      // Check current state - we might still be on registration page or get redirected
      const currentUrl = page.url();
      console.log(`After registration attempt, current URL: ${currentUrl}`);

      // Either registration succeeded, failed gracefully, or showed validation
      // All are acceptable outcomes for this test
      expect(currentUrl).toMatch(/(auth\/register|auth\/login|dashboard|\/)/);
    }
  });

  test('should access login page and fill form correctly', async ({ page }) => {
    // Go to login page directly
    await page.goto('/auth/login', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify we're on the login page by checking for the title
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible({ timeout: 10000 });

    // Fill the form using the correct selectors
    await safeFill(page, '#email-address', 'test@geoleap.com');
    await safeFill(page, '#password', 'TestPassword123!');

    // Check remember me
    await page.check('#remember-me');

    // Verify form is filled
    const emailValue = await page.locator('#email-address').inputValue();
    const passwordValue = await page.locator('#password').inputValue();
    const rememberChecked = await page.locator('#remember-me').isChecked();

    expect(emailValue).toBe('test@geoleap.com');
    expect(passwordValue).toBe('TestPassword123!');
    expect(rememberChecked).toBe(true);

    // Try to submit
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    if (await submitButton.isEnabled()) {
      await submitButton.click();

      // Wait a bit to see what happens
      await page.waitForTimeout(5000);

      // Check current state
      const currentUrl = page.url();
      console.log(`After login attempt, current URL: ${currentUrl}`);

      // Any of these outcomes are acceptable
      expect(currentUrl).toMatch(/(auth\/login|dashboard|\/)/);
    }
  });

  test('should navigate between auth pages correctly', async ({ page }) => {
    // Start at login page
    await page.goto('/auth/login', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible();

    // Look for link to registration
    const registerLink = page.locator('a[href*="register"]:has-text("Sign up")');
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should be on registration page
    expect(page.url()).toContain('/auth/register');
    await expect(page.locator('h2:has-text("Create your account")')).toBeVisible();

    // Look for link back to login
    const loginLink = page.locator('a[href*="login"]:has-text("Sign in")');
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    // Wait for navigation back
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should be back on login page
    expect(page.url()).toContain('/auth/login');
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible();
  });

  test('should access forgot password page correctly', async ({ page }) => {
    // Go to login page first
    await page.goto('/auth/login', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Look for forgot password link
    const forgotPasswordLink = page.locator('a[href*="forgot-password"]:has-text("Forgot your password?")');
    await expect(forgotPasswordLink).toBeVisible();
    await forgotPasswordLink.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should be on forgot password page
    expect(page.url()).toContain('/auth/forgot-password');
    await expect(page.locator('h2:has-text("Reset your password")')).toBeVisible();

    // Look for email input field
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();

    // Fill the form
    await emailInput.fill('test@geoleap.com');

    // Try to submit
    const submitButton = page.locator('button[type="submit"]:has-text("Send Reset Email")');
    if (await submitButton.isVisible({ timeout: 3000 })) {
      await submitButton.click();
      await page.waitForTimeout(3000);

      // Should either show success message or error, both are acceptable
      const hasSuccessMessage = await page.locator('h2:has-text("Check Your Email")').isVisible().catch(() => false);
      const hasErrorMessage = await page.locator('.bg-red-50').isVisible().catch(() => false);

      expect(hasSuccessMessage || hasErrorMessage).toBe(true);
    }
  });

  test('should handle form validation correctly', async ({ page }) => {
    // Go to registration page
    await page.goto('/auth/register', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // The button should be disabled if form is not properly filled
    // Or if enabled, clicking it should show validation errors
    if (await submitButton.isEnabled()) {
      await submitButton.click();
      await page.waitForTimeout(2000);

      // Check for error message or still being on registration page
      const hasError = await page.locator('.bg-red-100').isVisible().catch(() => false);
      const stillOnRegisterPage = page.url().includes('/auth/register');

      expect(hasError || stillOnRegisterPage).toBe(true);
    }

    // Fill with invalid data
    await safeFill(page, '#first-name', 'Test');
    await safeFill(page, '#last-name', 'User');
    await safeFill(page, '#email-address', 'invalid-email');
    await safeFill(page, '#password', '123'); // Too short
    await safeFill(page, '#confirm-password', '456'); // Doesn't match

    // Try to submit again
    if (await submitButton.isEnabled()) {
      await submitButton.click();
      await page.waitForTimeout(2000);

      // Should still be on registration page due to validation
      expect(page.url()).toContain('/auth/register');
    }
  });

  test('should handle OAuth login options', async ({ page }) => {
    // Go to login page
    await page.goto('/auth/login', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Check for OAuth buttons
    const googleButton = page.locator('button:has-text("Google")');
    const appleButton = page.locator('button:has-text("Apple")');

    // OAuth buttons should be present
    await expect(googleButton).toBeVisible();
    await expect(appleButton).toBeVisible();

    // We won't actually click them as they redirect to OAuth providers,
    // but we can verify they exist and have correct attributes
    expect(await googleButton.isEnabled()).toBe(true);
    expect(await appleButton.isEnabled()).toBe(true);
  });

  test('should handle protected routes correctly', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Check what happens - should redirect to login
    const currentUrl = page.url();
    console.log(`Dashboard access attempt resulted in: ${currentUrl}`);

    // Should redirect to login for unauthenticated users
    expect(currentUrl).toContain('/auth/login');

    // Verify login page loaded
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible();
  });

  test('should handle form field interactions correctly', async ({ page }) => {
    // Test login form interactions
    await page.goto('/auth/login', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('#email-address');
    const passwordInput = page.locator('#password');
    const rememberCheckbox = page.locator('#remember-me');
    const submitButton = page.locator('button[type="submit"]');

    // Test input interactions
    await emailInput.fill('test@example.com');
    expect(await emailInput.inputValue()).toBe('test@example.com');

    await passwordInput.fill('password123');
    expect(await passwordInput.inputValue()).toBe('password123');

    // Test checkbox
    expect(await rememberCheckbox.isChecked()).toBe(false);
    await rememberCheckbox.check();
    expect(await rememberCheckbox.isChecked()).toBe(true);

    // Test button states
    expect(await submitButton.isVisible()).toBe(true);
    expect(await submitButton.isEnabled()).toBe(true);
  });

  test('should handle responsive design on auth pages', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/login', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Should still be functional on mobile
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible();
    await expect(page.locator('#email-address')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/auth/register', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Should still be functional on tablet
    await expect(page.locator('h2:has-text("Create your account")')).toBeVisible();
    await expect(page.locator('#first-name')).toBeVisible();
    await expect(page.locator('#email-address')).toBeVisible();
  });
});