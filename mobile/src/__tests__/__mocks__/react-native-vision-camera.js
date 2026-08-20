const mockVisionCamera = {
  getCameraDevice: jest.fn(() => Promise.resolve({ id: '0', position: 'back', name: 'Camera 0' })),
  requestCameraPermission: jest.fn(() => Promise.resolve('authorized')),
  getAvailableCameraDevices: jest.fn(() => Promise.resolve([])),
  useCameraDevices: jest.fn(() => [
    { id: '0', position: 'back', name: 'Camera 0' },
    { id: '1', position: 'front', name: 'Camera 1' },
  ]),
  useFrameProcessor: jest.fn(() => jest.fn()),
  runAtTargetFps: jest.fn((fps, callback) => callback),
  Camera: {
    getCameraDevice: jest.fn(),
    getAvailableCameraDevices: jest.fn(),
  },
  CameraPosition: {
    back: 'back',
    front: 'front',
  },
  PhotoCodec: 'jpeg',
  VideoCodec: 'h264',
  PhotoQualityPrioritization: {
    speed: 'speed',
    balanced: 'balanced',
    quality: 'quality',
  },
};

export default mockVisionCamera;
