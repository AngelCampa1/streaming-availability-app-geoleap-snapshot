'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { forgotPassword } from '@/lib/api';
import { logger } from '@/lib/logger';

// BUG FIX: Email validation pattern for proper user feedback
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');  // BUG FIX: Separate email validation error

  // BUG FIX: Validate email on blur for immediate feedback
  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError('Email address is required');
      return false;
    }
    if (!EMAIL_PATTERN.test(value)) {
      setEmailError('Please enter a valid email address (e.g., name@example.com)');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // BUG FIX: Validate email before submission
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);

    try {
      // BUG-E2E-001 FIX: Add explicit 10-second timeout wrapper for better UX
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        await forgotPassword(email);
        clearTimeout(timeoutId);
        setIsSubmitted(true);
        logger.info('Password reset requested', { email });
      } catch (apiError: unknown) {
        clearTimeout(timeoutId);
        throw apiError;
      }
    } catch (err: unknown) {
      // BUG-E2E-001 FIX: Better error messages for different failure scenarios
      let errorMessage = 'An error occurred while sending the reset email. Please try again.';

      if (err instanceof Error) {
        // Handle timeout specifically
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. The server is taking too long to respond. Please try again in a few moments.';
        }
        // Handle API timeout (from api.ts)
        else if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        }
        // Handle server errors
        else if (err.message.includes('500') || err.message.includes('Server error')) {
          errorMessage = 'Server is temporarily unavailable. Please try again in a few minutes.';
        }
        // Use the actual error message if it's user-friendly
        else if (err.message && !err.message.includes('fetch') && !err.message.includes('HTTP')) {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      logger.error('Password reset request failed', { email, error: errorMessage });
    } finally {
      // BUG-E2E-001 FIX: Always re-enable form, even on error
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
              <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 7.89a3 3 0 004.24 0L21 10M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Check Your Email</h2>
            <p className="text-muted-foreground mb-6">
              If an account with that email exists, you will receive a password reset email shortly. Please check your
              inbox and follow the instructions in the email.
            </p>
            <div className="bg-primary/10 border border-primary rounded-lg p-4 mb-6">
              <div className="flex">
                <svg className="h-5 w-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-primary">
                  <p className="font-medium">Didn&apos;t receive an email?</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Check your spam/junk folder</li>
                    <li>• Make sure the email address is correct</li>
                    <li>• Wait a few minutes for email delivery</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                className="w-full bg-primary text-white py-2 px-4 rounded-full hover:bg-primary/90 transition duration-200"
              >
                Try Another Email
              </button>
              <Link href="/auth/login" className="block w-full text-center text-primary hover:text-primary/80 py-2">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* UX Fix: Back to Home link for easier navigation */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/logo-transparent.png"
              alt="GeoLeap Logo"
              width={80}
              height={80}
              className="mx-auto"
              priority
            />
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Reset your password</h1>
          <p className="text-muted-foreground mb-8">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg">
              <div className="flex">
                <svg className="h-5 w-5 text-error mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              className={`w-full px-3 py-2 border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                emailError ? 'border-error ring-1 ring-error' : 'border-border'
              }`}
              placeholder="Enter your email address"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                // Clear error when user starts typing again
                if (emailError) setEmailError('');
              }}
              onBlur={e => validateEmail(e.target.value)}
              disabled={isLoading}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {/* BUG FIX: Show email validation error message */}
            {emailError && (
              <p id="email-error" className="mt-1 text-sm text-error flex items-center" role="alert">
                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {emailError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !!emailError}
            className="w-full bg-primary text-white py-2 px-4 rounded-full font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Sending Reset Email...
              </div>
            ) : (
              'Send Reset Email'
            )}
          </button>

          <div className="text-center space-y-2">
            <Link href="/auth/login" className="text-primary hover:text-primary/80 text-sm font-medium">
              Back to Sign In
            </Link>
            <div className="text-muted-foreground text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-primary hover:text-primary/80 font-medium">
                Sign up
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
