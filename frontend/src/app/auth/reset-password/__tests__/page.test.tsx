import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResetPasswordPage from '../page';

// Mock the ResetPasswordForm component
jest.mock('@/components/auth/ResetPasswordForm', () => ({
  ResetPasswordForm: () => <div data-testid="reset-password-form">Reset Password Form</div>,
}));

describe('ResetPasswordPage', () => {
  describe('Suspense Fallback', () => {
    it('should render Suspense wrapper', () => {
      render(<ResetPasswordPage />);

      // Form should render (Suspense doesn't suspend in tests without async components)
      expect(screen.getByTestId('reset-password-form')).toBeInTheDocument();
    });

    it('should render ResetPasswordForm component', () => {
      render(<ResetPasswordPage />);

      expect(screen.getByTestId('reset-password-form')).toBeInTheDocument();
      expect(screen.getByText('Reset Password Form')).toBeInTheDocument();
    });
  });
});
