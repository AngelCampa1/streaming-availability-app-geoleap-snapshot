'use client';

import React, { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useSocialAuth } from '@/contexts/SocialAuthContext';

const providerConfigs = {
  google: {
    name: 'Google',
    icon: '🌐',
    color: 'bg-background border border-border text-foreground hover:bg-muted',
    textColor: 'text-foreground',
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: 'bg-primary text-primary-foreground hover:bg-primary/90',
    textColor: 'text-primary-foreground',
  },
  twitter: {
    name: 'Twitter/X',
    icon: '𝕏',
    color: 'bg-foreground text-background hover:bg-foreground/90',
    textColor: 'text-background',
  },
  github: {
    name: 'GitHub',
    icon: '🐱',
    color: 'bg-foreground text-background hover:bg-foreground/90',
    textColor: 'text-background',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-primary text-primary-foreground hover:bg-primary/90',
    textColor: 'text-primary-foreground',
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    color: 'bg-primary text-primary-foreground hover:bg-primary/90',
    textColor: 'text-primary-foreground',
  },
} as const;

interface SocialLoginButtonProps {
  provider: keyof typeof providerConfigs;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (connection: any) => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
  variant?: 'login' | 'connect';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SocialLoginButton({
  provider,
  onSuccess,
  onError,
  redirectTo,
  variant = 'login',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
}: SocialLoginButtonProps) {
  const { loginWithProvider, connectProvider, isProviderConnected, canConnect } = useSocialAuth();
  const [isLoading, setIsLoading] = useState(false);

  const config = providerConfigs[provider];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isConnected = isProviderConnected(provider as any);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const handleClick = useCallback(async () => {
    if (disabled || isLoading) return;

    try {
      setIsLoading(true);

      if (variant === 'login') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await loginWithProvider(provider as any, redirectTo);
        // Note: This will redirect, so onSuccess won't be called
      } else {
        // Connect mode
        if (isConnected) {
          onError?.(new Error(`${config.name} is already connected`));
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!canConnect(provider as any)) {
          onError?.(new Error(`Cannot connect to ${config.name}. Check privacy settings.`));
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connection = await connectProvider(provider as any);
        onSuccess?.(connection);
      }
    } catch (error) {
      console.error(`Failed to ${variant} with ${provider}:`, error);
      onError?.(error instanceof Error ? error : new Error(`Failed to ${variant} with ${provider}`));
    } finally {
      setIsLoading(false);
    }
  }, [
    provider,
    variant,
    redirectTo,
    loginWithProvider,
    connectProvider,
    isConnected,
    canConnect,
    disabled,
    isLoading,
    onSuccess,
    onError,
    config.name,
  ]);

  const getButtonText = () => {
    if (isLoading) return '';

    if (variant === 'connect') {
      return isConnected ? `Connected to ${config.name}` : `Connect ${config.name}`;
    }

    return `Continue with ${config.name}`;
  };

  const buttonClass = `
    inline-flex items-center justify-center
    font-medium rounded-full
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
    disabled:opacity-50 disabled:cursor-not-allowed
    ${config.color}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${isConnected && variant === 'connect' ? 'opacity-75 cursor-default' : ''}
    ${className}
  `.trim();

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading || (variant === 'connect' && isConnected)}
      className={buttonClass}
      aria-label={getButtonText()}
      type="button"
    >
      <div className="flex items-center justify-center space-x-2">
        {isLoading ? (
          <Loader2 size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} className="animate-spin" />
        ) : (
          <span className={iconSizes[size]} role="img" aria-label={`${config.name} icon`}>
            {config.icon}
          </span>
        )}

        {!isLoading && <span className="font-medium">{getButtonText()}</span>}

        {isConnected && variant === 'connect' && (
          <span className="ml-2 text-success" role="img" aria-label="Connected">
            ✓
          </span>
        )}
      </div>
    </button>
  );
}

interface SocialLoginGroupProps {
  providers: (keyof typeof providerConfigs)[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (provider: string, connection: any) => void;
  onError?: (provider: string, error: Error) => void;
  redirectTo?: string;
  variant?: 'login' | 'connect';
  size?: 'sm' | 'md' | 'lg';
  layout?: 'vertical' | 'horizontal' | 'grid';
  className?: string;
}

export function SocialLoginGroup({
  providers,
  onSuccess,
  onError,
  redirectTo,
  variant = 'login',
  size = 'md',
  layout = 'vertical',
  className = '',
}: SocialLoginGroupProps) {
  const layoutClasses = {
    vertical: 'flex flex-col space-y-3',
    horizontal: 'flex flex-row space-x-3',
    grid: 'grid grid-cols-2 gap-3 sm:grid-cols-3',
  };

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {providers.map(provider => (
        <SocialLoginButton
          key={provider}
          provider={provider}
          onSuccess={connection => onSuccess?.(provider, connection)}
          onError={error => onError?.(provider, error)}
          redirectTo={redirectTo}
          variant={variant}
          size={size}
          fullWidth={layout !== 'horizontal'}
        />
      ))}
    </div>
  );
}

// Commonly used provider groups
export const COMMON_PROVIDERS: (keyof typeof providerConfigs)[] = ['google', 'facebook', 'twitter', 'github'];
export const ALL_PROVIDERS: (keyof typeof providerConfigs)[] = [
  'google',
  'facebook',
  'twitter',
  'github',
  'linkedin',
  'discord',
];

export default SocialLoginButton;
