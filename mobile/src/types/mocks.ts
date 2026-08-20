// TypeScript compilation errors fix
// This file provides mock implementations and type fixes

// ReactNode import removed - not used

// Mock exports for missing modules
export const mockVoice = {
  start: () => Promise.resolve(true),
  stop: () => Promise.resolve(true),
  destroy: () => Promise.resolve(true),
  isAvailable: () => Promise.resolve(true),
};

// Mock types
export interface MockSearchHistory {
  id: string;
  query: string;
  timestamp: number;
}

// Mock service exports
export const tokenStorage = {
  getToken: () => Promise.resolve(null),
  setToken: () => Promise.resolve(),
  removeToken: () => Promise.resolve(),
};

// Add more mocks as needed
export default {};
