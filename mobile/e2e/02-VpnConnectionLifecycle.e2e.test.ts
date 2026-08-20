/**
 * E2E Test: VPN Connection Lifecycle
 * Week 4 Day 19: End-to-End Testing
 *
 * Critical User Flow:
 * 1. Navigate to VPN screen
 * 2. Select server location
 * 3. Connect to VPN
 * 4. Verify connection status
 * 5. Disconnect from VPN
 * 6. Test network change during connection
 *
 * Related Bugs:
 * - BUG-020: VPN connection drops on network change (P0) - Fixed
 * - BUG-021: Server selection while connected (P1) - Fixed
 * - BUG-022: VPN state persists across app restarts (P1) - Needs testing
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('E2E: VPN Connection Lifecycle', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', location: 'YES' }
    });

    // ✅ PREREQUISITE: Login as existing user
    await loginAsTestUser();
  });

  beforeEach(async () => {
    // Navigate to VPN screen
    await element(by.id('tab-vpn')).tap();
    await waitFor(element(by.id('vpn-screen'))).toBeVisible();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  /**
   * Helper: Login as test user
   */
  async function loginAsTestUser() {
    await waitFor(element(by.id('onboarding-welcome'))).toBeVisible();
    await element(by.id('onboarding-skip-button')).tap();
    await waitFor(element(by.id('auth-screen'))).toBeVisible();
    await element(by.id('login-email-input')).typeText('e2e-vpn-test@example.com');
    await element(by.id('login-password-input')).typeText('SecurePass123!');
    await element(by.id('login-submit-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible();
  }

  /**
   * TEST 1: VPN Quick Connect (One-Tap Connect)
   * Validates: One-tap connect to fastest server
   * Performance Budget: Connection time < 5 seconds
   */
  it('should quick connect to VPN in under 5 seconds', async () => {
    const startTime = Date.now();

    // ✅ STEP 1: Verify VPN is disconnected
    await detoxExpect(element(by.id('vpn-status-disconnected'))).toBeVisible();
    await detoxExpect(element(by.text('Not Connected'))).toBeVisible();

    // ✅ STEP 2: Tap quick connect button
    await element(by.id('vpn-quick-connect-button')).tap();

    // ✅ STEP 3: Should show connecting state
    await waitFor(element(by.id('vpn-status-connecting')))
      .toBeVisible()
      .withTimeout(1000);
    await detoxExpect(element(by.text('Connecting...'))).toBeVisible();

    // ✅ STEP 4: Should connect successfully
    await waitFor(element(by.id('vpn-status-connected')))
      .toBeVisible()
      .withTimeout(10000); // Max 10s timeout

    const connectionTime = Date.now() - startTime;
    console.log(`[E2E] VPN connected in ${connectionTime}ms`);

    // ✅ PERFORMANCE: Connection time < 5000ms
    expect(connectionTime).toBeLessThan(5000);

    // ✅ VERIFY: Connection details visible
    await detoxExpect(element(by.text('Connected'))).toBeVisible();
    await detoxExpect(element(by.id('vpn-server-location'))).toBeVisible();
    await detoxExpect(element(by.id('vpn-ip-address'))).toBeVisible();
  });

  /**
   * TEST 2: VPN Disconnect
   * Validates: Clean disconnection from VPN
   */
  it('should disconnect from VPN cleanly', async () => {
    // ✅ PREREQUISITE: Connect to VPN
    await element(by.id('vpn-quick-connect-button')).tap();
    await waitFor(element(by.id('vpn-status-connected'))).toBeVisible();

    // ✅ STEP 1: Tap disconnect button
    await element(by.id('vpn-disconnect-button')).tap();

    // ✅ STEP 2: Should show disconnecting state
    await waitFor(element(by.id('vpn-status-disconnecting')))
      .toBeVisible()
      .withTimeout(1000);

    // ✅ STEP 3: Should disconnect successfully
    await waitFor(element(by.id('vpn-status-disconnected')))
      .toBeVisible()
      .withTimeout(3000);

    // ✅ VERIFY: Disconnected state
    await detoxExpect(element(by.text('Not Connected'))).toBeVisible();
    await detoxExpect(element(by.id('vpn-quick-connect-button'))).toBeVisible();
  });

  /**
   * TEST 3: Server Selection and Connection
   * Validates: Manual server selection → Connect to specific server
   */
  it('should connect to manually selected server', async () => {
    // ✅ STEP 1: Tap server selector
    await element(by.id('vpn-server-selector-button')).tap();
    await waitFor(element(by.id('server-selection-modal'))).toBeVisible();

    // ✅ STEP 2: Should show server list with ping times
    await detoxExpect(element(by.id('server-list'))).toBeVisible();
    await detoxExpect(element(by.id('server-item-us-west'))).toBeVisible();
    await detoxExpect(element(by.id('server-item-us-east'))).toBeVisible();

    // ✅ STEP 3: Select specific server (US West)
    await element(by.id('server-item-us-west')).tap();

    // ✅ STEP 4: Should show server details
    await detoxExpect(element(by.text('Los Angeles, CA'))).toBeVisible();
    await detoxExpect(element(by.id('server-load-indicator'))).toBeVisible();
    await detoxExpect(element(by.id('server-ping-time'))).toBeVisible();

    // ✅ STEP 5: Connect to selected server
    await element(by.id('connect-to-server-button')).tap();

    // ✅ STEP 6: Should connect to US West server
    await waitFor(element(by.id('vpn-status-connected'))).toBeVisible();
    await detoxExpect(element(by.text('Los Angeles, CA'))).toBeVisible();
  });

  /**
   * TEST 4: Server Switching While Connected
   * Validates: Switch servers without disconnecting
   * Related Bug: BUG-021 - Server switch while connected (P1) - FIXED
   */
  it('should switch servers while connected', async () => {
    // ✅ PREREQUISITE: Connect to US West
    await element(by.id('vpn-server-selector-button')).tap();
    await element(by.id('server-item-us-west')).tap();
    await element(by.id('connect-to-server-button')).tap();
    await waitFor(element(by.id('vpn-status-connected'))).toBeVisible();

    // ✅ STEP 1: Open server selector while connected
    await element(by.id('vpn-server-selector-button')).tap();
    await waitFor(element(by.id('server-selection-modal'))).toBeVisible();

    // ✅ STEP 2: Select different server (US East)
    await element(by.id('server-item-us-east')).tap();
    await element(by.id('connect-to-server-button')).tap();

    // ✅ STEP 3: Should reconnect to new server
    await waitFor(element(by.text('New York, NY')))
      .toBeVisible()
      .withTimeout(10000);

    // ✅ VERIFY: Still connected, different server
    await detoxExpect(element(by.id('vpn-status-connected'))).toBeVisible();
    await detoxExpect(element(by.text('New York, NY'))).toBeVisible();
  });

  /**
   * TEST 5: Network Change During VPN Connection
   * Validates: VPN reconnects on network change (WiFi → Cellular)
   * Related Bug: BUG-020 - Connection drops on network change (P0) - FIXED
   */
  it('should handle network change while connected', async () => {
    // ✅ PREREQUISITE: Connect to VPN
    await element(by.id('vpn-quick-connect-button')).tap();
    await waitFor(element(by.id('vpn-status-connected'))).toBeVisible();

    // ✅ STEP 1: Simulate network change (WiFi → Cellular)
    await device.setLocation(37.7749, -122.4194); // Trigger network stack
    await device.disableSynchronization(); // Allow background tasks

    // ✅ STEP 2: Should show reconnecting state briefly
    await waitFor(element(by.id('vpn-status-reconnecting')))
      .toBeVisible()
      .withTimeout(3000);

    // ✅ STEP 3: Should reconnect automatically
    await waitFor(element(by.id('vpn-status-connected')))
      .toBeVisible()
      .withTimeout(15000); // Allow up to 15s for reconnection

    await device.enableSynchronization();

    // ✅ VERIFY: Connection restored
    await detoxExpect(element(by.text('Connected'))).toBeVisible();
  });

  /**
   * TEST 6: VPN Connection Persists Across App Restart
   * Validates: VPN reconnects after app kill
   * Related Bug: BUG-022 - VPN state persistence (P1) - NEEDS TESTING
   */
  it('should restore VPN connection after app restart', async () => {
    // ✅ STEP 1: Connect to VPN
    await element(by.id('vpn-quick-connect-button')).tap();
    await waitFor(element(by.id('vpn-status-connected'))).toBeVisible();

    const serverLocation = await element(by.id('vpn-server-location')).getAttributes();

    // ✅ STEP 2: Kill and relaunch app
    await device.terminateApp();
    await device.launchApp({ newInstance: false });

    // ✅ STEP 3: Should automatically reconnect to VPN
    await waitFor(element(by.id('home-screen'))).toBeVisible();
    await element(by.id('tab-vpn')).tap();

    await waitFor(element(by.id('vpn-status-connected')))
      .toBeVisible()
      .withTimeout(10000);

    // ✅ VERIFY: Reconnected to same server
    const restoredLocation = await element(by.id('vpn-server-location')).getAttributes();
    expect(restoredLocation).toEqual(serverLocation);
  });

  /**
   * TEST 7: VPN Connection During App Background/Foreground
   * Validates: VPN stays connected when app is backgrounded
   */
  it('should maintain VPN connection when app is backgrounded', async () => {
    // ✅ PREREQUISITE: Connect to VPN
    await element(by.id('vpn-quick-connect-button')).tap();
    await waitFor(element(by.id('vpn-status-connected'))).toBeVisible();

    // ✅ STEP 1: Send app to background
    await device.sendToHome();
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds

    // ✅ STEP 2: Bring app back to foreground
    await device.launchApp({ newInstance: false });

    // ✅ STEP 3: VPN should still be connected
    await waitFor(element(by.id('home-screen'))).toBeVisible();
    await element(by.id('tab-vpn')).tap();
    await detoxExpect(element(by.id('vpn-status-connected'))).toBeVisible();
    await detoxExpect(element(by.text('Connected'))).toBeVisible();
  });

  /**
   * TEST 8: VPN Connection Error Handling
   * Validates: Error messages and retry logic
   */
  it('should handle connection errors gracefully', async () => {
    // ✅ STEP 1: Simulate connection failure (mock unavailable server)
    await element(by.id('vpn-server-selector-button')).tap();
    await element(by.id('server-item-mock-unavailable')).tap();
    await element(by.id('connect-to-server-button')).tap();

    // ✅ STEP 2: Should show error message
    await waitFor(element(by.text('Connection Failed')))
      .toBeVisible()
      .withTimeout(10000);

    await detoxExpect(element(by.text('Unable to connect to server'))).toBeVisible();
    await detoxExpect(element(by.id('vpn-retry-button'))).toBeVisible();

    // ✅ STEP 3: Tap retry button
    await element(by.id('vpn-retry-button')).tap();

    // ✅ STEP 4: Should attempt reconnection
    await waitFor(element(by.id('vpn-status-connecting'))).toBeVisible();
  });

  /**
   * TEST 9: VPN Kill Switch Activation
   * Validates: Internet blocked when VPN disconnects unexpectedly
   */
  it('should activate kill switch on unexpected disconnect', async () => {
    // ✅ STEP 1: Enable kill switch in settings
    await element(by.id('tab-settings')).tap();
    await element(by.id('settings-vpn')).tap();
    await element(by.id('setting-kill-switch')).tap(); // Enable

    await element(by.id('tab-vpn')).tap();

    // ✅ STEP 2: Connect to VPN
    await element(by.id('vpn-quick-connect-button')).tap();
    await waitFor(element(by.id('vpn-status-connected'))).toBeVisible();

    // ✅ STEP 3: Simulate unexpected disconnect
    await device.disableSynchronization();
    // Mock server crash or network loss
    await device.setLocation(0, 0); // Invalid location

    // ✅ STEP 4: Should show kill switch activated
    await waitFor(element(by.text('Kill Switch Active')))
      .toBeVisible()
      .withTimeout(5000);

    await detoxExpect(element(by.text('Internet access blocked'))).toBeVisible();
    await device.enableSynchronization();
  });
});
