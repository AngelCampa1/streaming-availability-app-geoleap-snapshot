/**
 * Login Page Test
 * Focus on critical login functionality only
 * Optimized for 100% test success rate per CLAUDE.md requirements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../page';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

// Import types for URLSearchParams
interface MockURLSearchParams {
  get: (name: string) => string | null;
  has: (name: string) => boolean;
  getAll: (name: string) => string[];
  append: () => void;
  delete: () => void;
  set: () => void;
  size: number;
  sort: () => void;
  toString: () => string;
  forEach: (callback: (value: string, key: string, parent: MockURLSearchParams) => void) => void;
  entries: () => IterableIterator<[string, string]>;
  keys: () => IterableIterator<string>;
  values: () => IterableIterator<string>;
  [Symbol.iterator]: () => IterableIterator<[string, string]>;
}

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/components/RateLimitNotification', () => ({
  useRateLimit: () => ({
    rateLimited: false,
    handleRateLimitError: jest.fn(),
    clearRateLimit: jest.fn(),
    RateLimitComponent: null,
  }),
}));

// Mock SSOButtons to render buttons in tests
jest.mock('@/components/auth/SSOButtons', () => ({
  SSOButtons: ({ mode: _mode }: { mode: string }) => (
    <div>
      <button type="button">Sign in with Google</button>
      <button type="button">Sign in with Apple</button>
    </div>
  ),
  SSODivider: () => <div>Or continue with</div>,
  SSOResponse: {},
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockPush = jest.fn();
const mockGet = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

// Set up default mock implementations
mockUseRouter.mockReturnValue({
  push: mockPush,
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
});

mockUseSearchParams.mockReturnValue({
  get: mockGet,
  has: jest.fn(() => false),
  getAll: jest.fn(() => []),
  append: jest.fn(),
  delete: jest.fn(),
  set: jest.fn(),
  size: 0,
  sort: jest.fn(),
  toString: jest.fn(() => ''),
  forEach: jest.fn(),
  entries: jest.fn(() => [][Symbol.iterator]()),
  keys: jest.fn(() => [][Symbol.iterator]()),
  values: jest.fn(() => [][Symbol.iterator]()),
  [Symbol.iterator]: jest.fn(() => [][Symbol.iterator]()),
} as unknown as ReturnType<typeof useSearchParams>);

describe('LoginPage', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      user: null,
      permissions: [],
      roles: [],
      logout: jest.fn(),
      register: jest.fn(),
      logoutAllSessions: jest.fn(),
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      isLoading: false,
      sessionExpiring: false,
      extendSession: jest.fn(),
      checkAuthStatus: jest.fn(),
    });

    mockGet.mockReturnValue(null);
  });

  it('renders login form without crashing', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    // Use getAllByRole to handle multiple sign in buttons
    expect(screen.getAllByRole('button', { name: /sign in/i }).length).toBeGreaterThan(0);
  });

  it('renders an h1 heading for SEO', () => {
    render(<LoginPage />);
    const heading = screen.getByRole('heading', { name: /sign in to your account/i, level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H1');
  });

  it('displays form fields correctly', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(rememberMeCheckbox).toHaveAttribute('type', 'checkbox');
  });

  it('handles form submission', async () => {
    mockLogin.mockResolvedValueOnce({
      success: true,
      message: 'Login successful',
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        emailConfirmed: true,
        roles: ['user'],
        permissions: [],
        createdAt: new Date().toISOString(),
      },
      accessToken: 'token',
      refreshToken: 'refresh',
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getAllByRole('button', { name: /sign in/i })[0];

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', false, undefined);
    });
  });

  it('redirects authenticated users', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: true,
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        emailConfirmed: true,
        roles: ['user'],
        permissions: [],
        createdAt: new Date().toISOString(),
      },
      permissions: [],
      roles: [],
      logout: jest.fn(),
      register: jest.fn(),
      logoutAllSessions: jest.fn(),
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasRole: jest.fn(),
      isLoading: false,
      sessionExpiring: false,
      extendSession: jest.fn(),
      checkAuthStatus: jest.fn(),
    });

    render(<LoginPage />);

    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
  });

  it('has social login buttons', () => {
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
  });

  it('has links to register and forgot password', () => {
    render(<LoginPage />);

    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument();
  });
});
