import { defineConfig, devices } from '@playwright/test';
import { join } from 'path';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/node_modules/**',

  // Ensure fully parallel is disabled for consistent results
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only - reduced for faster feedback
  retries: process.env.CI ? 1 : 0,

  // Opt out of parallel tests on CI to avoid database conflicts
  workers: process.env.CI ? 1 : 1, // Always use 1 worker for consistency

  // Global setup and teardown
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  // Reporter configuration
  reporter: [
    ['list'],
    ['json', { outputFile: './test-results.json' }],
    ['html', { outputFolder: './playwright-report' }]
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3020',

    // Collect trace when retrying the failed test
    trace: 'retain-on-failure',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Action and navigation timeouts
    actionTimeout: 15000,
    navigationTimeout: 20000,

    // Make viewport sizes consistent
    viewport: { width: 1280, height: 720 },
  },

  // Test timeout
  timeout: 90000, // 90 seconds per test

  // Expect timeout
  expect: {
    timeout: 15000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Reduced timeouts for faster feedback
        actionTimeout: 10000,
        navigationTimeout: 15000,
      },
    },

    // Comment out other browsers for faster development testing
    // Uncomment for full CI testing
    /*
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],

  // Run your local dev server before starting the tests
  // Note: This is handled by globalSetup.ts for this project
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },

  // Global test setup
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
});