/* eslint-disable @typescript-eslint/no-require-imports */
// Test setup for React Native mobile app
import 'react-native-gesture-handler/jestSetup';
import '@testing-library/react-native';
import { logger } from './utils/logger';
import { server } from './mocks/server';

// ============================================================================
// MSW Server Lifecycle
// ============================================================================

// Start MSW server before all tests
beforeAll(async () => {
  // Start MSW server
  server.listen({
    onUnhandledRequest: 'warn', // Warn about requests without handlers
  });

  // Install detox worker for E2E tests (only if detox is available)
  try {
    const detoxModule = await import('detox');
    // @ts-expect-error - Detox init method
    if (detoxModule.default && typeof detoxModule.default.init === 'function') {
      // @ts-expect-error - Detox init method
      await detoxModule.default.init();
    }
  } catch (error) {
    // Detox not available, skip initialization for unit tests
    logger.debug('[setupTests] Detox not available, skipping initialization for unit tests');
  }
});

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  AppState: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    currentState: 'active',
  },
  Alert: {
    alert: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((layoutSize) => Math.round(layoutSize * 2)),
    roundToNearestPixel: jest.fn((layoutSize) => Math.round(layoutSize * 2) / 2),
  },
  Linking: {
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    openURL: jest.fn(() => Promise.resolve()),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  useColorScheme: jest.fn(() => 'light'),
  Animated: {
    Value: jest.fn().mockImplementation(function(value) {
      this.value = value;
      this.setValue = jest.fn((v) => { this.value = v; });
      this.addListener = jest.fn();
      this.removeListener = jest.fn();
      this.interpolate = jest.fn(() => this);
      return this;
    }),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback({ finished: true })),
    })),
    loop: jest.fn((animation) => ({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    event: jest.fn(() => jest.fn()),
    createAnimatedComponent: jest.fn((Component) => Component),
    View: 'Animated.View',
    Text: 'Animated.Text',
    Image: 'Animated.Image',
    ScrollView: 'Animated.ScrollView',
  },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
    compose: (style1: unknown, style2: unknown) => [style1, style2],
    hairlineWidth: 1,
    absoluteFill: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    absoluteFillObject: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    // Add roundToNearestPixel to StyleSheet as well since some code uses it from StyleSheet
    roundToNearestPixel: jest.fn((layoutSize) => Math.round(layoutSize * 2) / 2),
  },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  // Fix AccessibilityInfo to return proper boolean values
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(true)),
    isHighContrastEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
    isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
    isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
    isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
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
}));


// Mock Expo Notifications (this app uses expo-notifications with Azure Notification Hubs)
jest.mock("expo-notifications", () => ({
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: "mock-expo-push-token" })),
  getDevicePushTokenAsync: jest.fn(() => Promise.resolve({ data: "mock-device-push-token" })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted", granted: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted", granted: true })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  setBadgeCountAsync: jest.fn(() => Promise.resolve(true)),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("mock-notification-id")),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getPresentedNotificationsAsync: jest.fn(() => Promise.resolve([])),
  dismissNotificationAsync: jest.fn(() => Promise.resolve()),
  dismissAllNotificationsAsync: jest.fn(() => Promise.resolve()),
  setNotificationHandler: jest.fn(),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, LOW: 2, MAX: 5, MIN: 1, NONE: 0 },
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

// Mock Voice
jest.mock('@react-native-voice/voice', () => ({
  default: {
    isRecognitionAvailable: jest.fn(() => Promise.resolve(true)),
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(() => Promise.resolve()),
    removeAllListeners: jest.fn(),
  },
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
    key: 'test-route-key',
    name: 'TestScreen',
  }),
  NavigationContainer: ({ children }: { children: any }) => children,
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
}));

// Mock stack navigator
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: any }) => children,
    Screen: ({ children }: { children: any }) => children,
  }),
  CardStyleInterpolators: {
    forHorizontalIOS: {},
    forVerticalIOS: {},
    forModalPresentationIOS: {},
    forFadeFromBottomAndroid: {},
  },
  TransitionSpecs: {
    TransitionIOSSpec: {},
    FadeInFromBottomAndroidSpec: {},
  },
  HeaderStyleInterpolators: {
    forUIKit: {},
    forFade: {},
    forStatic: {},
  },
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: any }) => children,
  SafeAreaView: ({ children }: { children: any }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  initialWindowMetrics: {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    frame: { width: 390, height: 844, x: 0, y: 0 },
  },
}));

// Mock React Native Paper
jest.mock('react-native-paper', () => ({
  Provider: ({ children }: { children: any }) => children,
  DefaultTheme: {},
  PaperProvider: ({ children }: { children: any }) => children,
}));

// Mock expo-modules-core EventEmitter
jest.mock('expo-modules-core', () => ({
  EventEmitter: class MockEventEmitter {
    addListener = jest.fn();
    removeListener = jest.fn();
    removeAllListeners = jest.fn();
    emit = jest.fn();
    listenerCount = jest.fn(() => 0);
  },
  requireNativeModule: jest.fn(() => ({})),
  requireNativeViewManager: jest.fn(() => jest.fn()),
  NativeModulesProxy: {},
  Platform: { OS: 'ios' },
  requireOptionalNativeModule: jest.fn(() => null),
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'success', url: 'https://example.com' })),
  dismissBrowser: jest.fn(),
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn(),
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'https://example.com/redirect'),
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
  useAutoDiscovery: jest.fn(() => ({ authorizationEndpoint: 'https://example.com/auth' })),
  ResponseType: { Code: 'code' },
  Prompt: { Login: 'login' },
}));

// Mock @react-native-community/netinfo with NetworkSimulator support
jest.mock('@react-native-community/netinfo', () => {
  // Import NetworkSimulator if available
  let NetworkSimulator: any;
  try {
    NetworkSimulator = require('./__tests__/utils/networkSimulator').NetworkSimulator;
  } catch {
    // NetworkSimulator not available yet, use static mock
    NetworkSimulator = null;
  }

  const defaultState = {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      ssid: 'test-network',
      strength: 100,
      ipAddress: '192.168.1.1',
      subnet: '255.255.255.0',
    },
  };

  return {
    fetch: jest.fn(() => {
      const state = NetworkSimulator ? NetworkSimulator.getCurrentState() : defaultState;
      return Promise.resolve(state);
    }),
    addEventListener: jest.fn((callback) => {
      if (NetworkSimulator) {
        return NetworkSimulator.subscribe(callback);
      }
      return jest.fn(); // Unsubscribe function
    }),
    useNetInfo: () => {
      const state = NetworkSimulator ? NetworkSimulator.getCurrentState() : defaultState;
      return state;
    },
    NetInfoStateType: {
      unknown: 'unknown',
      none: 'none',
      cellular: 'cellular',
      wifi: 'wifi',
      bluetooth: 'bluetooth',
      ethernet: 'ethernet',
      wimax: 'wimax',
      vpn: 'vpn',
      other: 'other',
    },
  };
});

// Mock theme service dependencies only if they're used
(global as any).NativeModules = (global as any).NativeModules || {};
(global as any).NativeModules.RNCAppearance = {
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn(),
  initialColorScheme: 'light',
};

// Add beforeEach cleanup for better test isolation
beforeEach(() => {
  jest.clearAllMocks();
  // Reset MSW handlers to ensure test isolation
  server.resetHandlers();
});

// Add afterEach cleanup to prevent worker process issues
afterEach(() => {
  // Clean up any timers or intervals only if fake timers are used
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
  }

  // Clear mock call history but preserve implementations
  // Using clearAllMocks() instead of resetAllMocks() to avoid breaking module mocks
  jest.clearAllMocks();
});

// Silence warnings
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (...args) => {
  if (
    args[0]?.includes?.('React.createElement: type is invalid') ||
    args[0]?.includes?.('componentWillReceiveProps') ||
    args[0]?.includes?.('Warning: ')
  ) {
    return;
  }
  originalWarn(...args);
};

console.error = (...args) => {
  if (
    args[0]?.includes?.('Login failed:') ||
    args[0]?.includes?.('Biometric authentication failed:') || args[0]?.includes?.('Biometric availability check failed:') ||
    args[0]?.includes?.('Failed to') || args[0]?.includes?.('Google login failed:') || args[0]?.includes?.('Apple login failed:') ||
    args[0]?.includes?.('Facebook login failed:') ||
    args[0]?.includes?.('Warning: An update to TestComponent inside a test was not wrapped in act') ||
    args[0]?.includes?.('Query data cannot be undefined') ||
    args[0]?.includes?.('This ensures that you\'re testing the behavior')
  ) {
    return; // Suppress expected test errors
  }
  originalError(...args);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  // Suppress expected test failures
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as Error).message;
    if (message.includes('Invalid email format') ||
        message.includes('Biometric authentication is not enabled') ||
        message.includes('Storage error') ||
        message.includes('Service unavailable')) {
      return;
    }
  }
});

// Mock logger utility (uses manual mock from src/__mocks__/utils/logger.ts)
jest.mock('./utils/logger');

// Add global test timeout to prevent worker issues
jest.setTimeout(30000);

// Close MSW server after all tests
afterAll(() => {
  server.close();
});

// expo-local-authentication is mocked in jest.setup.js
