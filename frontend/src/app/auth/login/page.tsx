'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRateLimit } from '@/components/RateLimitNotification';
import { SSOButtons, SSODivider, SSOResponse } from '@/components/auth/SSOButtons';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { getSafeRedirectPath } from '@/lib/redirect';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // UX Fix: Password visibility toggle
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { rateLimited, handleRateLimitError, clearRateLimit, RateLimitComponent } = useRateLimit();

  useEffect(() => {
    if (isAuthenticated) {
      const redirectParam = searchParams.get('redirect');
      const redirectTo = redirectParam ? getSafeRedirectPath(redirectParam) : '/';
      router.push(redirectTo);
    }

    // Store redirect URL if provided
    const redirectParam = searchParams.get('redirect');
    if (redirectParam && !isAuthenticated) {
      localStorage.setItem('redirectAfterLogin', getSafeRedirectPath(redirectParam));
    }
  }, [isAuthenticated, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearRateLimit();

    if (rateLimited) {
      return;
    }

    setIsLoading(true);

    try {
      const redirectParam = searchParams.get('redirect');
      const redirectTo = redirectParam ? getSafeRedirectPath(redirectParam) : undefined;
      await login(email, password, rememberMe, redirectTo);
      // Redirect will be handled in the login function
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Check if it's a rate limiting error
        if (err.message.includes('rate limit') || err.message.includes('too many attempts')) {
          handleRateLimitError({ statusCode: 429, message: err.message });
        } else {
          setError(err.message);
        }
      } else {
        setError('Login failed');
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
      const redirectTo = getSafeRedirectPath(searchParams.get('redirect') || localStorage.getItem('redirectAfterLogin'));
      localStorage.removeItem('redirectAfterLogin');
      router.push(redirectTo);
    }
  };

  const handleSSOError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="max-w-md w-full space-y-8 bg-background/90 backdrop-blur-sm rounded-2xl p-8 border border-border/50 shadow-xl">
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
          <h1 className="mt-4 text-center text-3xl font-bold text-foreground">Sign in to your account</h1>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} encType="application/x-www-form-urlencoded">
          <div className="rounded-md shadow-sm space-y-0">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full min-h-[44px] px-3 py-2 border border-border placeholder-muted-foreground text-foreground rounded-t-md border-b-0 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {/* UX Fix: Password field with visibility toggle */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full min-h-[44px] px-3 py-2 pr-12 border border-border placeholder-muted-foreground text-foreground rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-5 w-5 text-primary focus:ring-primary border-border rounded cursor-pointer"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-3 block text-sm text-foreground cursor-pointer">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link href="/auth/forgot-password" className="font-medium text-primary hover:text-primary/80">
                Forgot your password?
              </Link>
            </div>
          </div>

          {RateLimitComponent}

          {/* UX Fix: Reserve space for errors to prevent layout shift */}
          <div className="min-h-[52px]">
            {error && !rateLimited && (
              <div className="bg-error/10 border border-error text-error px-4 py-3 rounded animate-in slide-in-from-top-2 duration-200">{error}</div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || rateLimited}
              className="group relative w-full flex justify-center items-center gap-2 min-h-[44px] py-2 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in...' : rateLimited ? 'Rate Limited' : 'Sign in'}
            </button>
          </div>

          <SSODivider />

          <SSOButtons
            onSuccess={handleSSOSuccess}
            onError={handleSSOError}
            disabled={isLoading || rateLimited}
            mode="login"
          />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="font-medium text-primary hover:text-primary/80">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
