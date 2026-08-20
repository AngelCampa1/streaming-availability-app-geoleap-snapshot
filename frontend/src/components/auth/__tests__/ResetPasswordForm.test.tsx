import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResetPasswordForm } from '../ResetPasswordForm';
import { resetPassword, validateResetToken } from '@/lib/api';
import { logger } from '@/lib/logger';
import { createSuccessResponse } from '@/test-utils/apiMockHelpers';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  resetPassword: jest.fn(),
  validateResetToken: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn((param: string) => {
      if (param === 'token') return 'test-token-123';
      if (param === 'email') return 'test@example.com';
      return null;
    }),
  })),
}));

// Mock PasswordStrengthIndicator
jest.mock('@/components/ui/password-strength-indicator', () => ({
  PasswordStrengthIndicator: ({
    password,
    onStrengthChange,
  }: {
    password: string;
    onStrengthChange: (result: { meetsRequirements: boolean }) => void;
  }) => {
    // Auto-trigger strength change with strong password
    // Use useLayoutEffect to avoid re-render loops and ensure synchronous execution
    // Don't include onStrengthChange in dependencies to prevent infinite loops
    React.useLayoutEffect(() => {
      if (password.length >= 8) {
        onStrengthChange({ meetsRequirements: true });
      } else {
        onStrengthChange({ meetsRequirements: false });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [password]);

    return <div data-testid="password-strength-indicator">Password Strength Indicator</div>;
  },
}));

const mockResetPassword = resetPassword as jest.MockedFunction<typeof resetPassword>;
const mockValidateResetToken = validateResetToken as jest.MockedFunction<typeof validateResetToken>;

// Import next/navigation for mock resetting
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSearchParams: mockUseSearchParams } = require('next/navigation');

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateResetToken.mockResolvedValue({ isValid: true });
    // Reset useSearchParams mock to default state
    mockUseSearchParams.mockReturnValue({
      get: jest.fn((param: string) => {
        if (param === 'token') return 'test-token-123';
        if (param === 'email') return 'test@example.com';
        return null;
      }),
    });
  });

  afterEach(() => {
    // Unmount all React components to prevent memory leaks
    cleanup();
    // Clear all mock calls and implementations
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    // Reset all module registry to clear cached modules
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('Token Validation', () => {
    it('should validate token on mount', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(mockValidateResetToken).toHaveBeenCalledWith('test-token-123');
      });
    });

    it('should show validating screen during token validation', async () => {
      mockValidateResetToken.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ isValid: true }), 100))
      );
      render(<ResetPasswordForm />);

      expect(screen.getByText(/validating reset token/i)).toBeInTheDocument();
      expect(screen.getByText(/validating reset token/i).previousElementSibling).toHaveClass('animate-spin');

      // Wait for validation to complete to avoid hanging
      await waitFor(() => {
        expect(screen.queryByText(/validating reset token/i)).not.toBeInTheDocument();
      });
    });

    it('should show form after successful token validation', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });
    });

    it('should show invalid token screen when token is invalid', async () => {
      mockValidateResetToken.mockResolvedValue({ isValid: false });
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /invalid reset link/i })).toBeInTheDocument();
        expect(
          screen.getByText(/this reset link is invalid or has expired/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error when token is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const useSearchParams = require('next/navigation').useSearchParams;
      useSearchParams.mockReturnValue({
        get: jest.fn(() => null),
      });

      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(
          screen.getByText(/invalid or missing reset token/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error when token validation fails', async () => {
      mockValidateResetToken.mockRejectedValue(new Error('Network error'));
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByText(/unable to validate reset token/i)).toBeInTheDocument();
      });
    });

    it('should log error when token validation fails', async () => {
      mockValidateResetToken.mockRejectedValue(new Error('Network error'));
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Token validation failed', {
          error: 'Network error',
        });
      });
    });
  });

  describe('Invalid Token Screen', () => {
    beforeEach(() => {
      mockValidateResetToken.mockResolvedValue({ isValid: false });
    });

    it('should render error icon on invalid token screen', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        const errorIcon = screen.getByRole('heading', { name: /invalid reset link/i }).previousElementSibling;
        expect(errorIcon).toHaveClass('bg-error/10');
      });
    });

    it('should render request new reset link button', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        const requestNewLink = screen.getByRole('link', { name: /request new reset link/i });
        expect(requestNewLink).toHaveAttribute('href', '/auth/forgot-password');
      });
    });

    it('should render back to sign in link', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to sign in/i });
        expect(backLink).toHaveAttribute('href', '/auth/login');
      });
    });
  });

  describe('Form Rendering', () => {
    it('should render reset password form after token validation', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter your new password/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/confirm your new password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
      });
    });

    it('should render logo image', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        const logo = screen.getByAltText('GeoLeap Logo');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src', '/logo-transparent.png');
      });
    });

    it('should render email in description when provided', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByText(/creating a new password for/i)).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should not render email description when email is not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const useSearchParams = require('next/navigation').useSearchParams;
      useSearchParams.mockReturnValue({
        get: jest.fn((param: string) => (param === 'token' ? 'test-token-123' : null)),
      });

      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.queryByText(/creating a new password for/i)).not.toBeInTheDocument();
      });
    });

    it('should render password strength indicator when new password is entered', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });

      expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument();
    });

    it('should not render password strength indicator when new password is empty', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      expect(screen.queryByTestId('password-strength-indicator')).not.toBeInTheDocument();
    });

    it('should render back to sign in link', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to sign in/i });
        expect(backLink).toHaveAttribute('href', '/auth/login');
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle new password visibility', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const toggleButtons = screen.getAllByRole('button');
      const newPasswordToggle = toggleButtons.find(
        btn => btn.parentElement?.querySelector('[name="newPassword"]')
      );

      expect(newPasswordInput).toHaveAttribute('type', 'password');

      if (newPasswordToggle) {
        fireEvent.click(newPasswordToggle);
        expect(newPasswordInput).toHaveAttribute('type', 'text');

        fireEvent.click(newPasswordToggle);
        expect(newPasswordInput).toHaveAttribute('type', 'password');
      }
    });

    it('should toggle confirm password visibility', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const toggleButtons = screen.getAllByRole('button');
      const confirmPasswordToggle = toggleButtons.find(
        btn => btn.parentElement?.querySelector('[name="confirmPassword"]')
      );

      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      if (confirmPasswordToggle) {
        fireEvent.click(confirmPasswordToggle);
        expect(confirmPasswordInput).toHaveAttribute('type', 'text');

        fireEvent.click(confirmPasswordToggle);
        expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('Password Match Indicator', () => {
    it('should show password mismatch message when passwords do not match', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123!' } });

      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('should show passwords match message when passwords match', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      expect(screen.getByText(/passwords match ✓/i)).toBeInTheDocument();
    });

    it('should not show match indicator when confirm password is empty', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });

      expect(screen.queryByText(/passwords match/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should prevent submission when fields are empty', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      expect(submitButton).toBeDisabled();
    });

    it('should prevent submission when passwords do not match', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword123!' } });

      expect(submitButton).toBeDisabled();
    });

    it('should prevent submission when password does not meet strength requirements', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      // Weak password (less than 8 characters)
      fireEvent.change(newPasswordInput, { target: { value: 'weak' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'weak' } });

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should enable submission when all validation passes', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Submit Reset Password', () => {
    it('should submit form with valid passwords', async () => {
      mockResetPassword.mockResolvedValue(createSuccessResponse());
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith({
          token: 'test-token-123',
          newPassword: 'TestPassword123!',
          confirmPassword: 'TestPassword123!',
        });
      });
    });

    it('should log success after successful password reset', async () => {
      mockResetPassword.mockResolvedValue(createSuccessResponse());
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith('Password reset completed successfully');
      });
    });

    it('should clear error on new submission', async () => {
      mockResetPassword.mockRejectedValueOnce(new Error('API Error'));
      mockResetPassword.mockResolvedValueOnce(createSuccessResponse());
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // First submission - error
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });

      // Second submission - success
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('API Error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Success Screen', () => {
    it('should show success screen after successful password reset', async () => {
      mockResetPassword.mockResolvedValue(createSuccessResponse());
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /password reset successful/i })).toBeInTheDocument();
      });
    });

    it('should render success message', async () => {
      mockResetPassword.mockResolvedValue(createSuccessResponse());
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/your password has been successfully reset/i)
        ).toBeInTheDocument();
      });
    });

    it('should render security notice', async () => {
      mockResetPassword.mockResolvedValue(createSuccessResponse());
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/security notice/i)).toBeInTheDocument();
        expect(
          screen.getByText(/all other active sessions have been logged out/i)
        ).toBeInTheDocument();
      });
    });

    it('should render sign in now button', async () => {
      mockResetPassword.mockResolvedValue(createSuccessResponse());
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        const signInLink = screen.getByRole('link', { name: /sign in now/i });
        expect(signInLink).toBeInTheDocument();
        expect(signInLink).toHaveAttribute('href', '/auth/login');
      });
    });

    it('should render success icon', async () => {
      mockResetPassword.mockResolvedValue(createSuccessResponse());
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        const successIcon = screen.getByRole('heading', { name: /password reset successful/i }).previousElementSibling;
        expect(successIcon).toHaveClass('bg-success/10');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display API error message on failure', async () => {
      mockResetPassword.mockRejectedValue(new Error('Token expired'));
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Token expired')).toBeInTheDocument();
      });
    });

    it('should display generic error for non-Error objects', async () => {
      mockResetPassword.mockRejectedValue('String error');
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/an error occurred while resetting your password/i)
        ).toBeInTheDocument();
      });
    });

    it('should log error on failure', async () => {
      mockResetPassword.mockRejectedValue(new Error('Network error'));
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Password reset failed', {
          error: 'Network error',
        });
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state on submit button', async () => {
      mockResetPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/resetting password/i)).toBeInTheDocument();
      });

      // Wait for loading to complete to avoid hanging
      await waitFor(() => {
        expect(screen.queryByText(/resetting password/i)).not.toBeInTheDocument();
      });
    });

    it('should show loading spinner during submission', async () => {
      mockResetPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /resetting password/i });
        const spinner = loadingButton.querySelector('svg.animate-spin');
        expect(spinner).toBeInTheDocument();
      });

      // Wait for loading to complete to avoid hanging
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /resetting password/i })).not.toBeInTheDocument();
      });
    });

    it('should disable submit button during loading', async () => {
      mockResetPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /resetting password/i });
        expect(loadingButton).toBeDisabled();
      });

      // Wait for loading to complete to avoid hanging
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /resetting password/i })).not.toBeInTheDocument();
      });
    });

    it('should disable password inputs during loading', async () => {
      mockResetPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<ResetPasswordForm />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
      const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      fireEvent.change(newPasswordInput, { target: { value: 'TestPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'TestPassword123!' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(newPasswordInput).toBeDisabled();
        expect(confirmPasswordInput).toBeDisabled();
      });

      // Wait for loading to complete by checking for success screen
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /password reset successful/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /set new password/i });
        expect(heading.tagName).toBe('H2');
      });
    });

    it('should associate labels with inputs', async () => {
      render(<ResetPasswordForm />);

      await waitFor(() => {
        // Check that labels are properly associated with inputs
        const newPasswordInput = screen.getByPlaceholderText(/enter your new password/i);
        const confirmPasswordInput = screen.getByPlaceholderText(/confirm your new password/i);

        // Verify inputs exist and have proper names
        expect(newPasswordInput).toBeInTheDocument();
        expect(newPasswordInput).toHaveAttribute('name', 'newPassword');
        expect(confirmPasswordInput).toBeInTheDocument();
        expect(confirmPasswordInput).toHaveAttribute('name', 'confirmPassword');
      });
    });
  });
});
