import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ForgotPasswordPage from '../page';
import { forgotPassword } from '@/lib/api';
import { logger } from '@/lib/logger';
import { createSuccessResponse } from '@/test-utils/apiMockHelpers';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  forgotPassword: jest.fn(),
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

const mockForgotPassword = forgotPassword as jest.MockedFunction<typeof forgotPassword>;

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render forgot password form', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset email/i })).toBeInTheDocument();
    });

    it('should render logo image', () => {
      render(<ForgotPasswordPage />);

      const logo = screen.getByAltText('GeoLeap Logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/logo-transparent.png');
    });

    it('should render email input with proper attributes', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByRole('textbox', { name: /email address/i });
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(emailInput).toHaveAttribute('pattern', '[^\\s@]+@[^\\s@]+\\.[^\\s@]+');
    });

    it('should render navigation links', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/auth/login');
      expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/auth/register');
    });

    it('should render logo as clickable link to home', () => {
      render(<ForgotPasswordPage />);

      const logoLink = screen.getByRole('link', { name: /geoleap logo/i });
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('Email Input & Validation', () => {
    it('should update email input value on change', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should validate email on blur and show error for empty email', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      fireEvent.blur(emailInput);

      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
    });

    it('should validate email on blur and show error for invalid format', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    it('should clear email validation error when user starts typing', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);

      // Trigger validation error
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();

      // Start typing to clear error
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });

    it('should not show error for valid email format', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.blur(emailInput);

      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });

    it('should show error styling on email input when validation fails', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      expect(emailInput).toHaveClass('border-error');
      expect(emailInput).toHaveClass('ring-1');
      expect(emailInput).toHaveClass('ring-error');
    });

    it('should set aria-invalid when email validation fails', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    });

    it('should display error message with role alert for accessibility', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent(/please enter a valid email address/i);
    });
  });

  describe('Submit Reset Request', () => {
    it('should submit form with valid email', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should not submit form if email validation fails', async () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockForgotPassword).not.toHaveBeenCalled();
      });
    });

    it('should log success after successful submission', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith('Password reset requested', {
          email: 'test@example.com',
        });
      });
    });

    it('should clear generic error on new submission', async () => {
      mockForgotPassword.mockRejectedValueOnce(new Error('API Error'));
      mockForgotPassword.mockResolvedValueOnce(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      // First submission - error
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
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
    it('should show success screen after successful submission', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
      });
    });

    it('should render success message with instructions', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/if an account with that email exists, you will receive a password reset email/i)
        ).toBeInTheDocument();
      });
    });

    it('should show helpful tips on success screen', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your spam\/junk folder/i)).toBeInTheDocument();
        expect(screen.getByText(/make sure the email address is correct/i)).toBeInTheDocument();
        expect(screen.getByText(/wait a few minutes for email delivery/i)).toBeInTheDocument();
      });
    });

    it('should render try another email button on success screen', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try another email/i })).toBeInTheDocument();
      });
    });

    it('should render back to sign in link on success screen', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to sign in/i });
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute('href', '/auth/login');
      });
    });

    it('should reset form when try another email is clicked', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
      });

      const tryAnotherButton = screen.getByRole('button', { name: /try another email/i });
      fireEvent.click(tryAnotherButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
      });

      const newEmailInput = screen.getByPlaceholderText(/enter your email address/i) as HTMLInputElement;
      expect(newEmailInput.value).toBe('');
    });

    it('should render success icon on success screen', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const successIconContainer = screen.getByRole('heading', { name: /check your email/i }).previousElementSibling;
        expect(successIconContainer).toHaveClass('bg-success/10');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display API error message on failure', async () => {
      mockForgotPassword.mockRejectedValue(new Error('User not found'));
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument();
      });
    });

    it('should display generic error for non-Error objects', async () => {
      mockForgotPassword.mockRejectedValue('String error');
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/an error occurred while sending the reset email/i)
        ).toBeInTheDocument();
      });
    });

    it('should log error on failure', async () => {
      mockForgotPassword.mockRejectedValue(new Error('Network error'));
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Password reset request failed', {
          email: 'test@example.com',
          error: 'Network error',
        });
      });
    });

    it('should render error with icon', async () => {
      mockForgotPassword.mockRejectedValue(new Error('API Error'));
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Find the outer error container (bg-error/10), not the inner flex div
        const errorText = screen.getByText('API Error');
        const innerDiv = errorText.closest('div');
        const errorContainer = innerDiv?.parentElement;
        expect(errorContainer).toHaveClass('bg-error/10');
        expect(errorContainer).toHaveClass('border-error');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state on submit button', async () => {
      mockForgotPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/sending reset email/i)).toBeInTheDocument();
      });
    });

    it('should show loading spinner during submission', async () => {
      mockForgotPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /sending reset email/i });
        const spinner = loadingButton.querySelector('svg.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should disable submit button during loading', async () => {
      mockForgotPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const loadingButton = screen.getByRole('button', { name: /sending reset email/i });
        expect(loadingButton).toBeDisabled();
      });
    });

    it('should disable email input during loading', async () => {
      mockForgotPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toBeDisabled();
      });
    });

    it('should re-enable button after submission completes', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Success screen shows, so original button is unmounted
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
      });
    });

    it('should disable button when email is empty', () => {
      render(<ForgotPasswordPage />);

      const submitButton = screen.getByRole('button', { name: /send reset email/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable button when email validation fails', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      expect(submitButton).toBeDisabled();
    });

    it('should enable button when email is valid', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<ForgotPasswordPage />);

      const heading = screen.getByRole('heading', { name: /reset your password/i });
      expect(heading.tagName).toBe('H1');
    });

    it('should associate label with email input', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('id', 'email');
    });

    it('should use semantic HTML for error messages', async () => {
      mockForgotPassword.mockRejectedValue(new Error('API Error'));
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Find the outer error container (bg-error/10), not the inner flex div
        const errorText = screen.getByText('API Error');
        const innerDiv = errorText.closest('div');
        const errorContainer = innerDiv?.parentElement;
        expect(errorContainer).toHaveClass('bg-error/10');
      });
    });

    it('should provide descriptive button text for loading state', async () => {
      mockForgotPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sending reset email/i })).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid submissions', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Rapid clicks
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should only be called once because button is disabled after first click
        expect(mockForgotPassword).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle whitespace-only email', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: '   ' } });

      expect(submitButton).toBeDisabled();
    });

    it('should trim email before validation', () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);

      fireEvent.change(emailInput, { target: { value: '  test@example.com  ' } });
      fireEvent.blur(emailInput);

      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });

    it('should handle very long email addresses', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: longEmail } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith(longEmail);
      });
    });

    it('should handle special characters in email', async () => {
      mockForgotPassword.mockResolvedValue(createSuccessResponse());
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset email/i });

      fireEvent.change(emailInput, { target: { value: 'test+tag@example.co.uk' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith('test+tag@example.co.uk');
      });
    });
  });
});
