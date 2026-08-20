/**
 * Manual mock for BiometricAuth
 */

export const biometricAuth = {
  isAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'FaceID' })),
  authenticate: jest.fn(() => Promise.resolve({ success: true, signature: 'mock-signature' })),
  isBiometricEnabled: jest.fn(() => Promise.resolve(true)),
  createKeys: jest.fn(() => Promise.resolve()),
  disableBiometric: jest.fn(() => Promise.resolve()),
};
