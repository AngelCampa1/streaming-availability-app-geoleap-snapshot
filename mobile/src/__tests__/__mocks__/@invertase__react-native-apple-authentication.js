export default {
  performAppleSignIn: jest.fn(() => Promise.resolve({
    identityToken: 'mock-apple-token',
    nonce: 'mock-nonce',
  })),
};
