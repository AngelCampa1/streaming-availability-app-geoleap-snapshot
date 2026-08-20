'use client';

import { GoogleOAuthProvider as GoogleOAuthProviderLib } from '@react-oauth/google';
import { ReactNode } from 'react';

interface GoogleOAuthProviderProps {
  children: ReactNode;
}

/**
 * Google OAuth provider wrapper for the application
 * Wraps children with GoogleOAuthProvider from @react-oauth/google
 */
export function GoogleOAuthProvider({ children }: GoogleOAuthProviderProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // If no client ID is configured, render children without the provider
  // This allows the app to work without Google SSO configured
  if (!clientId) {
    return <>{children}</>;
  }

  return <GoogleOAuthProviderLib clientId={clientId}>{children}</GoogleOAuthProviderLib>;
}

export default GoogleOAuthProvider;
