/**
 * Jest Polyfills for MSW v2
 *
 * This file runs BEFORE the test environment is set up.
 * It provides polyfills required by MSW v2 in Node.js/jsdom environment.
 *
 * Based on MSW v2 official documentation for Jest setup:
 * https://mswjs.io/docs/migrations/1.x-to-2.x#jest
 *
 * IMPORTANT: This file must use CommonJS syntax since it runs before
 * any transpilation occurs.
 */

// Set test environment variables BEFORE any modules are loaded
// This ensures API calls use relative URLs that MSW can intercept
process.env.NEXT_PUBLIC_API_URL = '';
process.env.NODE_ENV = 'test';

const { TextEncoder, TextDecoder } = require('util');

// ============================================================================
// Node.js Immediate Functions (required by undici in jsdom environment)
// ============================================================================

// Polyfill setImmediate and clearImmediate for jsdom
// These are Node.js functions that aren't available in browser/jsdom environment
if (typeof globalThis.setImmediate === 'undefined') {
  globalThis.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}
if (typeof globalThis.clearImmediate === 'undefined') {
  globalThis.clearImmediate = (id) => clearTimeout(id);
}

// ============================================================================
// Timer Wrappers for undici compatibility
// undici's internal timer system expects Node.js Timeout objects with .unref()/.ref() methods
// jsdom returns numbers from setTimeout, so we wrap them in objects with the required methods
// ============================================================================

// Store original timers BEFORE any modifications
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;

// Map to track wrapper->id relationships for clearTimeout/clearInterval
const timerIdMap = new WeakMap();

// Create a timer wrapper that acts like both a number and has Node.js Timeout methods
function createTimerWrapper(id) {
  const wrapper = {
    id,
    // Node.js Timeout methods required by undici
    unref() { return this; },
    ref() { return this; },
    refresh() { return this; },
    hasRef() { return true; },
    // Allow the wrapper to be used where a number is expected
    [Symbol.toPrimitive](hint) {
      if (hint === 'number' || hint === 'default') return id;
      return String(id);
    },
    valueOf() { return id; },
    toString() { return String(id); },
  };
  timerIdMap.set(wrapper, id);
  return wrapper;
}

// Patched setTimeout that returns wrapper objects
globalThis.setTimeout = function patchedSetTimeout(fn, delay, ...args) {
  const timeoutId = originalSetTimeout.call(this, fn, delay, ...args);
  // In Node.js, setTimeout returns a Timeout object, in jsdom it returns a number
  if (typeof timeoutId === 'number') {
    return createTimerWrapper(timeoutId);
  }
  // If it's already an object (Node.js), ensure it has the methods
  if (timeoutId && typeof timeoutId === 'object') {
    if (!timeoutId.unref) timeoutId.unref = () => timeoutId;
    if (!timeoutId.ref) timeoutId.ref = () => timeoutId;
  }
  return timeoutId;
};

// Patched setInterval that returns wrapper objects
globalThis.setInterval = function patchedSetInterval(fn, delay, ...args) {
  const intervalId = originalSetInterval.call(this, fn, delay, ...args);
  if (typeof intervalId === 'number') {
    return createTimerWrapper(intervalId);
  }
  if (intervalId && typeof intervalId === 'object') {
    if (!intervalId.unref) intervalId.unref = () => intervalId;
    if (!intervalId.ref) intervalId.ref = () => intervalId;
  }
  return intervalId;
};

// Patched clearTimeout that handles both wrapper objects and numbers
globalThis.clearTimeout = function patchedClearTimeout(id) {
  if (id && typeof id === 'object') {
    const realId = timerIdMap.get(id) || id.id || id;
    return originalClearTimeout.call(this, realId);
  }
  return originalClearTimeout.call(this, id);
};

// Patched clearInterval that handles both wrapper objects and numbers
globalThis.clearInterval = function patchedClearInterval(id) {
  if (id && typeof id === 'object') {
    const realId = timerIdMap.get(id) || id.id || id;
    return originalClearInterval.call(this, realId);
  }
  return originalClearInterval.call(this, id);
};

// Helper to safely define a property (only if it doesn't exist or is writable)
function safeDefine(obj, prop, value) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
  if (!descriptor || descriptor.configurable || descriptor.writable) {
    Object.defineProperty(obj, prop, {
      value,
      writable: true,
      configurable: true,
    });
  }
}

// MSW requires TextEncoder/TextDecoder
safeDefine(globalThis, 'TextEncoder', TextEncoder);
safeDefine(globalThis, 'TextDecoder', TextDecoder);

// ============================================================================
// Performance API polyfills (required by undici for resource timing)
// ============================================================================

// markResourceTiming is called by undici but not available in jsdom
if (typeof globalThis.performance !== 'undefined') {
  if (!globalThis.performance.markResourceTiming) {
    globalThis.performance.markResourceTiming = function() {};
  }
  if (!globalThis.performance.clearResourceTimings) {
    globalThis.performance.clearResourceTimings = function() {};
  }
  if (!globalThis.performance.setResourceTimingBufferSize) {
    globalThis.performance.setResourceTimingBufferSize = function() {};
  }
}

// MSW uses BroadcastChannel for internal communication
class BroadcastChannelPolyfill {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    this.onmessageerror = null;
  }
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
}
safeDefine(globalThis, 'BroadcastChannel', BroadcastChannelPolyfill);

// MessagePort polyfill (required by undici)
class MessagePortPolyfill {
  constructor() {
    this.onmessage = null;
    this.onmessageerror = null;
  }
  postMessage() {}
  start() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}
safeDefine(globalThis, 'MessagePort', MessagePortPolyfill);

// MessageChannel polyfill
class MessageChannelPolyfill {
  constructor() {
    this.port1 = new MessagePortPolyfill();
    this.port2 = new MessagePortPolyfill();
  }
}
safeDefine(globalThis, 'MessageChannel', MessageChannelPolyfill);

// Web Streams API polyfills (required by undici and MSW)
// Node.js 18+ has these built-in
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
safeDefine(globalThis, 'ReadableStream', ReadableStream);
safeDefine(globalThis, 'WritableStream', WritableStream);
safeDefine(globalThis, 'TransformStream', TransformStream);

// Import undici for fetch polyfills
// MSW v2 REQUIRES undici's fetch implementation for proper interception
// We MUST override any existing implementations (jsdom, whatwg-fetch)
const undici = require('undici');

// FORCE undici's fetch implementations - MSW v2 requires these exact implementations
// Using Object.defineProperty to ensure they can't be accidentally overridden
Object.defineProperty(globalThis, 'fetch', {
  value: undici.fetch,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'Request', {
  value: undici.Request,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'Response', {
  value: undici.Response,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'Headers', {
  value: undici.Headers,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, 'FormData', {
  value: undici.FormData,
  writable: true,
  configurable: true,
});
