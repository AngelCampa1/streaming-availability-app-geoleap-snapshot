/* eslint-env jest */
// Mock React Native components and modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return Object.setPrototypeOf(
    {
      ...RN,
      Platform: {
        ...RN.Platform,
        OS: 'ios',
        select: jest.fn(obj => obj.ios),
      },
      Alert: {
        alert: jest.fn(),
      },
      Dimensions: {
        get: jest.fn(() => ({ width: 375, height: 812 })),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      PermissionsAndroid: {
        request: jest.fn(() => Promise.resolve('granted')),
        check: jest.fn(() => Promise.resolve(true)),
        PERMISSIONS: {
          CAMERA: 'android.permission.CAMERA',
          RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
        },
        RESULTS: {
          GRANTED: 'granted',
          DENIED: 'denied',
        },
      },
    },
    RN,
  );
});

// Mock React Native Voice
jest.mock('@react-native-voice/voice', () => ({
  SpeechRecognizer: {
    isRecognitionAvailable: jest.fn(() => Promise.resolve(true)),
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(() => Promise.resolve()),
    removeAllListeners: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

// Mock React Native Camera
jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getAvailableCameraDevices: jest.fn(() => Promise.resolve([])),
    getCameraPermissionStatus: jest.fn(() => Promise.resolve('granted')),
    requestCameraPermission: jest.fn(() => Promise.resolve('granted')),
  },
  useCameraDevices: jest.fn(() => ({ back: { id: 'back' } })),
  useFrameProcessor: jest.fn(),
}));

// Mock QR Code Scanner
jest.mock('react-native-qrcode-scanner', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    const MockView = require('react-native').View;
    return React.createElement(MockView, { testID: 'qr-scanner', ref });
  });
});

// Mock React Native SVG
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  G: 'G',
  Circle: 'Circle',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// Mock React Native Modal
jest.mock('react-native-modal', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    const MockView = require('react-native').View;
    return React.createElement(MockView, {
      testID: 'modal',
      ref,
      style: props.isVisible ? {} : { display: 'none' },
    }, props.children);
  });
});

// Global mocks
global.__DEV__ = true;
global.fetch = jest.fn();
global.FormData = jest.fn();
global.Blob = jest.fn();

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('React.createElement: type is invalid')) {
    return;
  }
  originalWarn(...args);
};
