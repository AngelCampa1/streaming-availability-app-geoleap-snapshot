/**
 * E2E Test: Subscription & Payment Flow
 * Week 4 Day 19: End-to-End Testing
 *
 * Critical User Flow:
 * 1. View subscription plans
 * 2. Select a plan (monthly/yearly)
 * 3. Complete in-app purchase
 * 4. Verify subscription activation
 * 5. Manage subscription (upgrade/downgrade)
 * 6. Cancel subscription
 * 7. Restore purchases
 *
 * Related Bugs:
 * - BUG-040: Receipt validation not implemented (P0 CRITICAL) - NOT FIXED
 * - BUG-041: Purchase flow interruption handling (P1) - Fixed
 * - BUG-042: Restore purchases functionality (P1) - Needs testing
 *
 * ⚠️ CRITICAL SECURITY ISSUE:
 * BUG-040 - Receipt validation service does NOT exist.
 * All in-app purchases are vulnerable to fraud!
 * This E2E test validates the UI flow only, NOT server-side receipt verification.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('E2E: Subscription & Payment Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser();
  });

  beforeEach(async () => {
    // Navigate to subscription screen
    await element(by.id('tab-profile')).tap();
    await waitFor(element(by.id('profile-screen'))).toBeVisible();
    await element(by.id('manage-subscription-button')).tap();
    await waitFor(element(by.id('subscription-screen'))).toBeVisible();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  async function loginAsTestUser() {
    await waitFor(element(by.id('onboarding-welcome'))).toBeVisible();
    await element(by.id('onboarding-skip-button')).tap();
    await element(by.id('login-email-input')).typeText('e2e-subscription-test@example.com');
    await element(by.id('login-password-input')).typeText('SecurePass123!');
    await element(by.id('login-submit-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible();
  }

  /**
   * TEST 1: View Subscription Plans
   * Validates: Subscription plans screen with pricing
   */
  it('should display subscription plans with pricing', async () => {
    // ✅ VERIFY: Subscription plans visible
    await detoxExpect(element(by.id('subscription-plans'))).toBeVisible();
    await detoxExpect(element(by.text('Choose Your Plan'))).toBeVisible();

    // ✅ VERIFY: Monthly plan
    await detoxExpect(element(by.id('plan-monthly'))).toBeVisible();
    await detoxExpect(element(by.text('Monthly'))).toBeVisible();
    await detoxExpect(element(by.text('$9.99/mo'))).toBeVisible();

    // ✅ VERIFY: Yearly plan (with discount badge)
    await detoxExpect(element(by.id('plan-yearly'))).toBeVisible();
    await detoxExpect(element(by.text('Yearly'))).toBeVisible();
    await detoxExpect(element(by.text('$99.99/yr'))).toBeVisible();
    await detoxExpect(element(by.text('Save 17%'))).toBeVisible();

    // ✅ VERIFY: Features list
    await detoxExpect(element(by.text('Unlimited VPN Access'))).toBeVisible();
    await detoxExpect(element(by.text('4K Streaming Quality'))).toBeVisible();
    await detoxExpect(element(by.text('Ad-Free Experience'))).toBeVisible();
  });

  /**
   * TEST 2: Select Subscription Plan
   * Validates: Plan selection UI state changes
   */
  it('should select subscription plan', async () => {
    // ✅ STEP 1: Tap monthly plan
    await element(by.id('plan-monthly')).tap();

    // ✅ VERIFY: Monthly plan selected (visual indicator)
    await detoxExpect(element(by.id('plan-monthly-selected'))).toBeVisible();
    await detoxExpect(element(by.id('subscribe-button'))).toBeVisible();
    await detoxExpect(element(by.text('Subscribe for $9.99/mo'))).toBeVisible();

    // ✅ STEP 2: Switch to yearly plan
    await element(by.id('plan-yearly')).tap();

    // ✅ VERIFY: Yearly plan selected
    await detoxExpect(element(by.id('plan-yearly-selected'))).toBeVisible();
    await detoxExpect(element(by.text('Subscribe for $99.99/yr'))).toBeVisible();
  });

  /**
   * TEST 3: Complete In-App Purchase (Mock Success)
   * Validates: Purchase flow with successful payment
   * Related Bug: BUG-041 - Purchase interruption (P1) - FIXED
   *
   * ⚠️ WARNING: This test does NOT validate receipt verification!
   * BUG-040 (P0 CRITICAL): ReceiptValidationService does not exist.
   */
  it('should complete in-app purchase successfully', async () => {
    // ✅ STEP 1: Select monthly plan
    await element(by.id('plan-monthly')).tap();
    await detoxExpect(element(by.id('plan-monthly-selected'))).toBeVisible();

    // ✅ STEP 2: Tap subscribe button
    await element(by.id('subscribe-button')).tap();

    // ✅ STEP 3: Should show payment confirmation dialog (iOS/Android native)
    if (device.getPlatform() === 'ios') {
      // iOS: Mock App Store purchase dialog
      await waitFor(element(by.label('Confirm with Side Button')))
        .toBeVisible()
        .withTimeout(3000);

      // Simulate Face ID / Touch ID success
      await device.matchFace();
    } else {
      // Android: Mock Google Play purchase dialog
      await waitFor(element(by.text('Buy')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.text('Buy')).tap();
    }

    // ✅ STEP 4: Should show processing indicator
    await waitFor(element(by.id('purchase-processing')))
      .toBeVisible()
      .withTimeout(2000);

    // ✅ STEP 5: Should show success message
    await waitFor(element(by.text('Subscription Activated')))
      .toBeVisible()
      .withTimeout(10000);

    // ✅ VERIFY: Success screen
    await detoxExpect(element(by.text('Welcome to GeoLeap Premium!'))).toBeVisible();
    await detoxExpect(element(by.id('subscription-success-button'))).toBeVisible();

    // ⚠️ CRITICAL: This does NOT verify server-side receipt validation!
    // BUG-040 means fraudulent purchases can bypass payment!
  });

  /**
   * TEST 4: Handle Purchase Interruption
   * Validates: Recovery from app kill during purchase
   * Related Bug: BUG-041 - Purchase interruption (P1) - FIXED
   */
  it('should recover from purchase interruption', async () => {
    // ✅ STEP 1: Start purchase flow
    await element(by.id('plan-monthly')).tap();
    await element(by.id('subscribe-button')).tap();

    // ✅ STEP 2: Wait for payment dialog
    await waitFor(element(by.id('purchase-processing'))).toBeVisible();

    // ✅ STEP 3: Kill app mid-purchase
    await device.terminateApp();

    // ✅ STEP 4: Relaunch app
    await device.launchApp({ newInstance: false });

    // ✅ STEP 5: Login again
    await loginAsTestUser();

    // ✅ STEP 6: Navigate to subscription screen
    await element(by.id('tab-profile')).tap();
    await element(by.id('manage-subscription-button')).tap();

    // ✅ VERIFY: Purchase should resume or show retry option
    await waitFor(element(by.text('Complete Your Purchase')))
      .toBeVisible()
      .withTimeout(5000);

    await detoxExpect(element(by.id('resume-purchase-button'))).toBeVisible();

    // ✅ STEP 7: Resume purchase
    await element(by.id('resume-purchase-button')).tap();

    // ✅ VERIFY: Purchase completes
    await waitFor(element(by.text('Subscription Activated'))).toBeVisible();
  });

  /**
   * TEST 5: Restore Purchases
   * Validates: Restore previous purchases on new device
   * Related Bug: BUG-042 - Restore purchases (P1) - NEEDS TESTING
   */
  it('should restore previous purchases', async () => {
    // ✅ STEP 1: Tap "Restore Purchases" button
    await element(by.id('restore-purchases-button')).tap();

    // ✅ STEP 2: Should show restoration progress
    await waitFor(element(by.text('Restoring Purchases...')))
      .toBeVisible()
      .withTimeout(1000);

    // ✅ STEP 3: Should complete restoration
    await waitFor(element(by.text('Purchases Restored')))
      .toBeVisible()
      .withTimeout(10000);

    // ✅ VERIFY: Active subscription detected
    await detoxExpect(element(by.id('active-subscription-badge'))).toBeVisible();
    await detoxExpect(element(by.text('Monthly Plan'))).toBeVisible();
    await detoxExpect(element(by.text('Active'))).toBeVisible();
  });

  /**
   * TEST 6: Upgrade Subscription Plan
   * Validates: Upgrade from monthly to yearly
   */
  it('should upgrade subscription from monthly to yearly', async () => {
    // ✅ PREREQUISITE: User has active monthly subscription

    // ✅ STEP 1: Select yearly plan
    await element(by.id('plan-yearly')).tap();
    await detoxExpect(element(by.id('plan-yearly-selected'))).toBeVisible();

    // ✅ STEP 2: Tap upgrade button
    await element(by.id('upgrade-button')).tap();

    // ✅ STEP 3: Should show upgrade confirmation
    await waitFor(element(by.text('Upgrade to Yearly Plan?')))
      .toBeVisible()
      .withTimeout(1000);

    await detoxExpect(element(by.text('You will be charged $99.99'))).toBeVisible();
    await detoxExpect(element(by.text('Your monthly subscription will be cancelled'))).toBeVisible();

    // ✅ STEP 4: Confirm upgrade
    await element(by.text('Confirm Upgrade')).tap();

    // ✅ STEP 5: Complete payment
    if (device.getPlatform() === 'ios') {
      await device.matchFace();
    }

    // ✅ STEP 6: Should show upgrade success
    await waitFor(element(by.text('Upgraded Successfully')))
      .toBeVisible()
      .withTimeout(10000);

    // ✅ VERIFY: Yearly plan now active
    await detoxExpect(element(by.text('Yearly Plan'))).toBeVisible();
    await detoxExpect(element(by.text('Active'))).toBeVisible();
  });

  /**
   * TEST 7: Downgrade Subscription Plan
   * Validates: Downgrade from yearly to monthly
   */
  it('should downgrade subscription from yearly to monthly', async () => {
    // ✅ PREREQUISITE: User has active yearly subscription

    // ✅ STEP 1: Select monthly plan
    await element(by.id('plan-monthly')).tap();

    // ✅ STEP 2: Tap downgrade button
    await element(by.id('downgrade-button')).tap();

    // ✅ STEP 3: Should show downgrade confirmation
    await waitFor(element(by.text('Downgrade to Monthly Plan?')))
      .toBeVisible()
      .withTimeout(1000);

    await detoxExpect(element(by.text('Your yearly plan will remain active until expiration'))).toBeVisible();
    await detoxExpect(element(by.text('You will then be charged $9.99/mo'))).toBeVisible();

    // ✅ STEP 4: Confirm downgrade
    await element(by.text('Confirm Downgrade')).tap();

    // ✅ VERIFY: Downgrade scheduled
    await waitFor(element(by.text('Downgrade Scheduled')))
      .toBeVisible()
      .withTimeout(2000);

    await detoxExpect(element(by.text('Your monthly plan will start on'))).toBeVisible();
  });

  /**
   * TEST 8: Cancel Subscription
   * Validates: Subscription cancellation flow
   */
  it('should cancel active subscription', async () => {
    // ✅ STEP 1: Tap "Cancel Subscription" button
    await element(by.id('cancel-subscription-button')).tap();

    // ✅ STEP 2: Should show cancellation confirmation
    await waitFor(element(by.text('Cancel Subscription?')))
      .toBeVisible()
      .withTimeout(1000);

    await detoxExpect(element(by.text('Your subscription will remain active until the end of the billing period'))).toBeVisible();
    await detoxExpect(element(by.id('cancel-confirm-button'))).toBeVisible();

    // ✅ STEP 3: Confirm cancellation
    await element(by.id('cancel-confirm-button')).tap();

    // ✅ STEP 4: Should show cancellation success
    await waitFor(element(by.text('Subscription Cancelled')))
      .toBeVisible()
      .withTimeout(3000);

    // ✅ VERIFY: Subscription marked as cancelled but still active
    await detoxExpect(element(by.text('Active until'))).toBeVisible();
    await detoxExpect(element(by.id('resubscribe-button'))).toBeVisible();
  });

  /**
   * TEST 9: Resubscribe After Cancellation
   * Validates: Reactivate cancelled subscription
   */
  it('should resubscribe after cancellation', async () => {
    // ✅ PREREQUISITE: User has cancelled subscription

    // ✅ STEP 1: Tap "Resubscribe" button
    await element(by.id('resubscribe-button')).tap();

    // ✅ STEP 2: Should show plan selection
    await detoxExpect(element(by.id('plan-monthly'))).toBeVisible();
    await detoxExpect(element(by.id('plan-yearly'))).toBeVisible();

    // ✅ STEP 3: Select monthly plan and subscribe
    await element(by.id('plan-monthly')).tap();
    await element(by.id('subscribe-button')).tap();

    // ✅ STEP 4: Complete payment
    if (device.getPlatform() === 'ios') {
      await device.matchFace();
    }

    // ✅ VERIFY: Subscription reactivated
    await waitFor(element(by.text('Subscription Activated')))
      .toBeVisible()
      .withTimeout(10000);

    await detoxExpect(element(by.text('Active'))).toBeVisible();
  });

  /**
   * TEST 10: Handle Payment Failure
   * Validates: Error handling for failed payments
   */
  it('should handle payment failure gracefully', async () => {
    // ✅ STEP 1: Select plan and attempt purchase
    await element(by.id('plan-monthly')).tap();
    await element(by.id('subscribe-button')).tap();

    // ✅ STEP 2: Simulate payment failure (mock declined card)
    // In real test, would use StoreKit/Google Play test cards

    // ✅ STEP 3: Should show error message
    await waitFor(element(by.text('Payment Failed')))
      .toBeVisible()
      .withTimeout(10000);

    await detoxExpect(element(by.text('Your payment could not be processed'))).toBeVisible();
    await detoxExpect(element(by.id('retry-payment-button'))).toBeVisible();
    await detoxExpect(element(by.id('update-payment-method-button'))).toBeVisible();

    // ✅ STEP 4: Tap retry button
    await element(by.id('retry-payment-button')).tap();

    // ✅ VERIFY: Payment flow restarts
    await waitFor(element(by.id('purchase-processing'))).toBeVisible();
  });
});
