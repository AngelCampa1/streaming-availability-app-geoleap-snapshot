import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google Sign-In (lazy load for native module)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GoogleSignin: any = null;

// Only load native Google Sign-In on native platforms
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const googleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleModule.GoogleSignin;
  } catch (_error) {
    logger.warn('Google Sign-In package not installed');
  }
}

// Initialize Google Sign-In
if (process.env.NODE_ENV !== 'test' && GoogleSignin) {
  try {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
      offlineAccess: true,
    });
  } catch (error) {
    logger.warn('Failed to configure Google Sign-In:', error);
  }
}

export interface OAuthResult {
  tokens: {
    idToken: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt: number;
  };
  user: {
    id: string;
    email: string;
    name: string;
    photo?: string | null;
  };
}

export class OAuthService {
  /**
   * Sign in with Google
   * Uses @react-native-google-signin/google-signin for native
   * Uses expo-auth-session for web platform
   * Returns idToken for backend verification
   */
  static async signInWithGoogle(): Promise<OAuthResult> {
    try {
      // Use mock in development
      if (config.ENVIRONMENT === 'development') {
        logger.info('Using mock Google sign-in');
        return OAuthService.getMockGoogleResult();
      }

      // Web platform: Use Expo AuthSession
      if (Platform.OS === 'web') {
        return await OAuthService.signInWithGoogleWeb();
      }

      // Native platform: Use @react-native-google-signin
      if (!GoogleSignin) {
        logger.warn('Google Sign-In not available, using mock');
        return OAuthService.getMockGoogleResult();
      }

      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();

      // Per Google docs: response.data contains user info and idToken
      return {
        tokens: {
          idToken: result.data?.idToken || '',
          accessToken: result.data?.idToken || '',
          refreshToken: undefined,
          expiresAt: Date.now() + 3600000,
        },
        user: {
          id: result.data?.user?.id || '',
          email: result.data?.user?.email || '',
          name: result.data?.user?.name || '',
          photo: result.data?.user?.photo || null,
        },
      };
    } catch (error) {
      logger.error('Google sign-in error:', error);
      throw error;
    }
  }

  /**
   * Web-specific Google Sign-In using Expo AuthSession
   */
  private static async signInWithGoogleWeb(): Promise<OAuthResult> {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

    if (!clientId) {
      logger.warn('Google Web Client ID not configured');
      throw new Error('Google Sign-In is not configured for web');
    }

    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'geoleap',
      preferLocalhost: true,
    });

    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    const authRequest = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
    });

    const result = await authRequest.promptAsync(discovery);

    if (result.type !== 'success') {
      throw new Error('Google Sign-In was cancelled or failed');
    }

    // Fetch user info with the access token
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${result.params.access_token}` },
      }
    );
    const userInfo = await userInfoResponse.json();

    return {
      tokens: {
        idToken: result.params.id_token || result.params.access_token || '',
        accessToken: result.params.access_token || '',
        refreshToken: undefined,
        expiresAt: Date.now() + (parseInt(result.params.expires_in || '3600') * 1000),
      },
      user: {
        id: userInfo.sub || '',
        email: userInfo.email || '',
        name: userInfo.name || '',
        photo: userInfo.picture || null,
      },
    };
  }

  /**
   * Sign in with Apple (iOS only)
   * Per Apple docs: Returns identityToken (JWT) and authorizationCode
   * identityToken should be sent to backend for verification
   */
  static async signInWithApple(): Promise<OAuthResult> {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS');
      }

      if (config.ENVIRONMENT === 'development') {
        logger.info('Using mock Apple sign-in');
        return OAuthService.getMockAppleResult();
      }

      // Check if Apple Sign-In is available (iOS 13+)
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is not available on this device');
      }

      // Per Apple docs: Request email and fullName scopes
      // Note: These are only provided on FIRST sign-in
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Build full name from components (only available on first sign-in)
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
        : '';

      return {
        tokens: {
          // identityToken is a JWT for backend verification
          idToken: credential.identityToken || '',
          // authorizationCode for server-side token exchange
          accessToken: credential.authorizationCode || '',
          refreshToken: undefined,
          expiresAt: Date.now() + 3600000,
        },
        user: {
          // user is a stable identifier across apps by same developer
          id: credential.user,
          email: credential.email || '',
          name: fullName || 'Apple User',
          photo: null,
        },
      };
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'ERR_REQUEST_CANCELED') {
        throw new Error('Apple Sign-In was cancelled');
      }
      logger.error('Apple sign-in error:', error);
      throw error;
    }
  }

  static async signOut(): Promise<void> {
    try {
      if (config.ENVIRONMENT !== 'development' && GoogleSignin) {
        await GoogleSignin.signOut();
      }
      // Note: Apple Sign-In doesn't have a sign-out method
      // User manages Apple ID associations through device settings
      logger.info('OAuth sign-out completed');
    } catch (error) {
      logger.error('OAuth sign-out error:', error);
    }
  }

  /**
   * Check if Google Sign-In is available
   * Returns true for web (uses AuthSession) and native with GoogleSignin installed
   */
  static isGoogleAvailable(): boolean {
    // Web always supports Google Sign-In via AuthSession
    if (Platform.OS === 'web') {
      return !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    }
    // Native requires the GoogleSignin module
    return GoogleSignin !== null;
  }

  /**
   * Check if Apple Sign-In is available (iOS only, iOS 13+)
   */
  static async isAppleAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    return await AppleAuthentication.isAvailableAsync();
  }

  // Mock helpers for development
  private static getMockGoogleResult(): OAuthResult {
    return {
      tokens: {
        idToken: 'mock_google_id_token',
        accessToken: 'mock_google_token',
        refreshToken: 'mock_google_refresh',
        expiresAt: Date.now() + 3600000,
      },
      user: {
        id: 'mock-google-user-id',
        email: 'test@gmail.com',
        name: 'Google Test User',
        photo: 'https://via.placeholder.com/100',
      },
    };
  }

  private static getMockAppleResult(): OAuthResult {
    return {
      tokens: {
        idToken: 'mock_apple_id_token',
        accessToken: 'mock_apple_token',
        refreshToken: 'mock_apple_refresh',
        expiresAt: Date.now() + 3600000,
      },
      user: {
        id: 'mock-apple-user-id',
        email: 'test@icloud.com',
        name: 'Apple Test User',
        photo: null,
      },
    };
  }
}

export default OAuthService;
