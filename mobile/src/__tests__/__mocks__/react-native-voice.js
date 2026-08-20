// Enhanced mock for @react-native-voice/voice
const createMockVoice = () => {
  const eventListeners = new Map();

  return {
    isRecognitionAvailable: jest.fn(() => Promise.resolve(true)),
    isAvailable: jest.fn(() => Promise.resolve(true)),
    start: jest.fn(() => {
      // Simulate speech recognition success
      setTimeout(() => {
        const speechStartListener = eventListeners.get('onSpeechStart');
        if (speechStartListener) {
          speechStartListener();
        }

        setTimeout(() => {
          const speechResultsListener = eventListeners.get('onSpeechResults');
          if (speechResultsListener) {
            speechResultsListener({
              value: 'mock voice search result',
              isFinal: true,
            });
          }

          const speechEndListener = eventListeners.get('onSpeechEnd');
          if (speechEndListener) {
            speechEndListener();
          }
        }, 100);
      }, 50);
      return Promise.resolve();
    }),
    stop: jest.fn(() => {
      const speechEndListener = eventListeners.get('onSpeechEnd');
      if (speechEndListener) {
        speechEndListener();
      }
      return Promise.resolve();
    }),
    destroy: jest.fn(() => {
      eventListeners.clear();
      return Promise.resolve();
    }),
    removeAllListeners: jest.fn(() => {
      eventListeners.clear();
    }),
    onSpeechStart: jest.fn((callback) => {
      eventListeners.set('onSpeechStart', callback);
    }),
    onSpeechEnd: jest.fn((callback) => {
      eventListeners.set('onSpeechEnd', callback);
    }),
    onSpeechResults: jest.fn((callback) => {
      eventListeners.set('onSpeechResults', callback);
    }),
    onSpeechError: jest.fn((callback) => {
      eventListeners.set('onSpeechError', callback);
    }),
    // Helper method for tests to simulate errors
    __simulateError: jest.fn((error) => {
      const speechErrorListener = eventListeners.get('onSpeechError');
      if (speechErrorListener) {
        speechErrorListener(error);
      }
    }),
    // Helper method for tests to simulate specific results
    __simulateResult: jest.fn((result) => {
      const speechResultsListener = eventListeners.get('onSpeechResults');
      if (speechResultsListener) {
        speechResultsListener({
          value: result,
          isFinal: true,
        });
      }
    }),
  };
};

const mockVoice = createMockVoice();
export default mockVoice;
