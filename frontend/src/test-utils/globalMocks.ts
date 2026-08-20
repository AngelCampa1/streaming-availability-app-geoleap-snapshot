/**
 * Global Mock Utilities for Tests
 *
 * Fixes TS2352 errors: Type cast mismatches for global objects
 *
 * Usage:
 * ```typescript
 * import { setupGlobalWebSocketMock } from '@/test-utils/globalMocks';
 *
 * const mockWs = setupGlobalWebSocketMock();
 * mockWs.mockClear();
 * ```
 */

export interface MockedWebSocket {
  /** Mock WebSocket instance */
  instance: WebSocket | null;
  /** Connect simulation */
  connect: () => void;
  /** Simulate receiving a message */
  simulateMessage: (data: unknown) => void;
  /** Simulate connection close */
  simulateClose: () => void;
  /** Simulate an error */
  simulateError: () => void;
  /** Message event handler */
  onmessage: ((event: MessageEvent) => void) | null;
  /** Open event handler */
  onopen: ((event: Event) => void) | null;
  /** Close event handler */
  onclose: ((event: CloseEvent) => void) | null;
  /** Error event handler */
  onerror: ((event: Event) => void) | null;
}

/**
 * Setup a global WebSocket mock
 * Returns a jest.Mock that can be used for assertions
 */
export function setupGlobalWebSocketMock(): jest.Mock<MockedWebSocket> {
  const mockWebSocket: MockedWebSocket = {
    instance: null,
    onmessage: null,
    onopen: null,
    onclose: null,
    onerror: null,
    connect: jest.fn(),
    simulateMessage: jest.fn((data: unknown) => {
      if (mockWebSocket.onmessage) {
        const event = { data: JSON.stringify(data) } as MessageEvent;
        mockWebSocket.onmessage(event);
      }
    }),
    simulateClose: jest.fn(() => {
      if (mockWebSocket.onclose) {
        const event = {} as CloseEvent;
        mockWebSocket.onclose(event);
      }
    }),
    simulateError: jest.fn(() => {
      if (mockWebSocket.onerror) {
        const event = {} as Event;
        mockWebSocket.onerror(event);
      }
    }),
  };

  const WebSocketMock = jest.fn().mockImplementation(() => mockWebSocket);
  (global as typeof globalThis & { WebSocket: typeof WebSocket }).WebSocket = WebSocketMock as unknown as typeof WebSocket;

  return WebSocketMock as unknown as jest.Mock<MockedWebSocket>;
}

/**
 * Clear the global WebSocket mock
 */
export function clearGlobalWebSocketMock(): void {
  const ws = (global as typeof globalThis & { WebSocket?: jest.Mock }).WebSocket;
  if (ws && jest.isMockFunction(ws)) {
    ws.mockClear();
  }
}

/**
 * Setup a global FileReader mock
 */
export function setupGlobalFileReaderMock(): jest.Mock {
  const FileReaderMock = jest.fn().mockImplementation(() => ({
    readAsDataURL: jest.fn(function(this: FileReader) {
      // Simulate async file reading
      setTimeout(() => {
        if (this.onload) {
          const event = {
            target: {
              result: 'data:image/png;base64,mock-image-data'
            }
          } as ProgressEvent<FileReader>;
          this.onload(event);
        }
      }, 0);
    }),
    readAsText: jest.fn(function(this: FileReader) {
      setTimeout(() => {
        if (this.onload) {
          const event = {
            target: {
              result: 'mock file content'
            }
          } as ProgressEvent<FileReader>;
          this.onload(event);
        }
      }, 0);
    }),
    readAsArrayBuffer: jest.fn(),
    readAsBinaryString: jest.fn(),
    abort: jest.fn(),
    result: null,
    error: null,
    readyState: 0,
    onload: null,
    onerror: null,
    onabort: null,
    onloadstart: null,
    onloadend: null,
    onprogress: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  (global as typeof globalThis & { FileReader: typeof FileReader }).FileReader = FileReaderMock as unknown as typeof FileReader;

  return FileReaderMock;
}

/**
 * Clear the global FileReader mock
 */
export function clearGlobalFileReaderMock(): void {
  const fr = (global as typeof globalThis & { FileReader?: jest.Mock }).FileReader;
  if (fr && jest.isMockFunction(fr)) {
    fr.mockClear();
  }
}

/**
 * Setup global fetch mock
 */
export function setupGlobalFetchMock(): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    clone: function() { return this; },
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    body: null,
    bodyUsed: false,
  } as Response);

  global.fetch = fetchMock;

  return fetchMock;
}

/**
 * Clear the global fetch mock
 */
export function clearGlobalFetchMock(): void {
  if (global.fetch && jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.Mock).mockClear();
  }
}

/**
 * Setup all global mocks at once
 */
export function setupAllGlobalMocks(): {
  WebSocket: jest.Mock<MockedWebSocket>;
  FileReader: jest.Mock;
  fetch: jest.Mock;
} {
  return {
    WebSocket: setupGlobalWebSocketMock(),
    FileReader: setupGlobalFileReaderMock(),
    fetch: setupGlobalFetchMock(),
  };
}

/**
 * Clear all global mocks at once
 */
export function clearAllGlobalMocks(): void {
  clearGlobalWebSocketMock();
  clearGlobalFileReaderMock();
  clearGlobalFetchMock();
}
