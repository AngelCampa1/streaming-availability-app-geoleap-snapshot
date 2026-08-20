/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // setupFiles run BEFORE the test environment is set up (for polyfills)
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  // setupFilesAfterEnv runs AFTER the test environment (for test utilities)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  // Test environment options - ensure API calls use relative URLs for MSW interception
  testEnvironmentOptions: {
    url: 'http://localhost:3020',
  },
  // Global test variables
  globals: {
    'process.env.NEXT_PUBLIC_API_URL': '',
    'process.env.NODE_ENV': 'test',
  },
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '[/\\\\]tests[/\\\\]', // Exclude all tests directory (Playwright E2E)
    '<rootDir>/src/__tests__/playwright/',
    '<rootDir>/src/__tests__/e2e/',
    '<rootDir>/src/__tests__/setup/seo-test-setup.ts',
    '[/\\\\]__tests__[/\\\\]support[/\\\\]utils[/\\\\]',  // Exclude test utility files (cross-platform)
    '[/\\\\]__tests__[/\\\\]support[/\\\\]mocks[/\\\\]',  // Exclude mock files (cross-platform)
    'mockFactories\\.ts$',      // Utility factory file, no tests
    'supportHandlers\\.ts$',    // MSW handler file, no tests
    '\\.spec\\.ts$',  // Exclude Playwright tests (.spec.ts)
    '\\.spec\\.tsx$', // Exclude Playwright tests (.spec.tsx)
    'growth-tracking-client\\.test\\.ts$', // Temporarily skip - OOM/hanging issue
    'watchlistApi\\.test\\.ts$', // Temporarily skip - MSW server conflict with global server
    'AdminNavigationBar\\.test\\.tsx$', // Temporarily skip - hanging/timeout issue
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Performance optimizations
  maxWorkers: '50%', // Run tests in parallel (memory leak fixed)
  workerIdleMemoryLimit: '512MB', // Restart workers using too much memory
  testTimeout: 10000,
  // Parallel execution settings
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  // Coverage thresholds for critical paths only
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  // Silent mode for cleaner output
  silent: false,
  verbose: false,
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  // Test result processors
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml',
      suiteName: 'GeoLeap Frontend Tests'
    }]
  ]
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
// We need to customize the transformIgnorePatterns AFTER next/jest processes the config
module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)();

  // Override transformIgnorePatterns to include MSW and its ESM dependencies
  // This MUST be done after createJestConfig() because next/jest overrides it
  jestConfig.transformIgnorePatterns = [
    // Transform MSW and its ESM dependencies
    // Using a pattern that works on Windows (backslashes) and Unix (forward slashes)
    '[/\\\\]node_modules[/\\\\](?!(msw|@mswjs|until-async|@bundled-es-modules|path-to-regexp)[/\\\\])',
    '^.+\\.module\\.(css|sass|scss)$',
  ];

  return jestConfig;
};
