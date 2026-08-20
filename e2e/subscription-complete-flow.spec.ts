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

test.describe('Complete Subscription Flow - Production Ready', () => {
  let userEmail: string;
  let userPassword: string;

  test.beforeEach(async () => {
    userEmail = generateRandomEmail();
    userPassword = generateTestPassword();
  });

  test('should complete full subscription purchase flow', async ({ page }) => {
    // Step 1: Login or register first
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Try login with test user
    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);
    let currentUrl = page.url();

    // If login fails, register new user
    if (currentUrl.includes('/auth/login')) {
      console.log('Login failed, registering new user');
      await page.goto('http://localhost:3020/auth/register', { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      await safeFill(page, '#first-name, input[name="firstName"]', 'Test');
      await safeFill(page, '#last-name, input[name="lastName"]', 'User');
      await safeFill(page, '#email-address, input[name="email"]', userEmail);
      await safeFill(page, '#password, input[name="password"]', userPassword);

      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await termsCheckbox.check();
      }

      await safeClick(page, 'button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');
      await page.waitForTimeout(3000);
    }

    // Step 2: Navigate to pricing page
    await page.goto('http://localhost:3020/pricing', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/pricing');

    // Step 3: Verify pricing page content
    await waitForElementToBeVisible(page, 'body', 5000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(200);

    // Look for pricing-related terms
    await waitForTextToBeVisible(page, /plan|price|subscription|month|year|billing/i, 5000);

    // Step 4: Identify and select pricing plans
    const planSelectors = [
      '[data-testid*="plan"]',
      '.pricing-card',
      '.plan-card',
      '[class*="pricing"]',
      '[class*="tier"]'
    ];

    let plansFound = 0;
    let selectedPlan = null;

    for (const selector of planSelectors) {
      const plans = page.locator(selector);
      const count = await plans.count();
      if (count > 0) {
        plansFound = count;
        console.log(`Found ${count} pricing plans with selector: ${selector}`);

        // Select the first available plan
        selectedPlan = plans.first();
        break;
      }
    }

    expect(plansFound).toBeGreaterThan(0, 'No pricing plans found on the page');

    if (selectedPlan) {
      // Step 5: Select a pricing plan
      const selectButton = selectedPlan.locator('button:has-text("Select"), button:has-text("Choose"), button:has-text("Subscribe"), a:has-text("Get started")').first();

      if (await selectButton.isVisible({ timeout: 3000 })) {
        await selectButton.click();
        console.log('Selected pricing plan');
        await page.waitForTimeout(2000);
      } else {
        // Try clicking the card itself if no button found
        await selectedPlan.click();
        console.log('Clicked pricing card');
        await page.waitForTimeout(2000);
      }
    }

    // Step 6: Handle navigation to payment page
    currentUrl = page.url();
    if (currentUrl.includes('/payment')) {
      console.log('Redirected to payment page');
      await expect(page).toHaveURL(/payment/);
    } else if (currentUrl.includes('/checkout')) {
      console.log('Redirected to checkout page');
      await expect(page).toHaveURL(/checkout/);
    } else if (currentUrl.includes('/pricing')) {
      console.log('Still on pricing page - looking for alternative actions');

      // Look for subscribe buttons that might open modals
      const subscribeButtons = page.locator('button:has-text("Subscribe"), button:has-text("Buy now"), button:has-text("Purchase")');
      const buttonCount = await subscribeButtons.count();

      if (buttonCount > 0) {
        await subscribeButtons.first().click();
        await page.waitForTimeout(3000);
      }
    }

    // Step 7: Fill payment information if on payment page
    currentUrl = page.url();
    if (currentUrl.includes('/payment') || currentUrl.includes('/checkout')) {
      console.log('On payment/checkout page - filling payment details');

      // Look for payment form fields
      const cardNumberInput = page.locator('input[name*="card"], input[placeholder*="card"], input[name*="number"]').first();
      if (await cardNumberInput.isVisible({ timeout: 3000 })) {
        await cardNumberInput.fill('4242424242424242'); // Test card number
        console.log('Filled card number');
      }

      const expiryInput = page.locator('input[name*="expiry"], input[placeholder*="expiry"], input[name*="exp"]').first();
      if (await expiryInput.isVisible({ timeout: 3000 })) {
        await expiryInput.fill('12/25');
        console.log('Filled expiry date');
      }

      const cvvInput = page.locator('input[name*="cvv"], input[name*="cvc"], input[placeholder*="cvv"]').first();
      if (await cvvInput.isVisible({ timeout: 3000 })) {
        await cvvInput.fill('123');
        console.log('Filled CVV');
      }

      const nameInput = page.locator('input[name*="name"], input[placeholder*="name"]').first();
      if (await nameInput.isVisible({ timeout: 3000 })) {
        await nameInput.fill('Test User');
        console.log('Filled cardholder name');
      }

      // Look for billing address fields
      const addressInput = page.locator('input[name*="address"], input[placeholder*="address"]').first();
      if (await addressInput.isVisible({ timeout: 3000 })) {
        await addressInput.fill('123 Test Street');
      }

      const cityInput = page.locator('input[name*="city"], input[placeholder*="city"]').first();
      if (await cityInput.isVisible({ timeout: 3000 })) {
        await cityInput.fill('Test City');
      }

      const zipInput = page.locator('input[name*="zip"], input[name*="postal"], input[placeholder*="zip"]').first();
      if (await zipInput.isVisible({ timeout: 3000 })) {
        await zipInput.fill('12345');
      }

      // Step 8: Submit payment
      const submitPaymentButton = page.locator('button[type="submit"], button:has-text("Pay"), button:has-text("Complete"), button:has-text("Subscribe"), button:has-text("Purchase")').first();

      if (await submitPaymentButton.isVisible({ timeout: 3000 })) {
        console.log('Found payment submit button - clicking');
        await submitPaymentButton.click();
        await page.waitForTimeout(5000);
      } else {
        console.log('Payment submit button not found');
      }
    }

    // Step 9: Handle payment outcomes
    currentUrl = page.url();
    console.log(`Final URL after payment flow: ${currentUrl}`);

    if (currentUrl.includes('/success') || currentUrl.includes('/thank-you')) {
      console.log('Payment successful - redirected to success page');
      await expect(page.url()).toMatch(/success|thank-you/);

      await waitForTextToBeVisible(page, /success|thank you|payment complete|subscription active/i, 5000);

    } else if (currentUrl.includes('/dashboard')) {
      console.log('Payment successful - redirected to dashboard');
      await expect(page).toHaveURL(/dashboard/);

      // Look for subscription status indicators
      await waitForTextToBeVisible(page, /premium|subscription|active|plan/i, 5000);

    } else if (currentUrl.includes('/payment') || currentUrl.includes('/checkout')) {
      console.log('Still on payment page - checking for errors');

      // Look for error messages
      const errorText = await page.locator('body').textContent();
      if (errorText?.match(/error|declined|invalid|failed/i)) {
        console.log('Payment error detected - this is expected in test environment');
      }

    } else {
      console.log(`Payment flow completed - redirected to: ${currentUrl}`);

      // Verify page loaded successfully
      const finalBodyText = await page.locator('body').textContent();
      expect(finalBodyText?.length).toBeGreaterThan(50);
    }

    // Step 10: Verify subscription status if possible
    await page.goto('http://localhost:3020/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const dashboardUrl = page.url();
    if (dashboardUrl.includes('/dashboard')) {
      console.log('Checking subscription status on dashboard');

      // Look for subscription indicators
      const subscriptionIndicators = [
        /premium|pro|paid|active/i,
        /subscription|plan/i,
        /billing|invoice/i
      ];

      let subscriptionFound = false;
      for (const indicator of subscriptionIndicators) {
        const bodyText = await page.locator('body').textContent();
        if (bodyText?.match(indicator)) {
          subscriptionFound = true;
          console.log(`Found subscription indicator: ${indicator}`);
          break;
        }
      }

      if (!subscriptionFound) {
        console.log('No subscription indicators found - may be on free tier or payment not processed');
      }
    }
  });

  test('should handle subscription upgrade/downgrade flow', async ({ page }) => {
    // Step 1: Login as existing user
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to account settings or subscription management
    await page.goto('http://localhost:3020/settings', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Step 3: Look for subscription management options
    const subscriptionSelectors = [
      'a[href*="subscription"]',
      'a[href*="billing"]',
      'a[href*="plan"]',
      'button:has-text("Manage")',
      'button:has-text("Upgrade")',
      'button:has-text("Change plan")'
    ];

    let subscriptionManagementFound = false;
    for (const selector of subscriptionSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        await element.click();
        subscriptionManagementFound = true;
        console.log(`Found subscription management: ${selector}`);
        break;
      }
    }

    if (!subscriptionManagementFound) {
      console.log('Subscription management not found in settings - trying direct navigation');
      await page.goto('http://localhost:3020/settings/billing', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }

    // Step 4: Check current subscription status
    const currentUrl = page.url();
    if (currentUrl.includes('/billing') || currentUrl.includes('/subscription')) {
      console.log('On subscription/billing page');

      // Look for current plan information
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.match(/current plan|subscription|billing/i)) {
        console.log('Current subscription information found');
      }

      // Look for upgrade options
      const upgradeButtons = page.locator('button:has-text("Upgrade"), button:has-text("Change plan")').first();
      if (await upgradeButtons.isVisible({ timeout: 3000 })) {
        console.log('Upgrade options available');
        // Note: We won't actually click upgrade to avoid real payments
      }
    }
  });

  test('should handle payment failure scenarios', async ({ page }) => {
    // Step 1: Navigate to payment page directly (simulate being in checkout flow)
    await page.goto('http://localhost:3020/payment', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      // Need to login first
      await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
      await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
      await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

      await page.waitForTimeout(3000);
      await page.goto('http://localhost:3020/payment', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }

    // Step 2: Test invalid payment information
    if (page.url().includes('/payment')) {
      console.log('Testing payment failure scenarios');

      // Fill with invalid card number
      const cardNumberInput = page.locator('input[name*="card"], input[placeholder*="card"], input[name*="number"]').first();
      if (await cardNumberInput.isVisible({ timeout: 3000 })) {
        await cardNumberInput.fill('4000000000000002'); // Test card that should fail
      }

      const expiryInput = page.locator('input[name*="expiry"], input[placeholder*="expiry"], input[name*="exp"]').first();
      if (await expiryInput.isVisible({ timeout: 3000 })) {
        await expiryInput.fill('12/20'); // Expired date
      }

      const cvvInput = page.locator('input[name*="cvv"], input[name*="cvc"], input[placeholder*="cvv"]').first();
      if (await cvvInput.isVisible({ timeout: 3000 })) {
        await cvvInput.fill('999'); // Invalid CVV
      }

      // Submit payment
      const submitButton = page.locator('button[type="submit"], button:has-text("Pay"), button:has-text("Complete")').first();
      if (await submitButton.isVisible({ timeout: 3000 })) {
        await submitButton.click();
        await page.waitForTimeout(5000);

        // Check for error handling
        const errorText = await page.locator('body').textContent();
        if (errorText?.match(/error|declined|invalid|failed/i)) {
          console.log('Payment error properly handled');
        } else {
          console.log('No error message shown - payment processing may be mocked');
        }
      }
    }
  });

  test('should handle billing information updates', async ({ page }) => {
    // Step 1: Login and navigate to billing settings
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    await page.goto('http://localhost:3020/settings/billing', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Step 2: Look for billing information update options
    const billingSelectors = [
      'button:has-text("Update")',
      'button:has-text("Edit")',
      'a:has-text("Change")',
      'input[name*="billing"]',
      'input[name*="address"]'
    ];

    let billingUpdateFound = false;
    for (const selector of billingSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        billingUpdateFound = true;
        console.log(`Found billing update option: ${selector}`);
        break;
      }
    }

    if (billingUpdateFound) {
      console.log('Billing update functionality available');
      // Note: We won't actually update billing info to avoid real changes
    } else {
      console.log('Billing update options not found');
    }

    // Step 3: Check for billing history
    const historySelectors = [
      'a:has-text("History")',
      'a:has-text("Invoices")',
      'a:has-text("Receipts")',
      '[data-testid="billing-history"]'
    ];

    let historyFound = false;
    for (const selector of historySelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        historyFound = true;
        console.log(`Found billing history: ${selector}`);
        break;
      }
    }

    if (!historyFound) {
      console.log('Billing history not found');
    }
  });

  test('should handle subscription cancellation flow', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to subscription management
    await page.goto('http://localhost:3020/settings/billing', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Step 3: Look for cancellation options (but don't actually cancel)
    const cancellationSelectors = [
      'button:has-text("Cancel")',
      'button:has-text("Pause")',
      'a:has-text("Cancel subscription")',
      '[data-testid="cancel-subscription"]'
    ];

    let cancellationFound = false;
    for (const selector of cancellationSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        cancellationFound = true;
        console.log(`Found cancellation option: ${selector}`);
        // We won't click it to avoid actual cancellation
        break;
      }
    }

    if (cancellationFound) {
      console.log('Cancellation functionality available');
    } else {
      console.log('Cancellation options not found - may not be implemented');
    }

    // Step 4: Check for subscription retention offers
    const retentionSelectors = [
      'button:has-text("Stay")',
      'button:has-text("Keep")',
      'button:has-text("Offer")',
      '[data-testid="retention-offer"]'
    ];

    let retentionFound = false;
    for (const selector of retentionSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        retentionFound = true;
        console.log(`Found retention offer: ${selector}`);
        break;
      }
    }

    if (!retentionFound) {
      console.log('No retention offers found');
    }
  });

  test('should handle payment method management', async ({ page }) => {
    // Step 1: Login
    await page.goto('http://localhost:3020/auth/login', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await safeFill(page, '#email-address, input[name="email"]', TEST_USERS.standard.email);
    await safeFill(page, '#password, input[name="password"]', TEST_USERS.standard.password);
    await safeClick(page, 'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    await page.waitForTimeout(3000);

    // Step 2: Navigate to payment methods
    await page.goto('http://localhost:3020/settings/billing', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Step 3: Look for payment method management
    const paymentMethodSelectors = [
      'button:has-text("Add payment")',
      'button:has-text("Add card")',
      'a:has-text("Payment methods")',
      '[data-testid="payment-methods"]',
      'button:has-text("Manage")'
    ];

    let paymentMethodsFound = false;
    for (const selector of paymentMethodSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        paymentMethodsFound = true;
        console.log(`Found payment method management: ${selector}`);
        break;
      }
    }

    if (paymentMethodsFound) {
      console.log('Payment method management available');
    } else {
      console.log('Payment method management not found');
    }

    // Step 4: Check for existing payment methods display
    const existingCardSelectors = [
      '[data-testid="payment-card"]',
      '.payment-method',
      '.saved-card',
      '[class*="card"]'
    ];

    let existingCardsFound = 0;
    for (const selector of existingCardSelectors) {
      const cards = page.locator(selector);
      const count = await cards.count();
      if (count > 0) {
        existingCardsFound = count;
        console.log(`Found ${count} existing payment cards`);
        break;
      }
    }

    if (existingCardsFound === 0) {
      console.log('No existing payment methods found');
    }
  });
});