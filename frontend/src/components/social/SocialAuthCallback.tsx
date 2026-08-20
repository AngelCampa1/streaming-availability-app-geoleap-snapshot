/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';
import { useAuth } from '../../contexts/AuthContext';
import { getSafeRedirectPath } from '../../lib/redirect';

type AuthCallbackStatus = 'loading' | 'success' | 'error' | 'unauthorized';

interface AuthCallbackError {
  code: string;
  message: string;
  details?: string;
}

export function SocialAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshConnections } = useSocialAuth();
  const { checkAuthStatus } = useAuth();

  const [status, setStatus] = useState<AuthCallbackStatus>('loading');
  const [error, setError] = useState<AuthCallbackError | null>(null);
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    handleAuthCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleAuthCallback = async () => {
    try {
      setStatus('loading');
      setError(null);

      // Extract parameters from URL
      const code = searchParams?.get('code');
      const state = searchParams?.get('state');
      const errorParam = searchParams?.get('error');
      const errorDescription = searchParams?.get('error_description');
      const providerParam = searchParams?.get('provider');

      if (providerParam) {
        setProvider(providerParam);
      }

      // Handle OAuth errors
      if (errorParam) {
        const errorMessages: Record<string, string> = {
          access_denied: 'You denied access to your social account.',
          invalid_request: 'The authentication request was invalid.',
          unauthorized_client: 'The application is not authorized.',
          unsupported_response_type: 'This authentication method is not supported.',
          invalid_scope: 'The requested permissions are invalid.',
          server_error: 'The social provider encountered an error.',
          temporarily_unavailable: 'The social provider is temporarily unavailable.',
        };

        setError({
          code: errorParam,
          message: errorMessages[errorParam] || 'An unknown error occurred during authentication.',
          details: errorDescription || undefined,
        });
        setStatus('error');
        return;
      }

      // Ensure we have required parameters
      if (!code || !state) {
        setError({
          code: 'missing_parameters',
          message: 'Missing required authentication parameters.',
          details: 'The social provider did not return the expected authentication code.',
        });
        setStatus('error');
        return;
      }

      // Parse state parameter to get original provider and any redirect URL
      let stateData: Record<string, any> = {};
      try {
        stateData = JSON.parse(atob(state));
        if (stateData.provider && !providerParam) {
          setProvider(stateData.provider);
        }
      } catch (stateError) {
        console.warn('Could not parse state parameter:', stateError);
      }

      // Call backend to complete OAuth flow
      // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage)
      const response = await fetch('/api/social-auth/callback', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          state,
          provider: providerParam || stateData.provider,
          redirectUri: window.location.origin + '/auth/social/callback',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Handle different response types
      if (data.type === 'login') {
        // SECURITY: Tokens are stored in httpOnly cookies by the backend
        // Do NOT store tokens in localStorage - this prevents XSS attacks
        // Just refresh auth context - cookies are sent automatically with credentials: 'include'

        // Refresh auth context
        await checkAuthStatus();
      } else if (data.type === 'connection') {
        // Account connection - refresh connections
        await refreshConnections();
      }

      setStatus('success');

      // Redirect after success
      setTimeout(() => {
        const redirectUrl = getSafeRedirectPath(
          localStorage.getItem('socialAuthRedirect') ||
          stateData.redirect,
          data.type === 'login' ? '/dashboard' : '/settings/social'
        );

        localStorage.removeItem('socialAuthRedirect');
        router.push(redirectUrl);
      }, 2000);
    } catch (authError) {
      console.error('Auth callback error:', authError);
      setError({
        code: 'callback_error',
        message: authError instanceof Error ? authError.message : 'Authentication failed',
        details: 'Please try logging in again.',
      });
      setStatus('error');
    }
  };

  const handleRetry = () => {
    router.push('/auth/login');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 size={48} className="animate-spin text-primary" />;
      case 'success':
        return <CheckCircle size={48} className="text-success" />;
      case 'error':
        return <XCircle size={48} className="text-destructive" />;
      case 'unauthorized':
        return <AlertTriangle size={48} className="text-warning" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return {
          title: 'Completing Authentication',
          subtitle: provider ? `Connecting your ${provider} account...` : 'Processing your login...',
        };
      case 'success':
        return {
          title: 'Authentication Successful!',
          subtitle: 'Redirecting you now...',
        };
      case 'error':
        return {
          title: 'Authentication Failed',
          subtitle: error?.message || 'An unexpected error occurred.',
        };
      case 'unauthorized':
        return {
          title: 'Access Denied',
          subtitle: 'You do not have permission to access this resource.',
        };
    }
  };

  const message = getStatusMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">{getStatusIcon()}</div>

          <h2 className="text-2xl font-bold text-foreground mb-2">{message.title}</h2>

          <p className="text-muted-foreground mb-6">{message.subtitle}</p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 text-left">
              <div className="flex">
                <XCircle size={20} className="text-destructive mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-destructive">Error Code: {error.code}</h3>
                  <p className="text-sm text-destructive/90 mt-1">{error.message}</p>
                  {error.details && <p className="text-sm text-destructive/80 mt-2">{error.details}</p>}
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Try Again
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full flex justify-center py-2 px-4 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Go Home
              </button>
            </div>
          )}

          {status === 'loading' && <div className="text-sm text-muted-foreground">This may take a few seconds...</div>}
        </div>
      </div>
    </div>
  );
}

export default SocialAuthCallback;
