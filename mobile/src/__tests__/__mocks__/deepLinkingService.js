const DeepLinkingService = {
  initialize: jest.fn(() => Promise.resolve()),
  handleDeepLink: jest.fn(() => Promise.resolve()),
  parseDeepLink: jest.fn((_url) => {
    return {
      type: 'content',
      id: 'mock-content-id',
      source: 'deep-link',
    };
  }),
  addDeepLinkListener: jest.fn(() => jest.fn()),
  removeDeepLinkListener: jest.fn(),
  generateDeepLink: jest.fn((contentId) => `geoleap://content/${contentId}`),
};

module.exports = DeepLinkingService;
module.exports.default = DeepLinkingService;
