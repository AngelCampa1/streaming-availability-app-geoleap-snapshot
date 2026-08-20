'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRateLimit } from '@/components/RateLimitNotification';
import { SSOButtons, SSODivider, SSOResponse } from '@/components/auth/SSOButtons';
import { Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';
import { getSafeRedirectPath } from '@/lib/redirect';

// Password requirement interface for real-time validation
interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

function RegisterPageContent() {
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { register, login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { rateLimited, handleRateLimitError, clearRateLimit, RateLimitComponent } = useRateLimit();

  const getPostRegistrationRedirect = useCallback((fallback = '/dashboard') => {
    const redirectParam = searchParams.get('redirect');
    if (redirectParam) return getSafeRedirectPath(redirectParam, fallback);
    if (searchParams.get('plan') === 'annual') return '/upgrade?annual=true';
    return fallback;
  }, [searchParams]);

  // Password requirements for real-time validation
  const passwordRequirements: PasswordRequirement[] = useMemo(() => [
    { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
    { id: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
  ], []);

  // Calculate password strength (0-100)
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    const passedRequirements = passwordRequirements.filter(req => req.test(password)).length;
    return (passedRequirements / passwordRequirements.length) * 100;
  }, [password, passwordRequirements]);

  // Get strength label and color
  const strengthInfo = useMemo(() => {
    if (passwordStrength === 0) return { label: '', color: 'bg-muted' };
    if (passwordStrength < 40) return { label: 'Weak', color: 'bg-destructive' };
    if (passwordStrength < 80) return { label: 'Medium', color: 'bg-warning' };
    return { label: 'Strong', color: 'bg-success' };
  }, [passwordStrength]);

  // Check if passwords match (for real-time feedback)
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null; // Don't show error for empty field
    return password === confirmPassword;
  }, [password, confirmPassword]);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = getPostRegistrationRedirect('/');
      router.push(redirectTo);
    }
  }, [getPostRegistrationRedirect, isAuthenticated, router, searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*]/.test(pwd)) {
      return 'Password must contain at least one special character (!@#$%^&*)';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    clearRateLimit();

    if (rateLimited) {
      return;
    }

    // Validation
    if (!fullName.trim()) {
      setError('Name is required');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptTerms) {
      setError('You must accept the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      const [first, ...rest] = fullName.trim().split(' ');
      const lastName = rest.join(' ') || first;
      await register(email, password, confirmPassword, first, lastName);

      // Show success message
      setRegistrationSuccess(true);

      // Auto-login the user after successful registration
      try {
        const redirectTo = getPostRegistrationRedirect('/dashboard');
        await login(email, password, true, redirectTo);
        // Login will handle the redirect
      } catch (loginError) {
        // If auto-login fails, redirect to login page after delay
        console.warn('Auto-login after registration failed:', loginError);
        setTimeout(() => {
          router.push('/auth/login?registered=true');
        }, 2000);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Check if it's a rate limiting error
        if (err.message.includes('rate limit') || err.message.includes('too many attempts')) {
          handleRateLimitError({ statusCode: 429, message: err.message });
        } else {
          // Check if error has validation details (from improved apiCall)
          const errorWithDetails = err as Error & {
            validationErrors?: Record<string, string[]>;
            statusCode?: number;
            errorCode?: string;
          };

          if (errorWithDetails.validationErrors) {
            // Display field-specific errors
            setFieldErrors(errorWithDetails.validationErrors);
            setError(err.message); // Also show the main error message
          } else {
            // Handle specific error messages from backend
            if (
              err.message.toLowerCase().includes('already registered') ||
              err.message.toLowerCase().includes('duplicate')
            ) {
              setError('This email address is already registered. Please sign in or use a different email.');
              setFieldErrors({ Email: [err.message] });
            } else if (err.message.toLowerCase().includes('password')) {
              setError(err.message);
              setFieldErrors({ Password: [err.message] });
            } else if (err.message.toLowerCase().includes('email') && err.message.toLowerCase().includes('invalid')) {
              setError('Please enter a valid email address.');
              setFieldErrors({ Email: [err.message] });
            } else {
              setError(err.message);
            }
          }
        }
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOSuccess = (response: SSOResponse) => {
    if (response.success && response.user) {
      // SECURITY: Tokens are stored in httpOnly cookies by the backend
      // Do NOT store tokens in localStorage - this prevents XSS attacks
      // The credentials: 'include' option in API calls sends cookies automatically

      // Redirect to intended destination or home
      const redirectTo = getSafeRedirectPath(getPostRegistrationRedirect(localStorage.getItem('redirectAfterLogin') || '/'));
      localStorage.removeItem('redirectAfterLogin');
      router.push(redirectTo);
    }
  };

  const handleSSOError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleContinueWithEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setError('');

    if (!email.trim()) {
      setEmailError('Email address is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setStep(2);
  };

  if (isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-background/90 backdrop-blur-sm rounded-2xl p-8 border border-border/50 shadow-xl">
        {/* UX Fix: Back to Home link for easier navigation */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            aria-label="Back to Home"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo-transparent.png"
              alt="GeoLeap Logo"
              width={80}
              height={80}
              className="mx-auto"
              priority
            />
          </Link>
          <h1 className="mt-4 text-center text-3xl font-bold text-foreground">Create your free GeoLeap account</h1>
          <p className="mt-2 text-center text-sm text-foreground-muted">
            Save searches, build a watchlist, and see where your shows are streaming before you switch VPN countries.
          </p>
        </div>
        {step === 1 ? (
          /* Step 1: SSO + Email entry */
          <div className="mt-8 space-y-6">
            <SSOButtons
              onSuccess={handleSSOSuccess}
              onError={handleSSOError}
              disabled={isLoading || rateLimited}
              mode="register"
            />

            <SSODivider />

            <form onSubmit={handleContinueWithEmail} noValidate>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email-address" className="sr-only">
                    Email Address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-label="Email Address"
                    className={`appearance-none relative block w-full min-h-[44px] px-3 py-2 border placeholder-muted-foreground text-foreground rounded-md focus:outline-none focus:ring-ring focus:border-ring focus:z-10 sm:text-sm ${
                      emailError || fieldErrors.Email ? 'border-error' : 'border-border'
                    }`}
                    placeholder="Email address"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                    disabled={isLoading}
                  />
                  {emailError && <p className="mt-1 text-sm text-error-foreground">{emailError}</p>}
                  {fieldErrors.Email && <p className="mt-1 text-sm text-error-foreground">{fieldErrors.Email[0]}</p>}
                </div>

                <button
                  type="submit"
                  className="group relative w-full flex justify-center items-center gap-2 min-h-[44px] py-2 px-4 border border-transparent text-sm font-medium rounded-full text-primary-foreground bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  aria-label="Continue with Email"
                >
                  Continue with email
                </button>
              </div>
            </form>

            {error && !rateLimited && (
              <div className="bg-error/10 border border-error text-error-foreground px-4 py-3 rounded">{error}</div>
            )}

            {RateLimitComponent}

            <div className="text-center">
              <p className="text-sm text-foreground-muted">
                Already have an account?{' '}
                <Link href="/auth/login" className="font-medium text-primary hover:text-primary-hover">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* Step 2: Complete registration */
          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate encType="application/x-www-form-urlencoded">
            {/* Email display with change link */}
            <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-foreground">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setFieldErrors({}); }}
                className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
              >
                Change
              </button>
            </div>

            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="full-name" className="sr-only">
                  Full Name
                </label>
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  aria-label="Full Name"
                  className="appearance-none rounded-none relative block w-full min-h-[44px] px-3 py-2 border border-border placeholder-muted-foreground text-foreground rounded-t-md focus:outline-none focus:ring-ring focus:border-ring focus:z-10 sm:text-sm"
                  placeholder="Your name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {/* Password field with visibility toggle */}
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-label="Password"
                  className={`appearance-none rounded-none relative block w-full min-h-[44px] px-3 py-2 pr-12 border placeholder-muted-foreground text-foreground focus:outline-none focus:ring-ring focus:border-ring focus:z-10 sm:text-sm ${
                    fieldErrors.Password ? 'border-error' : 'border-border'
                  }`}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password && (
                <div className="px-3 py-2 bg-muted/50 border-x border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Password strength</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength < 40 ? 'text-destructive' :
                      passwordStrength < 80 ? 'text-warning' : 'text-success'
                    }`}>
                      {strengthInfo.label}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  {/* Real-time requirement checklist */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {passwordRequirements.map(req => {
                      const passed = req.test(password);
                      return (
                        <div key={req.id} className="flex items-center gap-2 text-xs">
                          {passed ? (
                            <Check className="h-3.5 w-3.5 text-success flex-shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className={passed ? 'text-success' : 'text-muted-foreground'}>
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {fieldErrors.Password && (
                <p className="px-3 py-1 text-sm text-error-foreground bg-error/5 border-x border-border">{fieldErrors.Password[0]}</p>
              )}

              {/* Confirm Password field with visibility toggle and mismatch indicator */}
              <div className="relative">
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-label="Confirm Password"
                  className={`appearance-none rounded-none relative block w-full min-h-[44px] px-3 py-2 pr-12 border placeholder-muted-foreground text-foreground rounded-b-md focus:outline-none focus:ring-ring focus:border-ring focus:z-10 sm:text-sm ${
                    passwordsMatch === false ? 'border-error bg-error/5' : 'border-border'
                  }`}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password match indicator - reserve space to prevent layout shift */}
              <div className="h-6 px-3">
                {passwordsMatch === false && (
                  <p className="text-sm text-error-foreground flex items-center gap-1">
                    <X className="h-4 w-4" />
                    Passwords do not match
                  </p>
                )}
                {passwordsMatch === true && (
                  <p className="text-sm text-success flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Passwords match
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center min-h-[44px]">
                <input
                  id="accept-terms"
                  name="accept-terms"
                  type="checkbox"
                  className="h-5 w-5 text-primary focus:ring-ring border-border rounded cursor-pointer"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  disabled={isLoading}
                />
              </div>
              <div className="ml-3 text-sm flex items-center min-h-[44px]">
                <label htmlFor="accept-terms" className="text-foreground cursor-pointer">
                  I agree to the{' '}
                  <Link href="/terms" className="font-medium text-primary hover:text-primary-hover">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="font-medium text-primary hover:text-primary-hover">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>

            {RateLimitComponent}

            {registrationSuccess && (
              <div className="bg-success/10 border border-success text-success px-4 py-3 rounded" role="status" aria-live="polite">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium">Account created successfully!</p>
                    <p className="text-sm">Redirecting you to the next step...</p>
                  </div>
                </div>
              </div>
            )}

            {error && !rateLimited && !registrationSuccess && (
              <div className="bg-error/10 border border-error text-error-foreground px-4 py-3 rounded">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || rateLimited}
                className="group relative w-full flex justify-center items-center gap-2 min-h-[44px] py-2 px-4 border border-transparent text-sm font-medium rounded-full text-primary-foreground bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                aria-label="Create Account"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? 'Creating account...' : rateLimited ? 'Rate limited' : 'Create free account'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-foreground-muted">
                Already have an account?{' '}
                <Link href="/auth/login" className="font-medium text-primary hover:text-primary-hover">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
