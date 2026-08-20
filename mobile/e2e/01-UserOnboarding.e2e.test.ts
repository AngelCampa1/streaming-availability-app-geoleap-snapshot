/**
 * E2E Test: User Onboarding Journey
 * Week 4 Day 19: End-to-End Testing
 *
 * Critical User Flow:
 * 1. App launch → Splash screen → Onboarding
 * 2. Sign up with email/password
 * 3. Verify email (skip in test)
 * 4. Set up biometric authentication
 * 5. Complete profile setup
 * 6. Land on home screen
 *
 * Related Bugs:
 * - BUG-001: App crash on first launch (P0) - Fixed
 * - BUG-008: Biometric auth failure fallback (P1) - Fixed
 * - BUG-012: OAuth redirect handling (P1) - Needs testing
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('E2E: User Onboarding Journey', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', camera: 'YES', location: 'YES' }
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  /**
   * TEST 1: First Launch Experience
   * Validates: Splash screen → Onboarding flow → Welcome screen
   * Performance Budget: < 3 seconds to first interactive screen
   */
  it('should complete first launch and show onboarding', async () => {
    const startTime = Date.now();

    // ✅ STEP 1: Splash screen should appear first
    await waitFor(element(by.id('splash-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // ✅ STEP 2: Onboarding screen should appear after splash
    await waitFor(element(by.id('onboarding-welcome')))
      .toBeVisible()
      .withTimeout(5000);

    const loadTime = Date.now() - startTime;
    console.log(`[E2E] First launch completed in ${loadTime}ms`);

    // ✅ PERFORMANCE: Should load in < 3000ms
    expect(loadTime).toBeLessThan(3000);

    // ✅ VERIFY: Welcome screen content
    await detoxExpect(element(by.text('Welcome to GeoLeap'))).toBeVisible();
    await detoxExpect(element(by.id('onboarding-next-button'))).toBeVisible();
  });

  /**
   * TEST 2: Onboarding Tutorial Flow
   * Validates: Swipe through onboarding slides
   */
  it('should navigate through onboarding slides', async () => {
    await waitFor(element(by.id('onboarding-welcome')))
      .toBeVisible()
      .withTimeout(5000);

    // ✅ STEP 1: Swipe to features slide
    await element(by.id('onboarding-carousel')).swipe('left');
    await detoxExpect(element(by.text('Find Your Shows'))).toBeVisible();

    // ✅ STEP 2: Swipe to VPN benefits slide
    await element(by.id('onboarding-carousel')).swipe('left');
    await detoxExpect(element(by.text('Stream Anywhere'))).toBeVisible();

    // ✅ STEP 3: Swipe to final slide
    await element(by.id('onboarding-carousel')).swipe('left');
    await detoxExpect(element(by.text('Get Started'))).toBeVisible();
    await detoxExpect(element(by.id('onboarding-get-started-button'))).toBeVisible();
  });

  /**
   * TEST 3: Email/Password Sign Up Flow
   * Validates: Sign up form → Email verification → Profile setup
   * Related Bug: BUG-002 - Password validation (P1)
   */
  it('should complete email sign up flow', async () => {
    // ✅ STEP 1: Navigate to sign up screen
    await element(by.id('onboarding-get-started-button')).tap();
    await waitFor(element(by.id('auth-screen')))
      .toBeVisible()
      .withTimeout(2000);

    await element(by.id('auth-signup-tab')).tap();
    await detoxExpect(element(by.id('signup-form'))).toBeVisible();

    // ✅ STEP 2: Fill out sign up form
    const testEmail = `e2e-test-${Date.now()}@example.com`;
    await element(by.id('signup-email-input')).typeText(testEmail);
    await element(by.id('signup-password-input')).typeText('SecurePass123!');
    await element(by.id('signup-confirm-password-input')).typeText('SecurePass123!');

    // ✅ STEP 3: Accept terms and conditions
    await element(by.id('signup-terms-checkbox')).tap();

    // ✅ STEP 4: Submit sign up form
    await element(by.id('signup-submit-button')).tap();

    // ✅ STEP 5: Should show email verification screen
    await waitFor(element(by.id('email-verification-screen')))
      .toBeVisible()
      .withTimeout(5000);

    await detoxExpect(element(by.text('Verify Your Email'))).toBeVisible();
    await detoxExpect(element(by.text(testEmail))).toBeVisible();

    // ✅ STEP 6: Skip email verification for E2E test
    await element(by.id('skip-verification-button')).tap();

    // ✅ STEP 7: Should show profile setup screen
    await waitFor(element(by.id('profile-setup-screen')))
      .toBeVisible()
      .withTimeout(3000);
  });

  /**
   * TEST 4: Password Validation Requirements
   * Validates: Password strength requirements
   * Related Bug: BUG-002 - Weak password acceptance (P1) - FIXED
   */
  it('should enforce password validation rules', async () => {
    await element(by.id('onboarding-get-started-button')).tap();
    await waitFor(element(by.id('auth-screen'))).toBeVisible();
    await element(by.id('auth-signup-tab')).tap();

    // ✅ TEST CASE 1: Short password (< 8 chars) should fail
    await element(by.id('signup-email-input')).typeText('test@example.com');
    await element(by.id('signup-password-input')).typeText('Short1!');
    await element(by.id('signup-submit-button')).tap();
    await detoxExpect(element(by.text('Password must be at least 8 characters'))).toBeVisible();

    // ✅ TEST CASE 2: Password without uppercase should fail
    await element(by.id('signup-password-input')).clearText();
    await element(by.id('signup-password-input')).typeText('lowercase123!');
    await element(by.id('signup-submit-button')).tap();
    await detoxExpect(element(by.text('Password must contain uppercase letter'))).toBeVisible();

    // ✅ TEST CASE 3: Password without number should fail
    await element(by.id('signup-password-input')).clearText();
    await element(by.id('signup-password-input')).typeText('NoNumbers!');
    await element(by.id('signup-submit-button')).tap();
    await detoxExpect(element(by.text('Password must contain a number'))).toBeVisible();

    // ✅ TEST CASE 4: Valid password should proceed
    await element(by.id('signup-password-input')).clearText();
    await element(by.id('signup-password-input')).typeText('ValidPass123!');
    await element(by.id('signup-confirm-password-input')).typeText('ValidPass123!');
    await element(by.id('signup-terms-checkbox')).tap();
    await element(by.id('signup-submit-button')).tap();
    await waitFor(element(by.id('email-verification-screen'))).toBeVisible();
  });

  /**
   * TEST 5: Biometric Authentication Setup
   * Validates: Face ID / Touch ID enrollment
   * Related Bug: BUG-008 - Biometric fallback (P1) - FIXED
   */
  it('should set up biometric authentication', async () => {
    // ✅ PREREQUISITE: Complete sign up flow
    await element(by.id('onboarding-get-started-button')).tap();
    await element(by.id('auth-signup-tab')).tap();
    await element(by.id('signup-email-input')).typeText('biometric@example.com');
    await element(by.id('signup-password-input')).typeText('SecurePass123!');
    await element(by.id('signup-confirm-password-input')).typeText('SecurePass123!');
    await element(by.id('signup-terms-checkbox')).tap();
    await element(by.id('signup-submit-button')).tap();
    await element(by.id('skip-verification-button')).tap();

    // ✅ STEP 1: Should show biometric setup screen
    await waitFor(element(by.id('biometric-setup-screen')))
      .toBeVisible()
      .withTimeout(3000);

    await detoxExpect(element(by.text('Enable Face ID'))).toBeVisible();
    await detoxExpect(element(by.id('enable-biometric-button'))).toBeVisible();

    // ✅ STEP 2: Enable biometric authentication
    await element(by.id('enable-biometric-button')).tap();

    // Mock biometric success
    await device.setBiometricEnrollment(true);
    await device.matchFace();

    // ✅ STEP 3: Should show success message
    await waitFor(element(by.text('Face ID Enabled')))
      .toBeVisible()
      .withTimeout(2000);

    // ✅ STEP 4: Continue to home screen
    await element(by.id('biometric-continue-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible();
  });

  /**
   * TEST 6: OAuth Sign Up Flow (Google)
   * Validates: Google OAuth redirect handling
   * Related Bug: BUG-012 - OAuth redirect (P1) - NEEDS TESTING
   */
  it('should handle Google OAuth sign up', async () => {
    await element(by.id('onboarding-get-started-button')).tap();
    await waitFor(element(by.id('auth-screen'))).toBeVisible();

    // ✅ STEP 1: Tap Google sign in button
    await element(by.id('google-signin-button')).tap();

    // ✅ STEP 2: Should open Google OAuth web view
    await waitFor(element(by.id('oauth-webview')))
      .toBeVisible()
      .withTimeout(3000);

    // ✅ STEP 3: Mock successful OAuth (Detox doesn't support real OAuth)
    // In real test, would fill Google credentials here
    await device.openURL({ url: 'streampvn://oauth/callback?provider=google&token=mock-token' });

    // ✅ STEP 4: Should redirect back to app and show home screen
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // ✅ VERIFY: User is authenticated
    await detoxExpect(element(by.id('user-profile-button'))).toBeVisible();
  });

  /**
   * TEST 7: Profile Setup Completion
   * Validates: Profile customization → Preferences → Home screen
   */
  it('should complete profile setup', async () => {
    // ✅ PREREQUISITE: Complete sign up and skip email verification
    await element(by.id('onboarding-get-started-button')).tap();
    await element(by.id('auth-signup-tab')).tap();
    await element(by.id('signup-email-input')).typeText('profile@example.com');
    await element(by.id('signup-password-input')).typeText('SecurePass123!');
    await element(by.id('signup-confirm-password-input')).typeText('SecurePass123!');
    await element(by.id('signup-terms-checkbox')).tap();
    await element(by.id('signup-submit-button')).tap();
    await element(by.id('skip-verification-button')).tap();

    // ✅ STEP 1: Should show profile setup screen
    await waitFor(element(by.id('profile-setup-screen'))).toBeVisible();

    // ✅ STEP 2: Fill out profile details
    await element(by.id('profile-display-name-input')).typeText('E2E Test User');
    await element(by.id('profile-avatar-selector')).tap();
    await element(by.id('avatar-option-0')).tap();

    // ✅ STEP 3: Select content preferences
    await element(by.id('genre-action')).tap();
    await element(by.id('genre-comedy')).tap();
    await element(by.id('genre-drama')).tap();

    // ✅ STEP 4: Submit profile setup
    await element(by.id('profile-setup-submit-button')).tap();

    // ✅ STEP 5: Should navigate to home screen
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(3000);

    // ✅ VERIFY: Home screen content loaded
    await detoxExpect(element(by.id('trending-content-carousel'))).toBeVisible();
    await detoxExpect(element(by.id('vpn-status-widget'))).toBeVisible();
  });

  /**
   * TEST 8: Skip Onboarding (Returning User)
   * Validates: Skip button → Login screen
   */
  it('should allow skipping onboarding', async () => {
    await waitFor(element(by.id('onboarding-welcome'))).toBeVisible();

    // ✅ STEP 1: Tap skip button
    await element(by.id('onboarding-skip-button')).tap();

    // ✅ STEP 2: Should show login screen
    await waitFor(element(by.id('auth-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // ✅ VERIFY: Login tab is active by default
    await detoxExpect(element(by.id('login-form'))).toBeVisible();
    await detoxExpect(element(by.id('login-email-input'))).toBeVisible();
  });
});
