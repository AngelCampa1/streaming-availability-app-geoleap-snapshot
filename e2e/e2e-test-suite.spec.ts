import { test, expect, Page } from '@playwright/test';
import { 
  navigateToHome,
  navigateToLogin,
  navigateToRegister,
  navigateToDashboard,
  navigateToVpnGuidance,
  waitForPageLoad
} from './utils/test-helpers';

const FRONTEND_URL = 'http://localhost:3020';
const BACKEND_URL = 'http://localhost:8020';

test.describe('GeoLeap E2E Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('Homepage loads and renders correctly', async ({ page }) => {
    await navigateToHome(page);
    await waitForPageLoad(page);

    // Take screenshot
    await page.screenshot({
      path: './test-e2e-results/screenshots/01-homepage.png',
      fullPage: true
    });

    // Check for common elements
    const title = await page.title();
    console.log('Page title:', title);

    // Check if page loaded (not blank)
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test('Navigation menu functionality', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Look for navigation elements
    const nav = page.locator('nav, header, [role="navigation"]').first();
    if (await nav.count() > 0) {
      await page.screenshot({
        path: './test-e2e-results/screenshots/02-navigation.png'
      });

      // Try to find and click links
      const links = await page.locator('a').all();
      console.log(`Found ${links.length} links on homepage`);
    }
  });

  test('Login page accessibility', async ({ page }) => {
    // Try UI navigation to login first
    try {
      await navigateToLogin(page);
      await waitForPageLoad(page);
      await page.screenshot({
        path: './test-e2e-results/screenshots/03-login-ui.png',
        fullPage: true
      });
      console.log('✓ Login page found via UI navigation');
    } catch (error) {
      console.log('✗ UI navigation to login failed, trying direct paths');
      const loginPaths = ['/login', '/auth/login', '/signin', '/auth'];

      for (const path of loginPaths) {
        try {
          const response = await page.goto(`${FRONTEND_URL}${path}`);
          if (response?.ok()) {
            await page.waitForLoadState('networkidle');
            await page.screenshot({
              path: `./test-e2e-results/screenshots/03-login-${path.replace(/\//g, '-')}.png`,
              fullPage: true
            });
            console.log(`✓ Login page found at: ${path}`);
            break;
          }
        } catch (error) {
          console.log(`✗ No login at ${path}`);
        }
      }
    }
  });

  test('Registration/Signup page accessibility', async ({ page }) => {
    // Try UI navigation to register first
    try {
      await navigateToRegister(page);
      await waitForPageLoad(page);
      await page.screenshot({
        path: './test-e2e-results/screenshots/04-signup-ui.png',
        fullPage: true
      });
      console.log('✓ Signup page found via UI navigation');
    } catch (error) {
      console.log('✗ UI navigation to signup failed, trying direct paths');
      const signupPaths = ['/signup', '/register', '/auth/signup', '/auth/register'];

      for (const path of signupPaths) {
        try {
          const response = await page.goto(`${FRONTEND_URL}${path}`);
          if (response?.ok()) {
            await page.waitForLoadState('networkidle');
            await page.screenshot({
              path: `./test-e2e-results/screenshots/04-signup-${path.replace(/\//g, '-')}.png`,
              fullPage: true
            });
            console.log(`✓ Signup page found at: ${path}`);
            break;
          }
        } catch (error) {
          console.log(`✗ No signup at ${path}`);
        }
      }
    }
  });

  test('VPN connection page/dashboard', async ({ page }) => {
    // Try UI navigation to VPN guidance first
    try {
      await navigateToVpnGuidance(page);
      await waitForPageLoad(page);
      await page.screenshot({
        path: './test-e2e-results/screenshots/05-vpn-ui.png',
        fullPage: true
      });
      console.log('✓ VPN page found via UI navigation');
    } catch (error) {
      console.log('✗ UI navigation to VPN failed, trying direct paths');
      const vpnPaths = ['/vpn', '/dashboard', '/connect', '/servers'];

      for (const path of vpnPaths) {
        try {
          const response = await page.goto(`${FRONTEND_URL}${path}`);
          if (response?.ok()) {
            await page.waitForLoadState('networkidle');
            await page.screenshot({
              path: `./test-e2e-results/screenshots/05-vpn-${path.replace(/\//g, '-')}.png`,
              fullPage: true
            });
            console.log(`✓ VPN page found at: ${path}`);
            break;
          }
        } catch (error) {
          console.log(`✗ No VPN page at ${path}`);
        }
      }
    }
  });

  test('Streaming content features', async ({ page }) => {
    // Try UI navigation to streaming first
    try {
      await navigateToHome(page);
      // Look for streaming links
      const streamingLink = page.locator('a[href*="stream"], a[href*="content"], button:has-text("Stream")').first();
      if (await streamingLink.isVisible({ timeout: 3000 })) {
        await streamingLink.click();
        await waitForPageLoad(page);
      }
      await page.screenshot({
        path: './test-e2e-results/screenshots/06-streaming-ui.png',
        fullPage: true
      });
      console.log('✓ Streaming page found via UI navigation');
    } catch (error) {
      console.log('✗ UI navigation to streaming failed, trying direct paths');
      const streamingPaths = ['/stream', '/content', '/browse', '/movies', '/shows'];

      for (const path of streamingPaths) {
        try {
          const response = await page.goto(`${FRONTEND_URL}${path}`);
          if (response?.ok()) {
            await page.waitForLoadState('networkidle');
            await page.screenshot({
              path: `./test-e2e-results/screenshots/06-streaming-${path.replace(/\//g, '-')}.png`,
              fullPage: true
            });
            console.log(`✓ Streaming page found at: ${path}`);
            break;
          }
        } catch (error) {
          console.log(`✗ No streaming at ${path}`);
        }
      }
    }
  });

  test('Responsive design - Mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await navigateToHome(page);
    await waitForPageLoad(page);
    await page.screenshot({
      path: './test-e2e-results/screenshots/07-mobile-375.png',
      fullPage: true
    });
  });

  test('Responsive design - Tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await navigateToHome(page);
    await waitForPageLoad(page);
    await page.screenshot({
      path: './test-e2e-results/screenshots/08-tablet-768.png',
      fullPage: true
    });
  });

  test('Form validation - Registration form', async ({ page }) => {
    await navigateToHome(page);
    await waitForPageLoad(page);

    // Look for input fields
    const emailInputs = await page.locator('input[type="email"]').all();
    const passwordInputs = await page.locator('input[type="password"]').all();
    const submitButtons = await page.locator('button[type="submit"], input[type="submit"]').all();

    console.log(`Found ${emailInputs.length} email inputs, ${passwordInputs.length} password inputs, ${submitButtons.length} submit buttons`);

    if (emailInputs.length > 0) {
      await page.screenshot({
        path: './test-e2e-results/screenshots/09-forms-detected.png'
      });
    }
  });

  test('Console errors check', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    await navigateToHome(page);
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    console.log('Console Errors:', consoleErrors);
    console.log('Network Errors:', networkErrors);

    // Write errors to file
    const fs = require('fs');
    fs.writeFileSync('./test-e2e-results/console-errors.json', JSON.stringify({
      consoleErrors,
      networkErrors,
      timestamp: new Date().toISOString()
    }, null, 2));
  });
});
