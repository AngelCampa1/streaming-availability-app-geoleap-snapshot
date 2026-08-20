export default {
  useAnimatedStyle: jest.fn(() => ({})),
  useSharedValue: jest.fn(() => ({ value: 0 })),
  withTiming: jest.fn(() => ({ value: 0 })),
  withSpring: jest.fn(() => ({ value: 0 })),
  useAnimatedGestureHandler: jest.fn(() => ({})),
  useAnimatedScrollHandler: jest.fn(() => ({})),
  runOnUI: jest.fn((fn) => fn),
  cancelAnimation: jest.fn(),
};
