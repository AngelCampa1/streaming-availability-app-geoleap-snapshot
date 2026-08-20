const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for SEO Testing Suite
 * Optimized for comprehensive SEO testing across multiple browsers and devices
 */
module.exports = defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'seo-test-results' }],
    ['junit', { outputFile: 'seo-test-results.xml' }],
    ['json', { outputFile: 'seo-test-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    // Desktop Browsers - SEO Crawler Testing
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      testMatch: ['technical-seo.test.js', 'performance-seo.test.js', 'crawler-seo.test.js']
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
      },
      testMatch: ['cross-browser-seo.test.js']
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      },
      testMatch: ['cross-browser-seo.test.js']
    },

    // Mobile Devices - Mobile SEO Testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
      },
      testMatch: ['mobile-responsive-seo.test.js', 'performance-seo.test.js']
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      },
      testMatch: ['mobile-responsive-seo.test.js']
    },

    // Search Engine Bots
    {
      name: 'googlebot',
      use: {
        ...devices['Desktop Chrome'],
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        javaScriptEnabled: true,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
        }
      },
      testMatch: ['crawler-seo.test.js', 'technical-seo.test.js']
    },
    {
      name: 'googlebot-mobile',
      use: {
        ...devices['Pixel 5'],
        userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        javaScriptEnabled: true
      },
      testMatch: ['crawler-seo.test.js', 'mobile-responsive-seo.test.js']
    },
    {
      name: 'bingbot',
      use: {
        ...devices['Desktop Chrome'],
        userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        javaScriptEnabled: false
      },
      testMatch: ['crawler-seo.test.js']
    },

    // Accessibility Testing
    {
      name: 'accessibility-audit',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['accessibility-seo.test.js']
    },

    // Conversion Testing
    {
      name: 'conversion-desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['conversion-ab-testing.test.js']
    },
    {
      name: 'conversion-mobile',
      use: { ...devices['iPhone 12'] },
      testMatch: ['conversion-ab-testing.test.js']
    }
  ],

  /* Global test configuration */
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),

  /* Development server configuration */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    cwd: '../..'
  }
});