/**
 * Tests for EmailCapture component
 *
 * Coverage: renders for anonymous users, hides when dismissed,
 * hides for authenticated users, submits email, respects localStorage dismissal
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// localStorage mock with restorable default
let store: Record<string, string> = {};

const defaultGetItem = (key: string): string | null => store[key] ?? null;

const localStorageMock = {
  getItem: jest.fn(defaultGetItem),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
  }),
  clear: jest.fn(() => {
    store = {};
  }),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { EmailCapture } from '../EmailCapture';

describe('EmailCapture', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    store = {};
    global.fetch = originalFetch;
    // Restore default store-backed getItem after any mockImplementation overrides
    localStorageMock.getItem.mockImplementation(defaultGetItem);
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders email input and submit button for anonymous users', () => {
    render(<EmailCapture />);

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get updates/i })).toBeInTheDocument();
  });

  it('does not render for authenticated users', () => {
    mockUseAuth.mockReturnValue({ user: { id: '1' }, isAuthenticated: true });

    const { container } = render(<EmailCapture />);
    expect(container.innerHTML).toBe('');
  });

  it('hides after dismiss and stores dismissal in localStorage', () => {
    render(<EmailCapture />);

    const dismissButton = screen.getByLabelText(/dismiss/i);
    fireEvent.click(dismissButton);

    expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'email_capture_dismissed',
      expect.any(String)
    );
  });

  it('does not render when previously dismissed within 7 days', () => {
    const recentDismissal = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
    localStorageMock.getItem.mockImplementation((key: string): string | null => {
      if (key === 'email_capture_dismissed') return String(recentDismissal);
      return null;
    });

    const { container } = render(<EmailCapture />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when dismissal is older than 7 days', () => {
    const oldDismissal = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    localStorageMock.getItem.mockImplementation((key: string): string | null => {
      if (key === 'email_capture_dismissed') return String(oldDismissal);
      return null;
    });

    render(<EmailCapture />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('does not render when email was already captured', () => {
    localStorageMock.getItem.mockImplementation((key: string): string | null => {
      if (key === 'email_capture_email') return 'already@captured.com';
      return null;
    });

    const { container } = render(<EmailCapture />);
    expect(container.innerHTML).toBe('');
  });

  it('shows success state after email submission', async () => {
    // Mock fetch for email lead API
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    render(<EmailCapture />);

    const input = screen.getByPlaceholderText(/email/i);
    const button = screen.getByRole('button', { name: /get updates/i });

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText(/thanks/i)).toBeInTheDocument();
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'email_capture_email',
      'test@example.com'
    );
    expect(global.fetch).toHaveBeenCalledWith('/api/leads/email', expect.objectContaining({
      body: JSON.stringify({
        email: 'test@example.com',
        source: 'email_capture',
        turnstileToken: '',
        companyWebsite: '',
      }),
    }));
  });

  it('includes the honeypot value from the submitted form', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    render(<EmailCapture />);

    const input = screen.getByPlaceholderText(/email/i);
    const honeypot = document.querySelector('input[name="companyWebsite"]') as HTMLInputElement;
    const button = screen.getByRole('button', { name: /get updates/i });

    fireEvent.change(input, { target: { value: 'bot@example.com' } });
    fireEvent.change(honeypot, { target: { value: 'https://spam.example' } });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/leads/email', expect.objectContaining({
      body: JSON.stringify({
        email: 'bot@example.com',
        source: 'email_capture',
        turnstileToken: '',
        companyWebsite: 'https://spam.example',
      }),
    }));
  });

  it('validates email format before submission', async () => {
    render(<EmailCapture />);

    const input = screen.getByPlaceholderText(/email/i);
    const button = screen.getByRole('button', { name: /get updates/i });

    fireEvent.change(input, { target: { value: 'invalid-email' } });
    await act(async () => {
      fireEvent.click(button);
    });

    // Should still show input (not success state)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });
});
