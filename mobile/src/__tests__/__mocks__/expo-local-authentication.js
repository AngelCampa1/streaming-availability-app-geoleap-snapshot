// Mock expo-local-authentication (replaced react-native-biometrics)
const AuthenticationType = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
};

const SecurityLevel = {
  NONE: 0,
  SECRET: 1,
  BIOMETRIC_WEAK: 2,
  BIOMETRIC_STRONG: 3,
};

const hasHardwareAsync = jest.fn(() => Promise.resolve(true));
const isEnrolledAsync = jest.fn(() => Promise.resolve(true));
const getEnrolledLevelAsync = jest.fn(() => Promise.resolve(SecurityLevel.BIOMETRIC_STRONG));
const supportedAuthenticationTypesAsync = jest.fn(() =>
  Promise.resolve([AuthenticationType.FINGERPRINT, AuthenticationType.FACIAL_RECOGNITION])
);
const authenticateAsync = jest.fn(() => Promise.resolve({ success: true }));
const cancelAuthenticate = jest.fn(() => Promise.resolve());

module.exports = {
  __esModule: true,
  hasHardwareAsync,
  isEnrolledAsync,
  getEnrolledLevelAsync,
  supportedAuthenticationTypesAsync,
  authenticateAsync,
  cancelAuthenticate,
  AuthenticationType,
  SecurityLevel,
  default: {
    hasHardwareAsync,
    isEnrolledAsync,
    getEnrolledLevelAsync,
    supportedAuthenticationTypesAsync,
    authenticateAsync,
    cancelAuthenticate,
    AuthenticationType,
    SecurityLevel,
  },
};
