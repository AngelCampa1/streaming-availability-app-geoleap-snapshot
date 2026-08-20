// Test utilities for social sharing components
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { jest } from '@jest/globals';

// Simple test to satisfy Jest requirement
describe('test-utils', () => {
  it('should export utilities', () => {
    expect(setupSocialMocks).toBeDefined();
  });
});

// Mock setup for social components
export const setupSocialMocks = () => {
  // Mock API functions with proper typing
  const mockGenerateShareLink = jest.fn() as jest.MockedFunction<() => Promise<{ url: string; shortUrl: string }>>;
  mockGenerateShareLink.mockResolvedValue({ url: '', shortUrl: '' });
  const mockTrackShareEvent = jest.fn() as jest.MockedFunction<() => Promise<boolean>>;
  mockTrackShareEvent.mockResolvedValue(true);

  // Mock useUserTracking hook
  const mockTrack = jest.fn();
  const mockUserTracking = {
    track: mockTrack,
    identify: jest.fn(),
    reset: jest.fn(),
  };

  // Mock clipboard API
  const mockWriteText = jest.fn() as jest.MockedFunction<(text: string) => Promise<void>>;
  mockWriteText.mockResolvedValue(undefined);
  const mockReadText = jest.fn() as jest.MockedFunction<() => Promise<string>>;
  mockReadText.mockResolvedValue('');
  Object.assign(navigator, {
    clipboard: {
      writeText: mockWriteText,
      readText: mockReadText,
    },
  });

  // Mock window.open with proper Window type
  (global as any).open = jest.fn().mockReturnValue({
    focus: jest.fn(),
    close: jest.fn(),
    closed: false,
  } as unknown as Window);

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

  // Mock matchMedia for responsive tests
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver for loading detection
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: jest.fn(),
  })) as unknown as typeof IntersectionObserver;

  // Default successful mock implementations
  mockGenerateShareLink.mockResolvedValue({
    url: 'https://geoleap.app/content/123?utm_source=test',
    shortUrl: 'https://geoleap.app/s/abc123',
  });

  mockTrackShareEvent.mockResolvedValue(true);

  return {
    mockGenerateShareLink,
    mockTrackShareEvent,
    mockTrack,
    mockUserTracking,
    localStorageMock,
    sessionStorageMock,
  };
};

// Custom render function with default providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="test-wrapper">{children}</div>;
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
