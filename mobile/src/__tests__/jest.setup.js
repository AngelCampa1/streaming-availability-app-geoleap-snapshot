/**
 * Jest Setup File for React Native Testing
 * This file configures mocks for all React Native tests
 *
 * MSW (Mock Service Worker) is set up globally for all tests.
 * It intercepts HTTP requests at the network level, allowing tests
 * to use real service implementations while mocking API responses.
 */

// ============================================================================
// MSW Server Setup - MUST be early to intercept all HTTP requests
// ============================================================================
import { server } from'../mocks/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest:'bypass', // Don't warn about unhandled requests
  });
});

// Reset handlers after each test to prevent test pollution
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Mock NativeEventEmitter early to prevent warnings
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
    listenerCount: jest.fn(() => 0),
  }));
});

// Mock SettingsManager early to prevent TurboModuleRegistry errors
jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  getConstants: jest.fn(() => ({})),
}));

// Mock NativeDeviceInfo early (handle different RN versions)
try {
  jest.mock('react-native/Libraries/Utilities/NativeDeviceInfo', () => ({
    getConstants: jest.fn(() => ({
      Dimensions: {
        window: { width: 375, height: 667, scale: 2, fontScale: 1 },
        screen: { width: 375, height: 667, scale: 2, fontScale: 1 },
      },
    })),
  }));
} catch (_e) {
  // Module path doesn't exist in this RN version
}

// Mock NativePlatformConstantsIOS early (handle different RN versions)
try {
  jest.mock('react-native/Libraries/Utilities/NativePlatformConstantsIOS', () => ({
    getConstants: jest.fn(() => ({
      forceTouchAvailable: false,
      osVersion:'14.0',
      systemName:'iOS',
      interfaceIdiom:'phone',
    })),
  }));
} catch (_e) {
  // Module path doesn't exist in this RN version
}

// Mock PixelRatio early to prevent undefined errors
try {
  jest.mock('react-native/Libraries/Utilities/PixelRatio', () => ({
    __esModule: true,
    default: {
      get: jest.fn(() => 2),
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn((layoutSize) => Math.round(layoutSize * 2)),
      roundToNearestPixel: jest.fn((layoutSize) => Math.round(layoutSize * 2)),
    },
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((layoutSize) => Math.round(layoutSize * 2)),
    roundToNearestPixel: jest.fn((layoutSize) => Math.round(layoutSize * 2)),
  }));
} catch (_e) {
  // Module path doesn't exist in this RN version
}

// Mock NativeI18nManager early
jest.mock('react-native/Libraries/ReactNative/NativeI18nManager', () => ({
  getConstants: jest.fn(() => ({
    isRTL: false,
    doLeftAndRightSwapInRTL: true,
  })),
}));

// Mock TurboModuleRegistry early
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  get: jest.fn(() => ({})),
  getEnforcing: jest.fn(() => ({})),
}));

// Mock ThemeProvider to provide theme context for all tests
jest.mock('../theme/ThemeProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const React = require('react');

  // Mock theme object matching UnifiedTheme interface
  const mockTheme = {
    spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96, 32: 128 },
    typography: {
      fontFamily: { ios: { regular:'System' }, android: { regular:'Roboto' } },
      fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20,'2xl': 24,'3xl': 30,'4xl': 36 },
      fontWeight: { normal:'400', medium:'500', semibold:'600', bold:'700' },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
      letterSpacing: { tight: -0.5, normal: 0, wide: 0.5 },
    },
    colors: {
      primary: { 500:'#3b82f6', 600:'#2563eb' },
      secondary: { 500:'#64748b' },
      success: { 500:'#22c55e' },
      error: { 500:'#ef4444' },
      warning: { 500:'#f59e0b' },
      info: { 500:'#3b82f6' },
      gray: { 100:'#f3f4f6', 200:'#e5e7eb', 300:'#d1d5db', 400:'#9ca3af', 500:'#6b7280', 600:'#4b5563', 700:'#374151', 800:'#1f2937', 900:'#111827' },
      neutral: { 50:'#fafafa', 100:'#f5f5f5', 200:'#e5e5e5', 300:'#d4d4d4', 400:'#a3a3a3', 500:'#737373', 600:'#525252', 700:'#404040', 800:'#262626', 900:'#171717' },
      overlay: { lightest:'rgba(0, 0, 0, 0.05)', light:'rgba(0, 0, 0, 0.1)', medium:'rgba(0, 0, 0, 0.3)', darkStrong:'rgba(0, 0, 0, 0.5)', darkest:'rgba(0, 0, 0, 0.75)' },
      white:'#ffffff',
      black:'#000000',
    },
    borderRadius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    shadows: { sm: {}, md: {}, lg: {} },
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
    animations: { duration: { fast: 150, normal: 300, slow: 500 } },
    zIndex: { modal: 1000, overlay: 900, dropdown: 800 },
    components: {},
    semantic: {
      text: { primary:'#111827', secondary:'#6b7280', tertiary:'#9ca3af', inverse:'#ffffff' },
      background: { primary:'#ffffff', secondary:'#f9fafb', tertiary:'#f3f4f6', inverse:'#111827' },
      border: { primary:'#e5e7eb', secondary:'#d1d5db' },
      status: { success:'#22c55e', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' },
    },
    mode:'light',
    isDark: false,
  };

  const mockContextValue = {
    theme: mockTheme,
    themeMode:'light',
    isDark: false,
    toggleTheme: jest.fn(),
    setTheme: jest.fn(),
    highContrast: false,
    setHighContrast: jest.fn(),
    reducedMotion: false,
    setReducedMotion: jest.fn(),
  };

  return {
    __esModule: true,
    default: ({ children }) => children,
    ThemeProvider: ({ children }) => children,
    useTheme: () => mockContextValue,
  };
});


import'react-native-gesture-handler/jestSetup';

// Mock expo-image (replaced react-native-fast-image)
jest.mock('expo-image', () => {
  const React = require('react');
  const { Image: RNImage } = require('react-native');

  const MockImage = React.forwardRef((props, ref) => {
    const { source, contentFit, ...otherProps } = props;
    // Convert expo-image source format to react-native Image source format
    const imageSource = typeof source ==='string'
      ? { uri: source }
      : source && source.uri
        ? { uri: source.uri }
        : source;

    // Map contentFit to resizeMode for RN Image
    const resizeMode = contentFit ==='cover' ?'cover'
      : contentFit ==='contain' ?'contain'
      : contentFit ==='fill' ?'stretch'
      : contentFit ==='none' ?'center'
      :'cover';

    return React.createElement(RNImage, {
      ...otherProps,
      source: imageSource,
      resizeMode,
      ref,
      testID: otherProps.testID ||'expo-image',
    });
  });
  MockImage.displayName ='ExpoImage';

  // Add static methods
  MockImage.prefetch = jest.fn(() => Promise.resolve(true));
  MockImage.clearMemoryCache = jest.fn(() => Promise.resolve());
  MockImage.clearDiskCache = jest.fn(() => Promise.resolve());
  MockImage.getCachePathAsync = jest.fn(() => Promise.resolve(null));

  return {
    __esModule: true,
    Image: MockImage,
    default: { Image: MockImage },
  };
});

// Mock expo-local-authentication (replaced react-native-biometrics)
jest.mock('expo-local-authentication', () => ({
  __esModule: true,
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  getEnrolledLevelAsync: jest.fn(() => Promise.resolve(3)), // BIOMETRIC_STRONG
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])), // FINGERPRINT, FACIAL_RECOGNITION
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  cancelAuthenticate: jest.fn(() => Promise.resolve()),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  SecurityLevel: {
    NONE: 0,
    SECRET: 1,
    BIOMETRIC_WEAK: 2,
    BIOMETRIC_STRONG: 3,
  },
  default: {
    hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
    isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
    getEnrolledLevelAsync: jest.fn(() => Promise.resolve(3)),
    supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
    authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
    cancelAuthenticate: jest.fn(() => Promise.resolve()),
  },
}));

// Mock expo-constants
jest.mock('expo-constants', () => {
  const Constants = {
    expoConfig: {
      name:'GeoLeap',
      version:'1.0.0',
      extra: {},
    },
    manifest: {
      name:'GeoLeap',
      version:'1.0.0',
    },
    platform: {
      ios: {
        buildNumber:'1',
      },
      android: {
        versionCode: 1,
      },
    },
    isDevice: false,
    systemVersion:'14.0',
    deviceName:'Test Device',
    EXDevLauncher: undefined,
  };

  return {
    __esModule: true,
    default: Constants,
    ...Constants,
  };
});

// Mock react-native-reanimated with comprehensive Animated API support
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  // Create a proper Animated Value class for reanimated
  class ReanimatedMockValue {
    constructor(value = 0) {
      this._value = value;
      this.setValue = jest.fn((newValue) => {
        this._value = newValue;
        this.value = newValue; // Also update the value property
      });
      this.addListener = jest.fn(() =>'mock-listener-id');
      this.removeListener = jest.fn();
      this.removeAllListeners = jest.fn();
      this.stopAnimation = jest.fn();
      this.resetAnimation = jest.fn();
      this.__attach = jest.fn();
      this.__detach = jest.fn();
      this.__isNative = false;
      this.__makeNative = jest.fn();
      this.__getNativeConfig = jest.fn(() => ({}));
    }

    // Add getter and setter for value property
    get value() {
      return this._value;
    }

    set value(newValue) {
      this._value = newValue;
    }

    // Add static methods for Animated.Value
    static add(a, b) {
      return new ReanimatedMockValue((a?.value || 0) + (b?.value || 0));
    }

    static subtract(a, b) {
      return new ReanimatedMockValue((a?.value || 0) - (b?.value || 0));
    }

    static divide(a, b) {
      return new ReanimatedMockValue((a?.value || 0) / (b?.value || 1));
    }

    static multiply(a, b) {
      return new ReanimatedMockValue((a?.value || 0) * (b?.value || 0));
    }

    static eq(a, b) {
      return new ReanimatedMockValue(a?.value === b?.value ? 1 : 0);
    }

    static cond(condition, thenNode, elseNode) {
      return new ReanimatedMockValue(condition ? thenNode?.value || 0 : elseNode?.value || 0);
    }

    static set(condition, value) {
      return new ReanimatedMockValue(condition ? value?.value || 0 : 0);
    }

    static block(block) {
      return new ReanimatedMockValue(block?.value || 0);
    }

    static call(_fn, ..._args) {
      return new ReanimatedMockValue(0);
    }

    static event(..._args) {
      return jest.fn(() => new ReanimatedMockValue(0));
    }

    // Add interpolation method
    interpolate(_config) {
      return new ReanimatedMockValue(this.value);
    }

    // Add other Animated methods
    static timing(_duration, _config = {}) {
      return new ReanimatedMockValue(0);
    }

    static spring(_config = {}) {
      return new ReanimatedMockValue(0);
    }

    static decay(_config = {}) {
      return new ReanimatedMockValue(0);
    }

    static sequence(..._animations) {
      return new ReanimatedMockValue(0);
    }

    static parallel(..._animations) {
      return new ReanimatedMockValue(0);
    }

    static stagger(..._animations) {
      return new ReanimatedMockValue(0);
    }

    static loop(animation, _config) {
      return animation;
    }

    static delay(_duration) {
      return new ReanimatedMockValue(0);
    }
  }

  // Add Animated object with all methods
  const _Animated = {
    Value: ReanimatedMockValue,
    View: React.forwardRef((props, ref) => {
      return React.createElement(View, { ...props, ref });
    }),
    Text: React.forwardRef((props, ref) => {
      const { Text } = require('react-native');
      return React.createElement(Text, { ...props, ref });
    }),
    Image: React.forwardRef((props, ref) => {
      const { Image } = require('react-native');
      return React.createElement(Image, { ...props, ref });
    }),
    ScrollView: React.forwardRef((props, ref) => {
      const { ScrollView } = require('react-native');
      return React.createElement(ScrollView, { ...props, ref });
    }),
    createAnimatedComponent: jest.fn((Component) => {
      const AnimatedComponent = React.forwardRef((props, ref) => {
        return React.createElement(View, { ...props, ref });
      });
      AnimatedComponent.displayName = `Animated(${Component.displayName || Component.name})`;
      return AnimatedComponent;
    }),
    event: jest.fn(() => jest.fn()),
    add: ReanimatedMockValue.add,
    subtract: ReanimatedMockValue.subtract,
    divide: ReanimatedMockValue.divide,
    multiply: ReanimatedMockValue.multiply,
    eq: ReanimatedMockValue.eq,
    cond: ReanimatedMockValue.cond,
    set: ReanimatedMockValue.set,
    block: ReanimatedMockValue.block,
    call: ReanimatedMockValue.call,
    timing: ReanimatedMockValue.timing,
    spring: ReanimatedMockValue.spring,
    decay: ReanimatedMockValue.decay,
    sequence: ReanimatedMockValue.sequence,
    parallel: ReanimatedMockValue.parallel,
    stagger: ReanimatedMockValue.stagger,
    loop: ReanimatedMockValue.loop,
    delay: ReanimatedMockValue.delay,
    interpolate: function(value) { return value; },
  };

  const MockAnimatedComponent = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    return React.createElement(View, {
      ...otherProps,
      ref,
      testID: otherProps.testID ||'animated-component',
    }, children);
  });
  MockAnimatedComponent.displayName ='AnimatedComponent';

  // Create specific animated component mocks that properly render their content
  const MockAnimatedView = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { View } = require('react-native');
    return React.createElement(View, {
      ...otherProps,
      ref,
      testID: otherProps.testID ||'animated-view',
    }, children);
  });
  MockAnimatedView.displayName ='AnimatedView';

  const MockAnimatedText = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { Text } = require('react-native');
    return React.createElement(Text, {
      ...otherProps,
      ref,
      testID: otherProps.testID ||'animated-text',
    }, children);
  });
  MockAnimatedText.displayName ='AnimatedText';

  const MockAnimatedImage = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { Image } = require('react-native');
    return React.createElement(Image, {
      ...otherProps,
      ref,
      testID: otherProps.testID ||'animated-image',
    }, children);
  });
  MockAnimatedImage.displayName ='AnimatedImage';

  const MockAnimatedScrollView = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { ScrollView } = require('react-native');
    return React.createElement(ScrollView, {
      ...otherProps,
      ref,
      testID: otherProps.testID ||'animated-scroll-view',
    }, children);
  });
  MockAnimatedScrollView.displayName ='AnimatedScrollView';

  const MockAnimatedFlatList = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { FlatList } = require('react-native');
    return React.createElement(FlatList, {
      ...otherProps,
      ref,
      testID: otherProps.testID ||'animated-flat-list',
    }, children);
  });
  MockAnimatedFlatList.displayName ='AnimatedFlatList';

  // Create the reanimated mock object
  const reanimatedMock = {
    createAnimatedComponent: jest.fn((_Component) => MockAnimatedComponent),
    Value: ReanimatedMockValue,
    event: jest.fn(() => jest.fn()),
    add: jest.fn(() => new ReanimatedMockValue()),
    eq: jest.fn(() => new ReanimatedMockValue()),
    set: jest.fn(() => new ReanimatedMockValue()),
    cond: jest.fn(() => new ReanimatedMockValue()),
    interpolate: jest.fn(() => new ReanimatedMockValue()),
    block: jest.fn(() => new ReanimatedMockValue()),
    call: jest.fn(() => new ReanimatedMockValue()),
    clockRunning: jest.fn(() => new ReanimatedMockValue()),
    debug: jest.fn(() => new ReanimatedMockValue()),
    useSharedValue: jest.fn((value) => new ReanimatedMockValue(value)),
    useAnimatedStyle: jest.fn((_worklet) => {
      // For tests, always return visible content regardless of animation state
      // This ensures that Text content inside Animated components is always visible for testing
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }),
    useAnimatedProps: jest.fn(() => ({})),
    useDerivedValue: jest.fn(() => new ReanimatedMockValue()),
    useAnimatedReaction: jest.fn(() => jest.fn()),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    withSpring: jest.fn(() => new ReanimatedMockValue()),
    withTiming: jest.fn((toValue, config, callback) => {
      // For tests, create a new animated value set to the target value immediately
      const result = new ReanimatedMockValue(toValue);

      // Simulate immediate completion for tests
      if (callback) {
        setTimeout(() => callback(true), 0);
      }

      return result;
    }),
    withDecay: jest.fn(() => new ReanimatedMockValue()),
    withRepeat: jest.fn(() => new ReanimatedMockValue()),
    withSequence: jest.fn(() => new ReanimatedMockValue()),
    runOnUI: jest.fn(() => jest.fn()),
    runOnJS: jest.fn(() => jest.fn()),
    // Add animated components with proper implementations
    View: MockAnimatedView,
    Text: MockAnimatedText,
    Image: MockAnimatedImage,
    ScrollView: MockAnimatedScrollView,
    FlatList: MockAnimatedFlatList,
  };

  // Return with both default export and named exports
  reanimatedMock.default = reanimatedMock;

  // Note: Self-assignment removed as it's not needed for the mock

  return reanimatedMock;
});

// Enhanced react-native-vector-icons mock with consistent export patterns
jest.mock('react-native-vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color ='black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole:'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color ==='#ccc' ?'#ccc' :'black',
        justifyContent:'center',
        alignItems:'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color:'white',
        fontSize: size * 0.6,
        fontFamily:'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() :'I'));
  };

  // Support both default and named exports
  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

// Mock other icon libraries with consistent patterns - avoid circular dependencies
jest.mock('react-native-vector-icons/FontAwesome', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color ='black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole:'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color ==='#ccc' ?'#ccc' :'black',
        justifyContent:'center',
        alignItems:'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color:'white',
        fontSize: size * 0.6,
        fontFamily:'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() :'F'));
  };

  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color ='black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole:'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color ==='#ccc' ?'#ccc' :'black',
        justifyContent:'center',
        alignItems:'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color:'white',
        fontSize: size * 0.6,
        fontFamily:'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() :'I'));
  };

  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

jest.mock('react-native-vector-icons/Feather', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color ='black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole:'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color ==='#ccc' ?'#ccc' :'black',
        justifyContent:'center',
        alignItems:'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color:'white',
        fontSize: size * 0.6,
        fontFamily:'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() :'F'));
  };

  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

jest.mock('react-native-vector-icons', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color ='black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole:'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color ==='#ccc' ?'#ccc' :'black',
        justifyContent:'center',
        alignItems:'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color:'white',
        fontSize: size * 0.6,
        fontFamily:'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() :'V'));
  };

  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

// Note: expo-image mock is defined above (replaced react-native-fast-image)

// Mock Animated infrastructure before React Native
jest.mock('react-native/src/private/animated/NativeAnimatedHelper', () => ({
  queue: [],
  disableQueue: jest.fn(),
  enableQueue: jest.fn(),
  flushQueue: jest.fn(),
  updateSharedAnimations: jest.fn(),
  setShouldFlushNativeAnimations: jest.fn(),
}));

jest.mock('react-native/Libraries/Animated/nodes/AnimatedNode.js', () => ({
  startListeningToAnimatedNodeValue: jest.fn(),
  stopListeningToAnimatedNodeValue: jest.fn(),
}));

jest.mock('react-native/Libraries/Animated/nodes/AnimatedWithChildren.js', () => ({}));

jest.mock('react-native/Libraries/Animated/nodes/AnimatedInterpolation.js', () => ({}));

jest.mock('react-native/Libraries/Animated/nodes/AnimatedValue.js', () => ({}));

jest.mock('react-native/Libraries/Animated/nodes/AnimatedObject.js', () => ({}));

jest.mock('react-native/Libraries/Animated/nodes/AnimatedProps.js', () => ({}));

jest.mock('react-native/Libraries/Animated/useAnimatedProps.js', () => ({}));

jest.mock('react-native/Libraries/Animated/createAnimatedComponent.js', () => ({}));

jest.mock('react-native/Libraries/Animated/AnimatedMock.js', () => ({}));

jest.mock('react-native/Libraries/Animated/Animated.js', () => {
  // Create a proper Animated Value class for native React Native Animated
  class NativeAnimatedValue {
    constructor(value = 0) {
      this.value = value;
      this.setValue = jest.fn((newValue) => { this.value = newValue; });
      this.addListener = jest.fn(() =>'mock-listener-id');
      this.removeListener = jest.fn();
      this.removeAllListeners = jest.fn();
      this.stopAnimation = jest.fn();
      this.resetAnimation = jest.fn();
      this.extractOffset = jest.fn();
      this.flattenOffset = jest.fn();
      this.setOffset = jest.fn();
    }

    static add(a, b) {
      return new NativeAnimatedValue((a?.value || 0) + (b?.value || 0));
    }

    static subtract(a, b) {
      return new NativeAnimatedValue((a?.value || 0) - (b?.value || 0));
    }

    static multiply(a, b) {
      return new NativeAnimatedValue((a?.value || 0) * (b?.value || 0));
    }

    static divide(a, b) {
      return new NativeAnimatedValue(b?.value ? (a?.value || 0) / b.value : 0);
    }

    static eq(a, b) {
      return new NativeAnimatedValue(a?.value === b?.value ? 1 : 0);
    }

    static cond(condition, ifBlock, elseBlock) {
      return new NativeAnimatedValue(condition?.value ? ifBlock?.value || 0 : elseBlock?.value || 0);
    }

    static set(value, newValue) {
      return new NativeAnimatedValue(newValue?.value || newValue);
    }

    static block(...values) {
      return new NativeAnimatedValue(values[values.length - 1]?.value || 0);
    }

    static call(_args, _callback) {
      return new NativeAnimatedValue(0);
    }

    static timing(_value, _config) {
      return new NativeAnimatedValue(0);
    }

    static spring(_value, _config) {
      return new NativeAnimatedValue(0);
    }

    static decay(_value, _config) {
      return new NativeAnimatedValue(0);
    }

    static sequence(..._animations) {
      return new NativeAnimatedValue(0);
    }

    static parallel(..._animations) {
      return new NativeAnimatedValue(0);
    }

    static stagger(_delay, _animations) {
      return new NativeAnimatedValue(0);
    }

    static loop(_animation, _config) {
      return new NativeAnimatedValue(0);
    }

    static delay(_duration) {
      return new NativeAnimatedValue(0);
    }

    interpolate(_config) {
      return new NativeAnimatedValue(0);
    }
  }

  return {
    Value: NativeAnimatedValue,
    ValueXY: class {
      constructor(config = {}) {
        this.x = new NativeAnimatedValue(config.x || 0);
        this.y = new NativeAnimatedValue(config.y || 0);
      }
    },
    timing: NativeAnimatedValue.timing,
    spring: NativeAnimatedValue.spring,
    decay: NativeAnimatedValue.decay,
    sequence: NativeAnimatedValue.sequence,
    parallel: NativeAnimatedValue.parallel,
    stagger: NativeAnimatedValue.stagger,
    loop: NativeAnimatedValue.loop,
    delay: NativeAnimatedValue.delay,
    add: NativeAnimatedValue.add,
    subtract: NativeAnimatedValue.subtract,
    multiply: NativeAnimatedValue.multiply,
    divide: NativeAnimatedValue.divide,
    eq: NativeAnimatedValue.eq,
    cond: NativeAnimatedValue.cond,
    set: NativeAnimatedValue.set,
    block: NativeAnimatedValue.block,
    call: NativeAnimatedValue.call,
    event: jest.fn(() => jest.fn()),
    createAnimatedComponent: jest.fn((Component) => Component),
    View: jest.fn(() => null),
    Text: jest.fn(() => null),
    Image: jest.fn(() => null),
    ScrollView: jest.fn(() => null),
  };
});

jest.mock('react-native/Libraries/Animated/AnimatedEvent.js', () => ({}));

jest.mock('react-native/Libraries/Animated/AnimatedImplementation.js', () => ({}));

// Mock react-native SettingsManager and TurboModuleRegistry with Animated API
jest.mock('react-native', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const { View } = RN;

  // Create proper Animated mock inline
  const _mockCreateAnimatedValue = (value = 0) => ({
    value,
    setValue: jest.fn((newValue) => { value = newValue; }),
    addListener: jest.fn(() =>'mock-listener-id'),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    stopAnimation: jest.fn((callback) => callback && callback(value)),
    resetAnimation: jest.fn((callback) => callback && callback(value)),
    start: jest.fn((callback) => callback && callback(value)),
    interpolate: jest.fn(() => mockCreateAnimatedValue()),
    _value: value,
    __attach: jest.fn(),
    __detach: jest.fn(),
    __isNative: false,
    __makeNative: jest.fn(),
    __getNativeConfig: jest.fn(() => ({})),
    _children: [],
    _listeners: {},
  });

  // Create a proper Animated Value constructor
  function MockAnimatedValue(value = 0) {
    this.value = value;
    this.setValue = jest.fn((newValue) => { this.value = newValue; });
    this.addListener = jest.fn(() =>'mock-listener-id');
    this.removeListener = jest.fn();
    this.removeAllListeners = jest.fn();
    this.stopAnimation = jest.fn((callback) => callback && callback(this.value));
    this.resetAnimation = jest.fn((callback) => callback && callback(this.value));
    this.start = jest.fn((callback) => callback && callback(this.value));
    this.interpolate = jest.fn(() => new MockAnimatedValue());
    this._value = value;
    this.__attach = jest.fn();
    this.__detach = jest.fn();
    this.__isNative = false;
    this.__makeNative = jest.fn();
    this.__getNativeConfig = jest.fn(() => ({}));
    this._children = [];
    this._listeners = {};
  }

  const MockAnimated = {
    Value: MockAnimatedValue,
    ValueXY: jest.fn(() => ({
      x: new MockAnimatedValue(),
      y: new MockAnimatedValue(),
      setValue: jest.fn(),
      setOffset: jest.fn(),
      flattenOffset: jest.fn(),
      extractOffset: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      stopAnimation: jest.fn(),
      resetAnimation: jest.fn(),
    })),
    timing: jest.fn(() => new MockAnimatedValue()),
    spring: jest.fn(() => new MockAnimatedValue()),
    decay: jest.fn(() => new MockAnimatedValue()),
    sequence: jest.fn(() => new MockAnimatedValue()),
    parallel: jest.fn(() => new MockAnimatedValue()),
    stagger: jest.fn(() => new MockAnimatedValue()),
    loop: jest.fn((_animation) => {
      const animatedValue = new MockAnimatedValue();
      animatedValue.start = jest.fn();
      animatedValue.stop = jest.fn();
      animatedValue.reset = jest.fn();
      return animatedValue;
    }),
    delay: jest.fn(() => new MockAnimatedValue()),
    event: jest.fn(() => jest.fn()),
    createAnimatedComponent: jest.fn((_Component) => {
      const AnimatedComponent = React.forwardRef((props, ref) => {
        return React.createElement(View, { ...props, ref });
      });
      AnimatedComponent.displayName ='AnimatedComponent';
      return AnimatedComponent;
    }),
    // Add missing Animated components that were causing undefined JSX errors
    View: React.forwardRef((props, ref) => {
      return React.createElement(View, { ...props, ref });
    }),
    Text: React.forwardRef((props, ref) => {
      const { Text } = RN;
      return React.createElement(Text, { ...props, ref });
    }),
    Image: React.forwardRef((props, ref) => {
      const { Image } = RN;
      return React.createElement(Image, { ...props, ref });
    }),
    ScrollView: React.forwardRef((props, ref) => {
      const { ScrollView } = RN;
      return React.createElement(ScrollView, { ...props, ref });
    }),
    FlatList: React.forwardRef((props, ref) => {
      const { FlatList } = RN;
      return React.createElement(FlatList, { ...props, ref });
    }),
    // Add default export for Animated to handle Animated.default.Value calls
    default: {
      Value: MockAnimatedValue,
      ValueXY: jest.fn(() => ({
        x: new MockAnimatedValue(),
        y: new MockAnimatedValue(),
        setValue: jest.fn(),
        setOffset: jest.fn(),
        flattenOffset: jest.fn(),
        extractOffset: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        stopAnimation: jest.fn(),
        resetAnimation: jest.fn(),
      })),
      timing: jest.fn(() => new MockAnimatedValue()),
      spring: jest.fn(() => new MockAnimatedValue()),
      decay: jest.fn(() => new MockAnimatedValue()),
      sequence: jest.fn(() => new MockAnimatedValue()),
      parallel: jest.fn(() => new MockAnimatedValue()),
      stagger: jest.fn(() => new MockAnimatedValue()),
      loop: jest.fn((_animation) => {
        const animatedValue = new MockAnimatedValue();
        animatedValue.start = jest.fn();
        animatedValue.stop = jest.fn();
        animatedValue.reset = jest.fn();
        return animatedValue;
      }),
      delay: jest.fn(() => new MockAnimatedValue()),
      event: jest.fn(() => jest.fn()),
      createAnimatedComponent: jest.fn((_Component) => {
        const AnimatedComponent = React.forwardRef((props, ref) => {
          return React.createElement(View, { ...props, ref });
        });
        AnimatedComponent.displayName ='AnimatedComponent';
        return AnimatedComponent;
      }),
      View: React.forwardRef((props, ref) => {
        return React.createElement(View, { ...props, ref });
      }),
      Text: React.forwardRef((props, ref) => {
        const { Text } = RN;
        return React.createElement(Text, { ...props, ref });
      }),
      Image: React.forwardRef((props, ref) => {
        const { Image } = RN;
        return React.createElement(Image, { ...props, ref });
      }),
      ScrollView: React.forwardRef((props, ref) => {
        const { ScrollView } = RN;
        return React.createElement(ScrollView, { ...props, ref });
      }),
      FlatList: React.forwardRef((props, ref) => {
        const { FlatList } = RN;
        return React.createElement(FlatList, { ...props, ref });
      }),
    },
  };

  // Create mock touchable components inline
  const MockTouchableOpacity = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;

    // Create a simple press handler that respects disabled state
    const handlePress = () => {
      if (!props.disabled && !props.loading && props.onPress) {
        // Call the onPress prop with a synthetic event object
        // This simulates the React Native press event behavior
        const syntheticEvent = {
          nativeEvent: {
            pageX: 0,
            pageY: 0,
            locationX: 0,
            locationY: 0,
            timestamp: Date.now(),
            target: null,
          },
        };
        props.onPress(syntheticEvent);
      }
    };

    return React.createElement(View, {
      ...otherProps,
      ref,
      // Handle press events properly for testing
      onPress: handlePress,
      onTouchStart: handlePress,
      onTouchEnd: handlePress,
      onResponderRelease: handlePress,
      // React Testing Library's fireEvent.press will call onPress prop directly
      // So we need to make sure the onPress prop is available
      onPressIn: props.onPressIn,
      onPressOut: props.onPressOut,
      onLongPress: props.onLongPress,
      testID: props.testID ||'touchable-opacity',
      accessible: props.accessible !== false,
      accessibilityLabel: props.accessibilityLabel,
      accessibilityHint: props.accessibilityHint,
      accessibilityRole: props.accessibilityRole ||'button',
      // Simply pass through the style without complex cleaning to preserve Animated styles
      style: props.style,
      // Preserve TouchableOpacity-specific props
      disabled: props.disabled,
      loading: props.loading,
      // Ensure getByRole can find this element
      role: props.accessibilityRole ||'button','aria-label': props.accessibilityLabel,'aria-role': props.accessibilityRole ||'button',
      // Make sure accessibility properties are preserved
      nativeID: props.nativeID,
    }, children);
  });
  MockTouchableOpacity.displayName ='TouchableOpacity';

  const MockTouchableHighlight = React.forwardRef((props, ref) => {
    return React.createElement(View, {
      ...props,
      ref,
      onTouchStart: props.onPress,
      testID: props.testID ||'touchable-highlight',
    });
  });
  MockTouchableHighlight.displayName ='TouchableHighlight';

  const MockTouchableWithoutFeedback = React.forwardRef((props, ref) => {
    return React.createElement(View, {
      ...props,
      ref,
      onTouchStart: props.onPress,
      testID: props.testID ||'touchable-without-feedback',
    });
  });
  MockTouchableWithoutFeedback.displayName ='TouchableWithoutFeedback';

  return {
    ...RN,
    Animated: MockAnimated,
    TouchableOpacity: MockTouchableOpacity,
    TouchableHighlight: MockTouchableHighlight,
    TouchableWithoutFeedback: MockTouchableWithoutFeedback,
    // Add Linking API
    Linking: {
      canOpenURL: jest.fn(() => Promise.resolve(true)),
      openURL: jest.fn(() => Promise.resolve()),
      getInitialURL: jest.fn(() => Promise.resolve(null)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    // Add Dimensions API
    Dimensions: {
      get: jest.fn((_dim) => ({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1,
      })),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      set: jest.fn(),
    },
    // Add PixelRatio API
    PixelRatio: {
      get: jest.fn(() => 2),
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn((layoutSize) => Math.round(layoutSize * 2)),
      roundToNearestPixel: jest.fn((layoutSize) => Math.round(layoutSize * 2)),
    },
    // Add useColorScheme hook
    useColorScheme: jest.fn(() =>'light'),
    // Add Appearance API for theme tests
    Appearance: {
      getColorScheme: jest.fn(() =>'light'),
      setColorScheme: jest.fn(),
      addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
      removeChangeListener: jest.fn(),
    },
    // Add BackHandler for navigation tests
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },
    // Add StatusBar for platform-specific tests
    StatusBar: {
      setBarStyle: jest.fn(),
      setBackgroundColor: jest.fn(),
      setHidden: jest.fn(),
      setTranslucent: jest.fn(),
      setNetworkActivityIndicatorVisible: jest.fn(),
      currentHeight: 20,
    },
    // Suppress deprecated component warnings
    ProgressBarAndroid: jest.fn(() => null),
    Clipboard: jest.fn(() => null),
    Alert: {
      alert: jest.fn(() => Promise.resolve()),
      prompt: jest.fn(() => Promise.resolve()),
      confirm: jest.fn(() => Promise.resolve()),
    },
    NativeModules: {
      ...RN.NativeModules,
      SettingsManager: {
        settings: {
          getConstants: jest.fn(() => ({})),
        },
      },
      DeviceInfo: {
        getConstants: jest.fn(() => ({
          Dimensions: {
            window: { width: 375, height: 667, scale: 2, fontScale: 1 },
            screen: { width: 375, height: 667, scale: 2, fontScale: 1 },
          },
        })),
      },
      PlatformConstants: {
        getConstants: jest.fn(() => ({
          forceTouchAvailable: false,
          osVersion:'14.0',
          systemName:'iOS',
          interfaceIdiom:'phone',
        })),
      },
      I18nManager: {
        getConstants: jest.fn(() => ({
          isRTL: false,
          doLeftAndRightSwapInRTL: true,
        })),
      },
    },
    TurboModuleRegistry: {
      get: jest.fn((name) => {
        if (name ==='SettingsManager') {
          return {
            settings: {
              getConstants: jest.fn(() => ({})),
            },
          };
        }
        if (name ==='DeviceInfo') {
          return {
            getConstants: jest.fn(() => ({
              Dimensions: {
                window: { width: 375, height: 667, scale: 2, fontScale: 1 },
                screen: { width: 375, height: 667, scale: 2, fontScale: 1 },
              },
            })),
          };
        }
        return {};
      }),
      getEnforcing: jest.fn((name) => {
        if (name ==='SettingsManager') {
          return {
            settings: {
              getConstants: jest.fn(() => ({})),
            },
          };
        }
        if (name ==='DeviceInfo') {
          return {
            getConstants: jest.fn(() => ({
              Dimensions: {
                window: { width: 375, height: 667, scale: 2, fontScale: 1 },
                screen: { width: 375, height: 667, scale: 2, fontScale: 1 },
              },
            })),
          };
        }
        return {};
      }),
    },
    NativeEventEmitter: jest.fn().mockImplementation(() => ({
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      emit: jest.fn(),
    })),
  };
});


// Mock react-native-modal with comprehensive support
jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View, Modal: RNModal } = require('react-native');

  const MockModal = React.forwardRef((props, ref) => {
    const {
      isVisible,
      onBackdropPress,
      onSwipeComplete,
      _swipeDirection,
      style,
      backdropOpacity,
      _animationIn,
      _animationOut,
      _hideModalContentWhileAnimating,
      _useNativeDriverForBackdrop,
      children,
      ...otherProps
    } = props;

    // If not visible, don't render anything
    if (!isVisible) {
      return null;
    }

    // Render children wrapped in a View (similar to react-native-modal behavior)
    return React.createElement(
      RNModal,
      {
        ...otherProps,
        ref,
        visible: isVisible,
        transparent: true,
        animationType:'slide',
        onRequestClose: onBackdropPress || onSwipeComplete,
      },
      React.createElement(
        View,
        {
          style: [
            { flex: 1, backgroundColor: `rgba(0,0,0,${backdropOpacity || 0.5})` },
            style,
          ],
          onStartShouldSetResponder: () => true,
          onResponderRelease: onBackdropPress,
        },
        children
      )
    );
  });
  MockModal.displayName ='MockModal';

  return MockModal;
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  const SafeAreaView = React.forwardRef((props, ref) => {
    return React.createElement(View, { ...props, ref });
  });
  SafeAreaView.displayName ='SafeAreaView';

  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 667 }),
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockGestureHandler = React.forwardRef((props, ref) => {
    return React.createElement(View, { ...props, ref });
  });

  return {
    PanGestureHandler: MockGestureHandler,
    TapGestureHandler: MockGestureHandler,
    LongPressGestureHandler: MockGestureHandler,
    PinchGestureHandler: MockGestureHandler,
    RotationGestureHandler: MockGestureHandler,
    State: {},
    Directions: {},
  };
});

// Mock @shopify/flash-list
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { FlatList } = require('react-native');

  const MockFlashList = React.forwardRef(({ renderItem, data, ...props }, ref) => {
    return React.createElement(FlatList, {
      ...props,
      ref,
      data,
      renderItem,
      testID: props.testID ||'flash-list',
      keyExtractor: props.keyExtractor || ((item, index) => `flash-list-item-${index}`),
    });
  });

  MockFlashList.displayName ='MockFlashList';

  return {
    FlashList: MockFlashList,
    // Add any other exports if needed
    default: MockFlashList,
  };
});


// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
}));

// Mock react-native-voice
jest.mock('@react-native-voice/voice', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  isAvailable: jest.fn(() => Promise.resolve(true)),
}));

// Mock react-native-aes-crypto (used by SecureStorage)
jest.mock('react-native-aes-crypto', () => ({
  randomKey: jest.fn(() => Promise.resolve('mock-random-key-base64')),
  pbkdf2: jest.fn(() => Promise.resolve('mock-derived-key-base64')),
  encrypt: jest.fn(() => Promise.resolve('mock-encrypted-base64')),
  decrypt: jest.fn(() => Promise.resolve('mock-decrypted-data')),
  sha256: jest.fn(() => Promise.resolve('mock-sha256-hash')),
  sha512: jest.fn(() => Promise.resolve('mock-sha512-hash')),
  hmac256: jest.fn(() => Promise.resolve('mock-hmac256')),
}));

// Mock react-native-camera
jest.mock('react-native-vision-camera', () => ({
  Camera:'Camera',
  useCameraDevices: jest.fn(() => []),
  useFrameProcessor: jest.fn(),
}));

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  openSettings: jest.fn(),
  PERMISSIONS: {
    IOS: {},
    ANDROID: {},
  },
}));

// Mock react-native-linear-gradient
jest.mock('react-native-linear-gradient', () =>'LinearGradient');

// Mock react-native-background-fetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  status: jest.fn(() => Promise.resolve(2)),
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  INTERNET_CREDENTIALS:'internet',
  ACCESS_CONTROL: {},
  ACCESSIBLE: {},
  AUTHENTICATION_TYPE: {},
  BIOMETRY_TYPE: {},
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() => Promise.resolve(null)),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
  canImplyAuthentication: jest.fn(() => Promise.resolve(false)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve(null)),
}));

// Mock react-native-iap
jest.mock('react-native-iap', () => ({
  initConnection: jest.fn(() => Promise.resolve(true)),
  endConnection: jest.fn(() => Promise.resolve()),
  getProducts: jest.fn(() => Promise.resolve([])),
  getSubscriptions: jest.fn(() => Promise.resolve([])),
  getPurchaseHistory: jest.fn(() => Promise.resolve([])),
  getAvailablePurchases: jest.fn(() => Promise.resolve([])),
  requestPurchase: jest.fn(() => Promise.resolve({})),
  requestSubscription: jest.fn(() => Promise.resolve({})),
  finishTransaction: jest.fn(() => Promise.resolve()),
  acknowledgePurchaseAndroid: jest.fn(() => Promise.resolve()),
  consumePurchaseAndroid: jest.fn(() => Promise.resolve()),
  validateReceiptIos: jest.fn(() => Promise.resolve({})),
  validateReceiptAndroid: jest.fn(() => Promise.resolve({})),
  clearTransactionIOS: jest.fn(() => Promise.resolve()),
  clearProductsIOS: jest.fn(() => Promise.resolve()),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  PurchaseStateAndroid: {
    PURCHASED: 1,
    CANCELED: 2,
    REFUNDED: 3,
  },
  ProductType: {
    inapp:'inapp',
    subs:'subs',
  },
}));

// Mock streaming-availability package
jest.mock('streaming-availability', () => {
  // Create a constructor function that works with namespace imports
  function MockStreamingAvailability(_config) {
    return {
      configure: jest.fn(() => Promise.resolve()),
      search: jest.fn(() => Promise.resolve([])),
      getProviders: jest.fn(() => Promise.resolve([])),
      searchShows: jest.fn(() => Promise.resolve([])),
      searchMovies: jest.fn(() => Promise.resolve([])),
      getDetails: jest.fn(() => Promise.resolve({})),
      getContentDetails: jest.fn(() => Promise.resolve({})),
      getRecommendations: jest.fn(() => Promise.resolve([])),
      getPopularContent: jest.fn(() => Promise.resolve([])),
      getSearchSuggestions: jest.fn(() => Promise.resolve([])),
    };
  }

  // Add static methods to the constructor
  MockStreamingAvailability.configure = jest.fn(() => Promise.resolve());
  MockStreamingAvailability.search = jest.fn(() => Promise.resolve([]));
  MockStreamingAvailability.getProviders = jest.fn(() => Promise.resolve([]));
  MockStreamingAvailability.searchShows = jest.fn(() => Promise.resolve([]));
  MockStreamingAvailability.searchMovies = jest.fn(() => Promise.resolve([]));
  MockStreamingAvailability.getDetails = jest.fn(() => Promise.resolve({}));
  MockStreamingAvailability.getContentDetails = jest.fn(() => Promise.resolve({}));
  MockStreamingAvailability.getRecommendations = jest.fn(() => Promise.resolve([]));
  MockStreamingAvailability.getPopularContent = jest.fn(() => Promise.resolve([]));
  MockStreamingAvailability.getSearchSuggestions = jest.fn(() => Promise.resolve([]));

  // Return the constructor as both default and named export
  // This makes it work with both `import StreamingAvailability` and `import * as StreamingAvailability`
  return MockStreamingAvailability;
});


// Vector icons are already mocked above with enhanced implementations

// Mock problematic components that use Animated
// VoiceSearch mock removed - moved to disabled due to conflicts
jest.mock('../components/BarcodeScanner', () => require('../__mocks__/BarcodeScanner').default);
// SearchBar mock removed to test real component

// Mock logger utility
const mockLoggerMethods = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  trace: jest.fn(),
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    createLogger: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      trace: jest.fn(),
    })),
    setLevel: jest.fn(),
    getLevel: jest.fn(() =>'info'),
    registerLoggerConfig: jest.fn(),
  })),
  setLevel: jest.fn(),
  getLevel: jest.fn(() =>'info'),
  registerLoggerConfig: jest.fn(),
};

jest.mock('@/utils/logger', () => ({
  ...mockLoggerMethods,
  logger: mockLoggerMethods,
}));

// Also mock relative path for logger
jest.mock('../utils/logger', () => ({
  ...mockLoggerMethods,
  logger: mockLoggerMethods,
}), { virtual: true });

// Mock React Native Linking API
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openURL: jest.fn(() => Promise.resolve()),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

// Mock useColorScheme hook
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => {
  const mockUseColorScheme = jest.fn(() =>'light');
  return {
    __esModule: true,
    default: mockUseColorScheme,
  };
});

// Mock Dimensions API with proper event support
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn((_dim) => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  set: jest.fn(),
}));

// Mock Animated.Value for core react-native Animated API
// Note: Not mocking NativeAnimatedHelper as it doesn't exist in the current RN version
const mockAnimated = {
  Value: jest.fn().mockImplementation(function (value) {
    this.value = value;
    this.setValue = jest.fn((v) => { this.value = v; });
    this.addListener = jest.fn();
    this.removeListener = jest.fn();
    this.removeAllListeners = jest.fn();
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
  decay: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  sequence: jest.fn((_animations) => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  parallel: jest.fn((_animations) => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  stagger: jest.fn((_time, _animations) => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  loop: jest.fn((_animation) => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  event: jest.fn(() => jest.fn()),
  createAnimatedComponent: jest.fn((Component) => Component),
  // Add Easing mock for React Navigation bottom-tabs
  Easing: {
    linear: jest.fn((t) => t),
    ease: jest.fn((t) => t),
    quad: jest.fn((t) => t * t),
    cubic: jest.fn((t) => t * t * t),
    poly: jest.fn((_n) => (t) => Math.pow(t, _n)),
    sin: jest.fn((t) => 1 - Math.cos((t * Math.PI) / 2)),
    circle: jest.fn((t) => 1 - Math.sqrt(1 - t * t)),
    exp: jest.fn((t) => Math.pow(2, 10 * (t - 1))),
    elastic: jest.fn((_bounciness) => (t) => t),
    back: jest.fn((_s) => (t) => t),
    bounce: jest.fn((t) => t),
    bezier: jest.fn((_x1, _y1, _x2, _y2) => (t) => t),
    in: jest.fn((easing) => easing),
    out: jest.fn((easing) => easing),
    inOut: jest.fn((easing) => easing),
  },
};

// Patch the global Animated from react-native
const RN = require('react-native');
if (RN.Animated) {
  Object.assign(RN.Animated, mockAnimated);
}

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => false),
      getId: jest.fn(),
      getParent: jest.fn(),
      getState: jest.fn(),
      addListener: jest.fn(() => jest.fn()), // For cleanup
    }),
    useRoute: () => ({
      key:'test',
      name:'test',
      params: {},
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
  };
});

// Mock @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn(() => ({
    Navigator: jest.fn(({ children }) => children),
    Screen: jest.fn(() => null),
  })),
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: View,
    WebView: View,
  };
});

// Mock React Native globals
global.Platform = {
  OS:'ios',
  Version:'14.0',
  select: (obj) => obj.ios || obj.default,
  isPad: false,
  isTVOS: false,
  constants: {},
};

global.Dimensions = {
  get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  set: jest.fn(),
};

global.width = 375;
global.height = 812;

global.navigator = {
  userAgent: `ReactNative/${global.Platform.OS}/${global.Platform.Version}`,
  platform:'MacIntel',
};

// localStorage does NOT exist in React Native
// global.localStorage = {
//   getItem: jest.fn(),
//   setItem: jest.fn(),
//   removeItem: jest.fn(),
//   clear: jest.fn(),
//   key: jest.fn(),
//   length: 0,
// };

// Mock navigation global for tests
global.navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
};

// Silence console warnings during tests
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  // Suppress common console.log messages in tests
  console.log = (...args) => {
    const message = args[0];
    if (
      typeof message ==='string' && (
        message.includes('Notification preferences saved') ||
        message.includes('Notification service initialized')
      )
    ) {
      return;
    }
    originalLog(...args);
  };
  console.warn = (...args) => {
    const message = args[0];
    if (
      typeof message ==='string' && (
        message.includes('componentWillReceiveProps') ||
        message.includes('ProgressBarAndroid has been extracted') ||
        message.includes('Clipboard has been extracted') ||
        message.includes('PushNotificationIOS has been extracted') ||
        message.includes('each child in a list should have a unique"key" prop') ||
        message.includes('Warning: React.createElement')
      )
    ) {
      return;
    }
    originalWarn(...args);
  };

  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message ==='string' && (
        message.includes('Warning: ReactDOM.render is deprecated') ||
        message.includes('Warning: An invalid form control') ||
        message.includes('act(...) is not supported') ||
        message.includes('StreamingAvailability is not a constructor') ||
        message.includes('Streaming search failed') ||
        message.includes('Logger error called')
      )
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
});
