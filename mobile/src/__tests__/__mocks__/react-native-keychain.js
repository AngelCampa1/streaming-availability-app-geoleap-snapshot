const BIOMETRY_TYPE = {
  TOUCH_ID: 'TouchID',
  FACE_ID: 'FaceID',
  FINGERPRINT: 'Fingerprint',
  FACE: 'Face',
  IRIS: 'Iris',
};

const ACCESS_CONTROL = {
  USER_PRESENCE: 'UserPresence',
  BIOMETRY_ANY: 'BiometryAny',
  BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
  DEVICE_PASSCODE: 'DevicePasscode',
  APPLICATION_PASSWORD: 'ApplicationPassword',
  BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode',
  BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'BiometryCurrentSetOrDevicePasscode',
};

const ACCESSIBLE = {
  WHEN_UNLOCKED: 'WhenUnlocked',
  AFTER_FIRST_UNLOCK: 'AfterFirstUnlock',
  ALWAYS: 'Always',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WhenPasscodeSetThisDeviceOnly',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly',
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AfterFirstUnlockThisDeviceOnly',
  ALWAYS_THIS_DEVICE_ONLY: 'AlwaysThisDeviceOnly',
};

const AUTHENTICATION_TYPE = {
  DEVICE_PASSCODE_OR_BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
  BIOMETRICS: 'AuthenticationWithBiometrics',
};

// In-memory storage to simulate keychain
const storage = {};

const mockKeychain = {
  canImplyAuthentication: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve(BIOMETRY_TYPE.FACE_ID)),
  setInternetCredentials: jest.fn((server, username, password, options) => {
    storage[server] = {
      username,
      password,
      service: options?.service || 'GeoLeap',
      storage: 'keychain',
    };
    return Promise.resolve({ service: options?.service || 'GeoLeap', storage: 'keychain' });
  }),
  getInternetCredentials: jest.fn((server) => {
    if (storage[server]) {
      return Promise.resolve(storage[server]);
    }
    return Promise.resolve(false);
  }),
  resetInternetCredentials: jest.fn((server) => {
    if (storage[server]) {
      delete storage[server];
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),
  ACCESS_CONTROL,
  ACCESSIBLE,
  AUTHENTICATION_TYPE,
  BIOMETRY_TYPE,
  // Helper to clear storage between tests
  __clearStorage: () => {
    Object.keys(storage).forEach(key => {
      // Don't clear the encryption key - it needs to persist across tests
      if (key !== 'encryption_key') {
        delete storage[key];
      }
    });
  },
};

export default mockKeychain;
export { BIOMETRY_TYPE, ACCESS_CONTROL, ACCESSIBLE, AUTHENTICATION_TYPE };
