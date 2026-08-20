/**
 * Social Login Buttons Component Collection
 * Platform-specific login buttons with OAuth 2.0 flows
 */

'use client';

import React, { useState, useCallback } from 'react';
import { SocialPlatform, SocialLoginButtonProps, OAuthCallbackResult } from '../../types/social';
import { useSocialAuth } from '../../contexts/SocialAuthContext';
import { getSocialColor } from '../../lib/social-platform-colors';

// Individual platform button configurations
const PLATFORM_CONFIGS = {
  [SocialPlatform.Facebook]: {
    name: 'Facebook',
    displayName: 'Continue with Facebook',
    icon: '📘',
    color: getSocialColor('facebook'),
    bgColor: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    textColor: 'text-white',
  },
  [SocialPlatform.Twitter]: {
    name: 'Twitter',
    displayName: 'Continue with Twitter',
    icon: '🐦',
    color: getSocialColor('twitter'),
    bgColor: 'bg-sky-500',
    hoverColor: 'hover:bg-sky-600',
    textColor: 'text-white',
  },
  [SocialPlatform.Instagram]: {
    name: 'Instagram',
    displayName: 'Continue with Instagram',
    icon: '📷',
    color: getSocialColor('instagram'),
    bgColor: 'bg-pink-500',
    hoverColor: 'hover:bg-pink-600',
    textColor: 'text-white',
  },
  [SocialPlatform.TikTok]: {
    name: 'TikTok',
    displayName: 'Continue with TikTok',
    icon: '🎵',
    color: getSocialColor('tiktok'),
    bgColor: 'bg-red-500',
    hoverColor: 'hover:bg-red-600',
    textColor: 'text-white',
  },
  [SocialPlatform.LinkedIn]: {
    name: 'LinkedIn',
    displayName: 'Continue with LinkedIn',
    icon: '💼',
    color: getSocialColor('linkedin'),
    bgColor: 'bg-blue-700',
    hoverColor: 'hover:bg-blue-800',
    textColor: 'text-white',
  },
  [SocialPlatform.YouTube]: {
    name: 'YouTube',
    displayName: 'Continue with YouTube',
    icon: '📺',
    color: getSocialColor('youtube'),
    bgColor: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
    textColor: 'text-white',
  },
  [SocialPlatform.Discord]: {
    name: 'Discord',
    displayName: 'Continue with Discord',
    icon: '🎮',
    color: getSocialColor('discord'),
    bgColor: 'bg-indigo-600',
    hoverColor: 'hover:bg-indigo-700',
    textColor: 'text-white',
  },
  [SocialPlatform.Twitch]: {
    name: 'Twitch',
    displayName: 'Continue with Twitch',
    icon: '🎮',
    color: getSocialColor('twitch'),
    bgColor: 'bg-purple-600',
    hoverColor: 'hover:bg-purple-700',
    textColor: 'text-white',
  },
  [SocialPlatform.Reddit]: {
    name: 'Reddit',
    displayName: 'Continue with Reddit',
    icon: '🔗',
    color: getSocialColor('reddit'),
    bgColor: 'bg-orange-600',
    hoverColor: 'hover:bg-orange-700',
    textColor: 'text-white',
  },
  [SocialPlatform.WhatsApp]: {
    name: 'WhatsApp',
    displayName: 'Continue with WhatsApp',
    icon: '💬',
    color: getSocialColor('whatsapp'),
    bgColor: 'bg-green-600',
    hoverColor: 'hover:bg-green-700',
    textColor: 'text-white',
  },
};

// Size configurations
const SIZE_CONFIGS = {
  small: {
    padding: 'px-3 py-2',
    text: 'text-sm',
    icon: 'text-lg',
  },
  medium: {
    padding: 'px-4 py-2.5',
    text: 'text-base',
    icon: 'text-xl',
  },
  large: {
    padding: 'px-6 py-3',
    text: 'text-lg',
    icon: 'text-2xl',
  },
};

// Individual Social Login Button Component
export const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  platform,
  size = 'medium',
  variant = 'filled',
  disabled = false,
  loading = false,
  redirectTo,
  onSuccess,
  onError,
  className = '',
}) => {
  const { loginWithProvider, isConnecting, canConnect, error: _error } = useSocialAuth();

  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const config = PLATFORM_CONFIGS[platform];
  const sizeConfig = SIZE_CONFIGS[size];
  const isLoading = loading || isLocalLoading || isConnecting[platform];
  const canLogin = canConnect(platform) && !disabled && !isLoading;

  // Handle login click
  const handleLogin = useCallback(async () => {
    if (!canLogin) return;

    try {
      setIsLocalLoading(true);
      await loginWithProvider(platform, redirectTo);

      // Mock success callback for demo
      const mockResult: OAuthCallbackResult = {
        isSuccess: true,
        userInfo: {
          id: `${platform}_user_123`,
          username: 'user123',
          displayName: 'John Doe',
          email: 'john@example.com',
          profileImageUrl: 'https://example.com/avatar.jpg',
          bio: 'Social media user',
          followersCount: 100,
          followingCount: 50,
          isVerified: false,
        },
        grantedScopes: ['public_profile', 'email'],
        tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      onSuccess?.(mockResult);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      onError?.(error);
    } finally {
      setIsLocalLoading(false);
    }
  }, [canLogin, loginWithProvider, platform, redirectTo, onSuccess, onError]);

  // Generate button styles
  const getButtonStyles = () => {
    const baseStyles = `
      inline-flex items-center justify-center
      border border-transparent rounded-full
      font-medium transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${sizeConfig.padding} ${sizeConfig.text}
    `;

    if (variant === 'outline') {
      return `${baseStyles} border-border bg-card text-foreground hover:bg-muted focus:ring-ring`;
    }

    return `${baseStyles} ${config.bgColor} ${config.hoverColor} ${config.textColor} focus:ring-ring`;
  };

  // Accessibility props
  const ariaLabel = `Login with ${config.name}`;
  const ariaDescription = isLoading ? `Connecting to ${config.name}...` : `Connect your ${config.name} account`;

  return (
    <button
      onClick={handleLogin}
      disabled={!canLogin}
      className={`${getButtonStyles()} ${className}`}
      aria-label={ariaLabel}
      aria-describedby={`${platform}-description`}
      type="button"
    >
      {/* Loading spinner or icon */}
      {isLoading ? (
        <svg className={`animate-spin mr-2 ${sizeConfig.icon}`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <span className={`mr-2 ${sizeConfig.icon}`}>{config.icon}</span>
      )}

      {/* Button text */}
      <span>{isLoading ? 'Connecting...' : config.displayName}</span>

      {/* Hidden description for screen readers */}
      <span id={`${platform}-description`} className="sr-only">
        {ariaDescription}
      </span>
    </button>
  );
};

// Collection of all social login buttons
interface SocialLoginButtonsProps {
  platforms?: SocialPlatform[];
  size?: 'small' | 'medium' | 'large';
  variant?: 'outline' | 'filled';
  layout?: 'vertical' | 'horizontal' | 'grid';
  redirectTo?: string;
  onSuccess?: (platform: SocialPlatform, result: OAuthCallbackResult) => void;
  onError?: (platform: SocialPlatform, error: Error) => void;
  className?: string;
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  platforms = [SocialPlatform.Facebook, SocialPlatform.Twitter, SocialPlatform.Instagram, SocialPlatform.TikTok],
  size = 'medium',
  variant = 'filled',
  layout = 'vertical',
  redirectTo,
  onSuccess,
  onError,
  className = '',
}) => {
  const { connections, error } = useSocialAuth();

  // Handle individual button success
  const handleButtonSuccess = useCallback(
    (platform: SocialPlatform) => (result: OAuthCallbackResult) => {
      onSuccess?.(platform, result);
    },
    [onSuccess]
  );

  // Handle individual button error
  const handleButtonError = useCallback(
    (platform: SocialPlatform) => (error: Error) => {
      onError?.(platform, error);
    },
    [onError]
  );

  // Get layout styles
  const getLayoutStyles = () => {
    switch (layout) {
      case 'horizontal':
        return 'flex flex-wrap gap-3';
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 gap-3';
      case 'vertical':
      default:
        return 'space-y-3';
    }
  };

  return (
    <div className={`social-login-buttons ${className}`}>
      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg">
          <div className="flex items-center">
            <span className="text-error mr-2">⚠️</span>
            <p className="text-error text-sm">{error.message}</p>
          </div>
        </div>
      )}

      {/* Login buttons */}
      <div className={getLayoutStyles()}>
        {platforms.map(platform => (
          <SocialLoginButton
            key={platform}
            platform={platform}
            size={size}
            variant={variant}
            redirectTo={redirectTo}
            onSuccess={handleButtonSuccess(platform)}
            onError={handleButtonError(platform)}
            className={layout === 'horizontal' ? 'flex-1 min-w-0' : 'w-full'}
          />
        ))}
      </div>

      {/* Connection status */}
      {connections.length > 0 && (
        <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
          <p className="text-success text-sm">
            ✓ Connected to {connections.filter(c => c.isTokenValid).length} platform
            {connections.filter(c => c.isTokenValid).length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Privacy notice */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        By connecting your social accounts, you agree to our{' '}
        <a href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </a>{' '}
        and{' '}
        <a href="/terms" className="text-primary hover:underline">
          Terms of Service
        </a>
        . We never post without your permission.
      </div>
    </div>
  );
};

export default SocialLoginButtons;
