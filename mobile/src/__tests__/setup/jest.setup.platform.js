/**
 * Jest Setup - React Native Platform Mocks
 *
 * This file contains mocks for React Native core platform APIs:
 * - NativeEventEmitter
 * - SettingsManager & TurboModuleRegistry
 * - NativeDeviceInfo
 * - Platform, Dimensions, PixelRatio
 * - Linking API
 * - Animated API (core React Native Animated)
 * - Touchable components
 * - React Native globals
 *
 * These are I/O boundaries that MUST be mocked for tests to run.
 */

// ============================================================================
// Native Module Mocks - MUST BE EARLY
// ============================================================================

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
      osVersion: '14.0',
      systemName: 'iOS',
      interfaceIdiom: 'phone',
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

// ============================================================================
// React Native Animated Infrastructure
// ============================================================================

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

// Mock native React Native Animated API
jest.mock('react-native/Libraries/Animated/Animated.js', () => {
  // Create a proper Animated Value class for native React Native Animated
  class NativeAnimatedValue {
    constructor(value = 0) {
      this.value = value;
      this.setValue = jest.fn((newValue) => { this.value = newValue; });
      this.addListener = jest.fn(() => 'mock-listener-id');
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

// ============================================================================
// Main React Native Mock
// ============================================================================

jest.mock('react-native', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const { View } = RN;

  // Create proper Animated mock inline
  function MockAnimatedValue(value = 0) {
    this.value = value;
    this.setValue = jest.fn((newValue) => { this.value = newValue; });
    this.addListener = jest.fn(() => 'mock-listener-id');
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
      AnimatedComponent.displayName = 'AnimatedComponent';
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
        AnimatedComponent.displayName = 'AnimatedComponent';
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
      testID: props.testID || 'touchable-opacity',
      accessible: props.accessible !== false,
      accessibilityLabel: props.accessibilityLabel,
      accessibilityHint: props.accessibilityHint,
      accessibilityRole: props.accessibilityRole || 'button',
      // Simply pass through the style without complex cleaning to preserve Animated styles
      style: props.style,
      // Preserve TouchableOpacity-specific props
      disabled: props.disabled,
      loading: props.loading,
      // Ensure getByRole can find this element
      role: props.accessibilityRole || 'button',
      'aria-label': props.accessibilityLabel,
      'aria-role': props.accessibilityRole || 'button',
      // Make sure accessibility properties are preserved
      nativeID: props.nativeID,
    }, children);
  });
  MockTouchableOpacity.displayName = 'TouchableOpacity';

  const MockTouchableHighlight = React.forwardRef((props, ref) => {
    return React.createElement(View, {
      ...props,
      ref,
      onTouchStart: props.onPress,
      testID: props.testID || 'touchable-highlight',
    });
  });
  MockTouchableHighlight.displayName = 'TouchableHighlight';

  const MockTouchableWithoutFeedback = React.forwardRef((props, ref) => {
    return React.createElement(View, {
      ...props,
      ref,
      onTouchStart: props.onPress,
      testID: props.testID || 'touchable-without-feedback',
    });
  });
  MockTouchableWithoutFeedback.displayName = 'TouchableWithoutFeedback';

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
    useColorScheme: jest.fn(() => 'light'),
    // Add Appearance API for theme tests
    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
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
          osVersion: '14.0',
          systemName: 'iOS',
          interfaceIdiom: 'phone',
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
        if (name === 'SettingsManager') {
          return {
            settings: {
              getConstants: jest.fn(() => ({})),
            },
          };
        }
        if (name === 'DeviceInfo') {
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
        if (name === 'SettingsManager') {
          return {
            settings: {
              getConstants: jest.fn(() => ({})),
            },
          };
        }
        if (name === 'DeviceInfo') {
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

// ============================================================================
// React Native API Mocks
// ============================================================================

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
  const mockUseColorScheme = jest.fn(() => 'light');
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

// ============================================================================
// Animated.Value and Easing (Patch Global)
// ============================================================================

// Mock Animated.Value for core react-native Animated API
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

// ============================================================================
// React Native Globals
// ============================================================================

global.Platform = {
  OS: 'ios',
  Version: '14.0',
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
  platform: 'MacIntel',
};

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
