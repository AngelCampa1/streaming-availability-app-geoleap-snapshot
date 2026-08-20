/**
 * Jest Configuration for Detox E2E Tests
 * Week 4 Day 19: End-to-End Testing
 */

module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.e2e.test.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  bail: false,
  collectCoverage: false
};
