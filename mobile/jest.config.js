module.exports = {
  preset: 'react-native',
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: false,
    doNotFake: ['nextTick', 'setImmediate'],
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/jest.setup.msw-polyfills.js', // MSW polyfills (not used but kept for future)
    '<rootDir>/src/__tests__/setup/jest.setup.platform.js',
    '<rootDir>/src/__tests__/setup/jest.setup.libraries.js',
    '<rootDir>/src/__tests__/setup/jest.setup.network-mock.js', // Mock NetworkService to prevent background tests
    '<rootDir>/src/__tests__/setup/jest.setup.fetch-mock.js', // Manual fetch mock (MSW alternative - WORKING)
    '<rootDir>/src/__tests__/setup/jest.setup.cleanup.js', // Global cleanup to prevent memory leaks
    // '<rootDir>/src/__tests__/setup/jest.setup.app.js', // MSW server setup - DISABLED (MSW v2 incompatible with RN Jest)
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/*.(test|spec).[jt]s?(x)',
    '!**/__tests__/__mocks__/**',
    '!**/__mocks__/**'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/GeoLeapMobileFresh/',
    '/legacy/',
    '/disabled/',
    '/__mocks__/',
    '/audit-regression/',
    '/performance/',
    'analytics-comprehensive.test.ts',
    '/e2e/',
    '/integration/critical-paths/',
    '/__known-issues__',
    '/accessibility/',
    // Memory-intensive test (57 tests with global state) - run separately with high memory
    'useApi.test.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons|react-native-reanimated|@tanstack|uuid|expo|expo-.*|@expo|msw|@mswjs|@open-draft|outvariant|strict-event-emitter|until-async|@inquirer|headers-polyfill|is-node-process|react-native-url-polyfill|fast-text-encoding)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/$1',
    '^@assets/(.*)': '<rootDir>/assets/$1',
    // Mock static assets (images, fonts, etc.)
    '\\.(jpg|jpeg|png|gif|svg|ttf|woff|woff2)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/__mocks__/**',
    '!src/legacy/**',
    '!src/disabled/**'
  ]
};
