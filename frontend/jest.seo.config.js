/**
 * Jest configuration for SEO test suite
 * Optimized for testing SEO-related functionality with appropriate setup and teardown
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'SEO Test Suite',
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/seo-test-setup.ts'],
  
  // Test match patterns - only run SEO-related tests
  testMatch: [
    '<rootDir>/src/lib/seo/**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/seo/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/performance/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/accessibility/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/responsive/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/e2e/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/__tests__/load/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/app/content/[type]/[slug]/__tests__/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/lib/seo/**/*.{js,jsx,ts,tsx}',
    'src/app/content/**/*.{js,jsx,ts,tsx}',
    'src/components/content/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/lib/seo/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Performance settings
  maxWorkers: '50%',
  testTimeout: 30000, // 30 seconds for load tests
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Global variables
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  
  // Test reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results/seo',
        outputName: 'seo-test-results.xml',
        suiteName: 'SEO Test Suite',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './test-results/seo',
        filename: 'seo-test-report.html',
        pageTitle: 'SEO Test Results',
        expand: true,
      },
    ],
  ],
  
  // Verbose output for debugging
  verbose: process.env.CI ? false : true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache/seo',
  
  // Test result processor for performance metrics
  testResultsProcessor: '<rootDir>/src/__tests__/utils/seo-test-processor.js',
};

// Export Jest configuration
module.exports = createJestConfig(customJestConfig);