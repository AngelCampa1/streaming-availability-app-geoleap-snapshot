'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSafeRedirectPath } from '@/lib/redirect';

function AuthCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get('error');
        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          setTimeout(() => router.push('/auth/login'), 3000);
          return;
        }

        // SECURITY: Tokens are stored in httpOnly cookies by the backend
        // Do NOT store tokens in localStorage - this prevents XSS attacks
        // Check for success parameter (backend sets cookies before redirect)
        const success = searchParams.get('success');

        if (success === 'true') {
          // Update auth state (tokens are in httpOnly cookies, sent automatically)
          await checkAuthStatus();

          setStatus('success');
          setMessage('Authentication successful! Redirecting...');

          // Redirect to intended page or home
          const redirectTo = getSafeRedirectPath(localStorage.getItem('redirectAfterLogin'));
          localStorage.removeItem('redirectAfterLogin');

          setTimeout(() => router.push(redirectTo), 1000);
        } else {
          setStatus('error');
          setMessage('Authentication failed: Invalid response from server');
          setTimeout(() => router.push('/auth/login'), 3000);
        }
      } catch (_error) {
        setStatus('error');
        setMessage('An error occurred during authentication');
        setTimeout(() => router.push('/auth/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, checkAuthStatus]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          <h2 className="text-2xl font-bold text-foreground">
            {status === 'loading' && 'Processing...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Error'}
          </h2>
          <p className="mt-2 text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
