/**
 * MSW Polyfills for React Native
 *
 * MSW relies on standard JavaScript classes that are not present in React Native.
 * These polyfills must be loaded BEFORE MSW is used.
 *
 * CRITICAL: This file must be the FIRST setup file in jest.config.js setupFilesAfterEnv.
 *
 * @see https://mswjs.io/docs/integrations/react-native/
 */

// Require polyfills for missing standard JavaScript classes
require('fast-text-encoding');
require('react-native-url-polyfill/auto');
