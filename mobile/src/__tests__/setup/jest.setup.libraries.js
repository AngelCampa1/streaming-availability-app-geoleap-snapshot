/**
 * Jest Setup - Third-Party Libraries & Expo Mocks
 *
 * This file contains mocks for:
 * - Expo modules (image, local-authentication, constants)
 * - React Navigation
 * - React Native Reanimated
 * - Vector Icons
 * - Third-party libraries (modal, safe-area, gesture-handler, etc.)
 * - AsyncStorage
 * - Voice recognition
 * - Camera, Permissions, IAP, etc.
 *
 * ⚠️  WARNING: ThemeProvider is mocked here but SHOULD use REAL theme in future.
 * This is a temporary measure during infrastructure setup.
 */

// ============================================================================
// Jest Timer Configuration - Modern Timers for Async/Timer Interaction
// ============================================================================
// Configure modern fake timers globally
// This fixes issues with timer+async operations (Promises, setTimeout, axios interceptors)
// Use jest.advanceTimersByTimeAsync() in tests that need both timers and async operations
jest.useFakeTimers('modern');

// ============================================================================
// MSW (Mock Service Worker) - Not Compatible with React Native Jest
// ============================================================================
// MSW v2 requires Node.js APIs that aren't available in React Native Jest environment
// Mock msw/node to prevent import errors in skipped test files
// Use { virtual: true } since msw is not installed in the mobile package
jest.mock('msw/node', () => ({
  setupServer: jest.fn(() => ({
    listen: jest.fn(),
    close: jest.fn(),
    use: jest.fn(),
    resetHandlers: jest.fn(),
  })),
}), { virtual: true });

// Also mock the main msw module
jest.mock('msw', () => ({
  http: {
    get: jest.fn(() => ({})),
    post: jest.fn(() => ({})),
    put: jest.fn(() => ({})),
    delete: jest.fn(() => ({})),
    patch: jest.fn(() => ({})),
  },
  HttpResponse: {
    json: jest.fn((data) => ({ status: 200, body: JSON.stringify(data) })),
    error: jest.fn(() => ({ status: 500 })),
    text: jest.fn((text) => ({ status: 200, body: text })),
  },
  delay: jest.fn(() => Promise.resolve()),
}), { virtual: true });

// ============================================================================
// Axios Mock - Route through fetch mock for unified API interception
// ============================================================================
// This mock creates axios instances that use global.fetch, allowing the
// jest.setup.fetch-mock.js to intercept all HTTP requests uniformly.
jest.mock('axios', () => {
  // Store interceptors
  const requestInterceptors = [];
  const responseInterceptors = [];

  // Create mock interceptor manager
  const createInterceptorManager = (interceptors) => ({
    use: jest.fn((fulfilled, rejected) => {
      const id = interceptors.length;
      interceptors.push({ fulfilled, rejected });
      return id;
    }),
    eject: jest.fn((id) => {
      if (interceptors[id]) {
        interceptors[id] = null;
      }
    }),
    clear: jest.fn(() => {
      interceptors.length = 0;
    }),
  });

  // Run request interceptors
  const runRequestInterceptors = async (config) => {
    let currentConfig = { ...config };
    for (const interceptor of requestInterceptors) {
      if (interceptor && interceptor.fulfilled) {
        try {
          currentConfig = await interceptor.fulfilled(currentConfig);
        } catch (error) {
          if (interceptor.rejected) {
            currentConfig = await interceptor.rejected(error);
          } else {
            throw error;
          }
        }
      }
    }
    return currentConfig;
  };

  // Run response interceptors
  const runResponseInterceptors = async (response, isError = false) => {
    let currentResponse = response;
    for (const interceptor of responseInterceptors) {
      if (interceptor) {
        try {
          if (isError && interceptor.rejected) {
            currentResponse = await interceptor.rejected(currentResponse);
            isError = false; // Successfully recovered
          } else if (!isError && interceptor.fulfilled) {
            currentResponse = await interceptor.fulfilled(currentResponse);
          }
        } catch (error) {
          currentResponse = error;
          isError = true;
        }
      }
    }
    if (isError) {
      throw currentResponse;
    }
    return currentResponse;
  };

  // Make request using fetch
  const makeRequest = async (config) => {
    const processedConfig = await runRequestInterceptors(config);

    const url = processedConfig.baseURL
      ? `${processedConfig.baseURL}${processedConfig.url}`
      : processedConfig.url;

    const fetchOptions = {
      method: processedConfig.method?.toUpperCase() || 'GET',
      headers: processedConfig.headers || {},
    };

    if (processedConfig.data) {
      fetchOptions.body = typeof processedConfig.data === 'string'
        ? processedConfig.data
        : JSON.stringify(processedConfig.data);
    }

    try {
      const fetchResponse = await global.fetch(url, fetchOptions);

      let data;
      const contentType = fetchResponse.headers?.get?.('content-type') || '';
      try {
        data = await fetchResponse.json();
      } catch {
        data = await fetchResponse.text?.() || '';
      }

      const axiosResponse = {
        data,
        status: fetchResponse.status,
        statusText: fetchResponse.statusText || 'OK',
        headers: Object.fromEntries(fetchResponse.headers?.entries?.() || []),
        config: processedConfig,
        request: {},
      };

      if (!fetchResponse.ok) {
        const error = new Error(`Request failed with status ${fetchResponse.status}`);
        error.response = axiosResponse;
        error.config = processedConfig;
        error.isAxiosError = true;
        error.code = fetchResponse.status >= 500 ? 'ERR_SERVER' : 'ERR_BAD_REQUEST';
        return runResponseInterceptors(error, true);
      }

      return runResponseInterceptors(axiosResponse);
    } catch (error) {
      // Network error
      const axiosError = new Error(error.message || 'Network Error');
      axiosError.config = processedConfig;
      axiosError.isAxiosError = true;
      axiosError.code = 'ERR_NETWORK';
      return runResponseInterceptors(axiosError, true);
    }
  };

  // Create axios instance
  const createInstance = (instanceConfig = {}) => {
    const instance = async (config) => {
      return makeRequest({ ...instanceConfig, ...config });
    };

    // Add HTTP method shortcuts
    instance.get = (url, config = {}) => makeRequest({ ...instanceConfig, ...config, url, method: 'GET' });
    instance.post = (url, data, config = {}) => makeRequest({ ...instanceConfig, ...config, url, data, method: 'POST' });
    instance.put = (url, data, config = {}) => makeRequest({ ...instanceConfig, ...config, url, data, method: 'PUT' });
    instance.patch = (url, data, config = {}) => makeRequest({ ...instanceConfig, ...config, url, data, method: 'PATCH' });
    instance.delete = (url, config = {}) => makeRequest({ ...instanceConfig, ...config, url, method: 'DELETE' });
    instance.head = (url, config = {}) => makeRequest({ ...instanceConfig, ...config, url, method: 'HEAD' });
    instance.options = (url, config = {}) => makeRequest({ ...instanceConfig, ...config, url, method: 'OPTIONS' });
    instance.request = (config) => makeRequest({ ...instanceConfig, ...config });

    // Add interceptors
    instance.interceptors = {
      request: createInterceptorManager(requestInterceptors),
      response: createInterceptorManager(responseInterceptors),
    };

    // Add defaults
    instance.defaults = {
      ...instanceConfig,
      headers: {
        common: {},
        get: {},
        post: {},
        put: {},
        patch: {},
        delete: {},
        ...instanceConfig.headers,
      },
    };

    return instance;
  };

  // Main axios function
  const axios = createInstance();
  axios.create = jest.fn(createInstance);
  axios.isAxiosError = (error) => error?.isAxiosError === true;
  axios.isCancel = jest.fn(() => false);
  axios.CancelToken = {
    source: jest.fn(() => ({
      token: { throwIfRequested: jest.fn() },
      cancel: jest.fn(),
    })),
  };
  axios.all = Promise.all.bind(Promise);
  axios.spread = (callback) => (arr) => callback(...arr);

  return {
    __esModule: true,
    default: axios,
    ...axios,
  };
});

// ============================================================================
// React Native Gesture Handler
// ============================================================================

// Import gesture handler's jest setup first
import 'react-native-gesture-handler/jestSetup';

// ============================================================================
// ✅ ThemeProvider Mock REMOVED - Use REAL theme in tests
// ============================================================================
// Tests now use renderWithProviders from test-helpers.tsx which provides REAL ThemeProvider
// This enables actual theme logic execution and proper coverage measurement

// ============================================================================
// Application Assets
// ============================================================================

// Mock @/assets - centralizes logo and asset imports
jest.mock('@/assets', () => {
  // Import actual streaming logos for tests that need real data
  const actualStreamingLogos = jest.requireActual('../../assets/streaming-logos');

  return {
    LOGOS: {
      main: 'test-logo-main',
      transparent: 'test-logo-transparent',
      full: 'test-logo-full',
    },
    STREAMING_LOGOS: actualStreamingLogos.STREAMING_LOGOS,
    getStreamingLogo: actualStreamingLogos.getStreamingLogo,
    hasStreamingLogo: actualStreamingLogos.hasStreamingLogo,
    getStreamingLogoSvg: actualStreamingLogos.getStreamingLogoSvg,
  };
});

// ============================================================================
// React Native SVG
// ============================================================================

// Mock react-native-svg for SVG rendering
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  // Mock SvgXml component
  const SvgXml = React.forwardRef(({ xml, width, height, testID, ...props }, ref) => {
    return React.createElement(View, {
      ref,
      testID: testID || 'svg-xml',
      style: { width, height },
      'data-xml': xml,
      ...props,
    }, React.createElement(Text, { style: { display: 'none' } }, 'SVG'));
  });
  SvgXml.displayName = 'SvgXml';

  // Mock Svg component
  const Svg = React.forwardRef((props, ref) => {
    return React.createElement(View, { ref, testID: 'svg', ...props });
  });
  Svg.displayName = 'Svg';

  // Mock basic SVG elements
  const mockSvgElement = (name) => {
    const Component = React.forwardRef((props, ref) => {
      return React.createElement(View, { ref, testID: name.toLowerCase(), ...props });
    });
    Component.displayName = name;
    return Component;
  };

  return {
    __esModule: true,
    default: Svg,
    SvgXml,
    Svg,
    Circle: mockSvgElement('Circle'),
    Rect: mockSvgElement('Rect'),
    Path: mockSvgElement('Path'),
    G: mockSvgElement('G'),
    Text: mockSvgElement('SvgText'),
    Line: mockSvgElement('Line'),
    Polygon: mockSvgElement('Polygon'),
    Polyline: mockSvgElement('Polyline'),
    Defs: mockSvgElement('Defs'),
    LinearGradient: mockSvgElement('LinearGradient'),
    RadialGradient: mockSvgElement('RadialGradient'),
    Stop: mockSvgElement('Stop'),
  };
});

// ============================================================================
// Expo Modules
// ============================================================================

// Mock expo-image (replaced react-native-fast-image)
jest.mock('expo-image', () => {
  const React = require('react');
  const { Image: RNImage } = require('react-native');

  const MockImage = React.forwardRef((props, ref) => {
    const { source, contentFit, ...otherProps } = props;
    // Convert expo-image source format to react-native Image source format
    const imageSource = typeof source === 'string'
      ? { uri: source }
      : source && source.uri
        ? { uri: source.uri }
        : source;

    // Map contentFit to resizeMode for RN Image
    const resizeMode = contentFit === 'cover' ? 'cover'
      : contentFit === 'contain' ? 'contain'
      : contentFit === 'fill' ? 'stretch'
      : contentFit === 'none' ? 'center'
      : 'cover';

    return React.createElement(RNImage, {
      ...otherProps,
      source: imageSource,
      resizeMode,
      ref,
      testID: otherProps.testID || 'expo-image',
    });
  });
  MockImage.displayName = 'ExpoImage';

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
      name: 'GeoLeap',
      version: '1.0.0',
      extra: {},
    },
    manifest: {
      name: 'GeoLeap',
      version: '1.0.0',
    },
    platform: {
      ios: {
        buildNumber: '1',
      },
      android: {
        versionCode: 1,
      },
    },
    isDevice: false,
    systemVersion: '14.0',
    deviceName: 'Test Device',
    EXDevLauncher: undefined,
  };

  return {
    __esModule: true,
    default: Constants,
    ...Constants,
  };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');

  const LinearGradient = React.forwardRef((props, ref) => {
    const { children, colors, start, end, locations, style, ...otherProps } = props;
    return React.createElement(View, {
      ...otherProps,
      ref,
      style: [{ backgroundColor: colors && colors[0] }, style],
      testID: otherProps.testID || 'linear-gradient',
    }, children);
  });
  LinearGradient.displayName = 'LinearGradient';

  return {
    __esModule: true,
    LinearGradient,
    default: { LinearGradient },
  };
});

// Mock expo-apple-authentication
jest.mock('expo-apple-authentication', () => ({
  __esModule: true,
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  signInAsync: jest.fn(() => Promise.resolve({
    user: 'mock-user-id',
    email: 'test@example.com',
    fullName: {
      givenName: 'Test',
      familyName: 'User',
    },
    identityToken: 'mock-identity-token',
    authorizationCode: 'mock-auth-code',
  })),
  getCredentialStateAsync: jest.fn(() => Promise.resolve(1)), // AUTHORIZED
  AppleAuthenticationCredentialState: {
    REVOKED: 0,
    AUTHORIZED: 1,
    NOT_FOUND: 2,
    TRANSFERRED: 3,
  },
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
  AppleAuthenticationUserDetectionStatus: {
    UNSUPPORTED: 0,
    UNKNOWN: 1,
    LIKELY_REAL: 2,
  },
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  __esModule: true,
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
  dismissBrowser: jest.fn(() => Promise.resolve()),
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'success', url: 'mock-url' })),
  maybeCompleteAuthSession: jest.fn(),
  warmUpAsync: jest.fn(() => Promise.resolve()),
  coolDownAsync: jest.fn(() => Promise.resolve()),
  WebBrowserResultType: {
    CANCEL: 'cancel',
    DISMISS: 'dismiss',
    OPENED: 'opened',
    LOCKED: 'locked',
  },
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  __esModule: true,
  makeRedirectUri: jest.fn(() => 'mock-redirect-uri'),
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
  useAutoDiscovery: jest.fn(() => ({
    authorizationEndpoint: 'mock-auth-endpoint',
    tokenEndpoint: 'mock-token-endpoint',
  })),
  fetchDiscoveryAsync: jest.fn(() => Promise.resolve({
    authorizationEndpoint: 'mock-auth-endpoint',
    tokenEndpoint: 'mock-token-endpoint',
  })),
  AuthSessionResult: {
    type: 'success',
    params: {},
    url: 'mock-url',
  },
  ResponseType: {
    Code: 'code',
    Token: 'token',
    IdToken: 'id_token',
  },
  Prompt: {
    None: 'none',
    Login: 'login',
    Consent: 'consent',
    SelectAccount: 'select_account',
  },
}));

// ============================================================================
// React Native Reanimated
// ============================================================================

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
      this.addListener = jest.fn(() => 'mock-listener-id');
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

  // Create specific animated component mocks that properly render their content
  const MockAnimatedView = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { View } = require('react-native');
    return React.createElement(View, {
      ...otherProps,
      ref,
      testID: otherProps.testID || 'animated-view',
    }, children);
  });
  MockAnimatedView.displayName = 'AnimatedView';

  const MockAnimatedText = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { Text } = require('react-native');
    return React.createElement(Text, {
      ...otherProps,
      ref,
      testID: otherProps.testID || 'animated-text',
    }, children);
  });
  MockAnimatedText.displayName = 'AnimatedText';

  const MockAnimatedImage = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { Image } = require('react-native');
    return React.createElement(Image, {
      ...otherProps,
      ref,
      testID: otherProps.testID || 'animated-image',
    }, children);
  });
  MockAnimatedImage.displayName = 'AnimatedImage';

  const MockAnimatedScrollView = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { ScrollView } = require('react-native');
    return React.createElement(ScrollView, {
      ...otherProps,
      ref,
      testID: otherProps.testID || 'animated-scroll-view',
    }, children);
  });
  MockAnimatedScrollView.displayName = 'AnimatedScrollView';

  const MockAnimatedFlatList = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    const { FlatList } = require('react-native');
    return React.createElement(FlatList, {
      ...otherProps,
      ref,
      testID: otherProps.testID || 'animated-flat-list',
    }, children);
  });
  MockAnimatedFlatList.displayName = 'AnimatedFlatList';

  const MockAnimatedComponent = React.forwardRef((props, ref) => {
    const { children, ...otherProps } = props;
    return React.createElement(View, {
      ...otherProps,
      ref,
      testID: otherProps.testID || 'animated-component',
    }, children);
  });
  MockAnimatedComponent.displayName = 'AnimatedComponent';

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

  return reanimatedMock;
});

// ============================================================================
// Vector Icons
// ============================================================================

// Enhanced react-native-vector-icons mock with consistent export patterns
jest.mock('react-native-vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color = 'black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole: 'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color === '#ccc' ? '#ccc' : 'black',
        justifyContent: 'center',
        alignItems: 'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color: 'white',
        fontSize: size * 0.6,
        fontFamily: 'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() : 'I'));
  };

  // Support both default and named exports
  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

// Mock other icon libraries with consistent patterns
jest.mock('react-native-vector-icons/FontAwesome', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color = 'black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole: 'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color === '#ccc' ? '#ccc' : 'black',
        justifyContent: 'center',
        alignItems: 'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color: 'white',
        fontSize: size * 0.6,
        fontFamily: 'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() : 'F'));
  };

  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color = 'black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole: 'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color === '#ccc' ? '#ccc' : 'black',
        justifyContent: 'center',
        alignItems: 'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color: 'white',
        fontSize: size * 0.6,
        fontFamily: 'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() : 'I'));
  };

  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

jest.mock('react-native-vector-icons/Feather', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color = 'black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole: 'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color === '#ccc' ? '#ccc' : 'black',
        justifyContent: 'center',
        alignItems: 'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color: 'white',
        fontSize: size * 0.6,
        fontFamily: 'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() : 'F'));
  };

  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

jest.mock('react-native-vector-icons', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockIcon = ({ name, size = 24, color = 'black', ...props }) => {
    return React.createElement(View, {
      testID: `icon-${name}`,
      accessible: true,
      accessibilityRole: 'image',
      accessibilityLabel: name,
      style: {
        width: size,
        height: size,
        backgroundColor: color === '#ccc' ? '#ccc' : 'black',
        justifyContent: 'center',
        alignItems: 'center',
        ...props.style,
      },
      ...props,
    }, React.createElement(Text, {
      style: {
        color: 'white',
        fontSize: size * 0.6,
        fontFamily: 'Arial',
      },
    }, name ? name.charAt(0).toUpperCase() : 'V'));
  };

  const IconExport = MockIcon;
  IconExport.default = MockIcon;
  IconExport.Icon = MockIcon;

  return IconExport;
});

// ============================================================================
// React Native Components
// ============================================================================

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
        animationType: 'slide',
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
  MockModal.displayName = 'MockModal';

  return MockModal;
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  const SafeAreaView = React.forwardRef((props, ref) => {
    return React.createElement(View, { ...props, ref });
  });
  SafeAreaView.displayName = 'SafeAreaView';

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
      testID: props.testID || 'flash-list',
      keyExtractor: props.keyExtractor || ((item, index) => `flash-list-item-${index}`),
    });
  });

  MockFlashList.displayName = 'MockFlashList';

  return {
    FlashList: MockFlashList,
    default: MockFlashList,
  };
});

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

// ============================================================================
// Storage & Data
// ============================================================================

// Mock AsyncStorage - Use official mock from package for REAL storage behavior
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: false,
        cellularGeneration: null,
      },
    })
  ),
  addEventListener: jest.fn((callback) => {
    // Call the callback immediately with mock state
    callback({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: false,
        cellularGeneration: null,
      },
    });
    // Return unsubscribe function
    return jest.fn();
  }),
  useNetInfo: jest.fn(() => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      cellularGeneration: null,
    },
  })),
}));

// ============================================================================
// Voice & Media
// ============================================================================

// Mock react-native-voice
jest.mock('@react-native-voice/voice', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  isAvailable: jest.fn(() => Promise.resolve(true)),
}));

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera',
  useCameraDevices: jest.fn(() => []),
  useFrameProcessor: jest.fn(),
}));

// ============================================================================
// Security & Auth
// ============================================================================

// Mock react-native-aes-crypto (used by SecureStorage)
// Use base64 encoding/decoding for tests since we can't use real AES
jest.mock('react-native-aes-crypto', () => ({
  randomKey: jest.fn(() => Promise.resolve('test-encryption-key-' + Date.now())),
  pbkdf2: jest.fn(() => Promise.resolve('mock-derived-key-base64')),
  encrypt: jest.fn((data, _key, _iv) => {
    // Simple base64 encode for testing
    const base64 = Buffer.from(data).toString('base64');
    return Promise.resolve(base64);
  }),
  decrypt: jest.fn((encryptedData, _key, _iv) => {
    // Simple base64 decode for testing
    const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
    return Promise.resolve(decoded);
  }),
  sha256: jest.fn(() => Promise.resolve('mock-sha256-hash')),
  sha512: jest.fn(() => Promise.resolve('mock-sha512-hash')),
  hmac256: jest.fn(() => Promise.resolve('mock-hmac256')),
}));

// Mock react-native-keychain with stateful storage
const keychainStorage = {};
jest.mock('react-native-keychain', () => ({
  INTERNET_CREDENTIALS: 'internet',
  ACCESS_CONTROL: {
    USER_PRESENCE: 'UserPresence',
    BIOMETRY_ANY: 'BiometryAny',
    BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
    DEVICE_PASSCODE: 'DevicePasscode',
    APPLICATION_PASSWORD: 'ApplicationPassword',
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode',
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'BiometryCurrentSetOrDevicePasscode',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'WhenUnlocked',
    AFTER_FIRST_UNLOCK: 'AfterFirstUnlock',
    ALWAYS: 'Always',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WhenPasscodeSetThisDeviceOnly',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AfterFirstUnlockThisDeviceOnly',
    ALWAYS_THIS_DEVICE_ONLY: 'AlwaysThisDeviceOnly',
  },
  AUTHENTICATION_TYPE: {
    DEVICE_PASSCODE_OR_BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
    BIOMETRICS: 'AuthenticationWithBiometrics',
  },
  BIOMETRY_TYPE: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    FINGERPRINT: 'Fingerprint',
    FACE: 'Face',
    IRIS: 'Iris',
  },
  setInternetCredentials: jest.fn((server, username, password, options) => {
    keychainStorage[server] = {
      username,
      password,
      service: options?.service || 'GeoLeap',
      storage: 'keychain',
    };
    return Promise.resolve({ service: options?.service || 'GeoLeap', storage: 'keychain' });
  }),
  getInternetCredentials: jest.fn((server) => {
    if (keychainStorage[server]) {
      return Promise.resolve(keychainStorage[server]);
    }
    return Promise.resolve(false);
  }),
  resetInternetCredentials: jest.fn((server) => {
    if (keychainStorage[server]) {
      delete keychainStorage[server];
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),
  canImplyAuthentication: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve('FaceID')),
  __clearStorage: () => {
    Object.keys(keychainStorage).forEach(key => {
      // Don't clear the encryption key - it needs to persist across tests
      if (key !== 'encryption_key') {
        delete keychainStorage[key];
      }
    });
  },
}));

// ============================================================================
// Permissions & System
// ============================================================================

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

// Mock react-native-background-fetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  status: jest.fn(() => Promise.resolve(2)),
}));

// ============================================================================
// UI & Styling
// ============================================================================

// Mock react-native-linear-gradient
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// ============================================================================
// Payments & Subscriptions
// ============================================================================

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
    inapp: 'inapp',
    subs: 'subs',
  },
}));

// ============================================================================
// API Clients
// ============================================================================

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
  return MockStreamingAvailability;
});

// ============================================================================
// React Navigation
// ============================================================================

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
      key: 'test',
      name: 'test',
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

// ============================================================================
// Utility Mocks
// ============================================================================

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
    getLevel: jest.fn(() => 'info'),
    registerLoggerConfig: jest.fn(),
  })),
  setLevel: jest.fn(),
  getLevel: jest.fn(() => 'info'),
  registerLoggerConfig: jest.fn(),
};

jest.mock('@/utils/logger', () => ({
  ...mockLoggerMethods,
  logger: mockLoggerMethods,
}));

// Also mock relative path for logger
jest.mock('../../utils/logger', () => ({
  ...mockLoggerMethods,
  logger: mockLoggerMethods,
}), { virtual: true });

// ============================================================================
// Expo Notifications
// ============================================================================

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[mock]' })),
  getDevicePushTokenAsync: jest.fn(() => Promise.resolve({ data: 'device-token' })),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  dismissAllNotificationsAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  AndroidImportance: {
    MIN: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },
  AndroidNotificationVisibility: {
    PRIVATE: 0,
    PUBLIC: 1,
    SECRET: -1,
  },
}));

// ============================================================================
// Component Mocks
// ============================================================================

// Mock problematic components that use Animated
jest.mock('../../components/BarcodeScanner', () => require('../../__mocks__/BarcodeScanner').default);
