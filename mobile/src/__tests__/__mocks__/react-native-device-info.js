export default {
  getUniqueId: jest.fn(() => Promise.resolve('unique-device-id')),
  getDeviceId: jest.fn(() => Promise.resolve('device-id')),
  getSystemName: jest.fn(() => Promise.resolve('iOS')),
  getSystemVersion: jest.fn(() => Promise.resolve('14.0')),
  getBuildNumber: jest.fn(() => Promise.resolve('1')),
  getVersion: jest.fn(() => Promise.resolve('1.0.0')),
  getBundleId: jest.fn(() => Promise.resolve('com.geoleap.mobile')),
  isEmulator: jest.fn(() => Promise.resolve(false)),
  isTablet: jest.fn(() => Promise.resolve(false)),
  hasNotch: jest.fn(() => Promise.resolve(true)),
  getDeviceType: jest.fn(() => Promise.resolve('handset')),
};
