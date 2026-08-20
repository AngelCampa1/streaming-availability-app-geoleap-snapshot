'use client';

import React, { useState } from 'react';
import { useGoogleLogin, TokenResponse } from '@react-oauth/google';
import AppleSignin from 'react-apple-signin-auth';
import { Button } from '@/components/ui/button';

interface SSOButtonsProps {
  onSuccess: (response: SSOResponse) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
  mode?: 'login' | 'register';
}

export interface SSOResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

interface GoogleSignInButtonProps {
  onSuccess: (response: SSOResponse) => void;
  onError: (error: string) => void;
  setSsoError: (error: string | null) => void;
  disabled: boolean;
  isLoading: boolean;
  setIsGoogleLoading: (loading: boolean) => void;
  mode: 'login' | 'register';
}

/**
 * Separate component for Google Sign-In button
 * This component must be rendered inside GoogleOAuthProvider context
 * By isolating the useGoogleLogin hook here, we prevent it from being called
 * when Google OAuth is not configured
 */
function GoogleSignInButton({
  onSuccess,
  onError,
  setSsoError,
  disabled,
  isLoading,
  setIsGoogleLoading,
  mode,
}: GoogleSignInButtonProps) {
  const handleGoogleSuccess = async (tokenResponse: TokenResponse) => {
    if (!tokenResponse.access_token) {
      const errorMessage = 'No access token received from Google';
      setSsoError(errorMessage);
      onError(errorMessage);
      return;
    }

    setIsGoogleLoading(true);
    setSsoError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          accessToken: tokenResponse.access_token,
          platform: 'web',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        onSuccess({
          success: true,
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      } else {
        const errorMessage = data.message || 'Google sign-in failed';
        setSsoError(errorMessage);
        onError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      setSsoError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setIsGoogleLoading(false);
    const errorMessage = 'Google sign-in was cancelled or failed';
    setSsoError(errorMessage);
    onError(errorMessage);
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
  });

  const isGoogleLoading = isLoading;

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-10 flex items-center justify-center gap-2 border-border hover:bg-muted/50"
      disabled={disabled || isLoading}
      onClick={() => googleLogin()}
    >
      {isGoogleLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Signing in...</span>
        </>
      ) : (
        <>
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{mode === 'register' ? 'Sign up with Google' : 'Sign in with Google'}</span>
        </>
      )}
    </Button>
  );
}

/**
 * SSO authentication buttons for Google and Apple Sign-In
 */
export function SSOButtons({
  onSuccess,
  onError,
  disabled = false,
  className = '',
  mode = 'login',
}: SSOButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  const handleAppleSuccess = async (response: {
    authorization: { id_token: string };
    user?: { name?: { firstName?: string; lastName?: string } };
  }) => {
    if (!response.authorization?.id_token) {
      const errorMessage = 'No token received from Apple';
      setSsoError(errorMessage);
      onError(errorMessage);
      return;
    }

    setIsAppleLoading(true);
    setSsoError(null);

    try {
      // Apple only provides the name on first sign-in
      let fullName: string | undefined;
      if (response.user?.name) {
        const { firstName, lastName } = response.user.name;
        fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
      }

      const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          idToken: response.authorization.id_token,
          platform: 'web',
          fullName,
        }),
      });

      const data = await apiResponse.json();

      if (apiResponse.ok && data.success !== false) {
        onSuccess({
          success: true,
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      } else {
        const errorMessage = data.message || 'Apple sign-in failed';
        setSsoError(errorMessage);
        onError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Apple sign-in failed';
      setSsoError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleAppleError = (error: unknown) => {
    // User cancelled or error occurred
    const errorMessage = error instanceof Error ? error.message : 'Apple sign-in was cancelled or failed';
    setSsoError(errorMessage);
    onError(errorMessage);
  };

  const isLoading = isGoogleLoading || isAppleLoading;
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;

  // Show message when no OAuth providers are configured
  const noProvidersConfigured = !googleClientId && !appleClientId;

  return (
    <div className={`space-y-3 ${className}`}>
      {ssoError && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">
          {ssoError}
        </div>
      )}

      {/* No OAuth Providers Configured Message */}
      {noProvidersConfigured && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            Social sign-in is temporarily unavailable.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please use email and password to {mode === 'register' ? 'create your account' : 'sign in'}.
          </p>
        </div>
      )}

      {/* Google Sign-In - Only render when configured to avoid useGoogleLogin hook error */}
      {googleClientId && (
        <GoogleSignInButton
          onSuccess={onSuccess}
          onError={onError}
          setSsoError={setSsoError}
          disabled={disabled}
          isLoading={isGoogleLoading}
          setIsGoogleLoading={setIsGoogleLoading}
          mode={mode}
        />
      )}

      {/* Apple Sign-In */}
      {appleClientId && (
        <AppleSignin
          authOptions={{
            clientId: appleClientId,
            scope: 'email name',
            redirectURI:
              typeof window !== 'undefined' ? `${window.location.origin}/api/auth/apple/callback` : '',
            state: 'state',
            nonce: 'nonce',
            usePopup: true,
          }}
          uiType="dark"
          className="w-full"
          noDefaultStyle={true}
          onSuccess={handleAppleSuccess}
          onError={handleAppleError}
          render={(props: { onClick: () => void }) => (
            <Button
              {...props}
              type="button"
              variant="outline"
              className="w-full h-10 flex items-center justify-center gap-2 border-border hover:bg-muted/50"
              disabled={disabled || isLoading}
            >
              {isAppleLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span>{mode === 'register' ? 'Sign up with Apple' : 'Sign in with Apple'}</span>
                </>
              )}
            </Button>
          )}
        />
      )}
    </div>
  );
}

/**
 * Check if any OAuth providers are configured
 * Used to conditionally render SSO-related UI elements
 */
export function hasOAuthProviders(): boolean {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
  return !!(googleClientId || appleClientId);
}

/**
 * Divider component for separating SSO from email/password login
 * Only renders if OAuth providers are configured
 */
export function SSODivider() {
  // Don't render the divider if no OAuth providers are configured
  if (!hasOAuthProviders()) {
    return null;
  }

  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-muted text-muted-foreground">Or continue with</span>
      </div>
    </div>
  );
}

export default SSOButtons;
