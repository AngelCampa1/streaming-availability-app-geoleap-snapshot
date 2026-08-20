'use client';

import React from 'react';

interface SecurityPreferences {
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
  passwordExpiry?: number;
  loginNotifications?: boolean;
  deviceTracking?: boolean;
}

interface SecurityPreferencesProps {
  preferences: SecurityPreferences;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (key: string, value: any) => void;
  disabled?: boolean;
}

export const SecurityPreferences: React.FC<SecurityPreferencesProps> = ({
  preferences,
  onUpdate,
  disabled = false,
}) => {
  const timeoutOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
    { value: 1440, label: '24 hours' },
  ];

  const passwordExpiryOptions = [
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
    { value: 180, label: '6 months' },
    { value: 365, label: '1 year' },
    { value: 0, label: 'Never' },
  ];

  return (
    <div data-testid="security-preferences" className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Security Preferences</h3>

        <div className="space-y-4">
          {/* Two-Factor Authentication */}
          <div className="flex items-center">
            <input
              id="two-factor"
              data-testid="two-factor"
              type="checkbox"
              checked={preferences.twoFactorEnabled || false}
              onChange={e => onUpdate('twoFactorEnabled', e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-primary focus:ring-2 focus:ring-ring border-input rounded disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="two-factor" className="ml-2 block text-sm text-foreground">
              Enable Two-Factor Authentication
            </label>
          </div>

          {/* Login Notifications */}
          <div className="flex items-center">
            <input
              id="login-notifications"
              data-testid="login-notifications"
              type="checkbox"
              checked={preferences.loginNotifications || false}
              onChange={e => onUpdate('loginNotifications', e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-primary focus:ring-2 focus:ring-ring border-input rounded disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="login-notifications" className="ml-2 block text-sm text-foreground">
              Notify me of new login attempts
            </label>
          </div>

          {/* Device Tracking */}
          <div className="flex items-center">
            <input
              id="device-tracking"
              data-testid="device-tracking"
              type="checkbox"
              checked={preferences.deviceTracking || false}
              onChange={e => onUpdate('deviceTracking', e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-primary focus:ring-2 focus:ring-ring border-input rounded disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="device-tracking" className="ml-2 block text-sm text-foreground">
              Track device usage for security
            </label>
          </div>

          {/* Session Timeout */}
          <div>
            <label htmlFor="session-timeout" className="block text-sm font-medium text-foreground mb-2">
              Session Timeout
            </label>
            <select
              id="session-timeout"
              data-testid="session-timeout"
              value={preferences.sessionTimeout || 60}
              onChange={e => onUpdate('sessionTimeout', Number(e.target.value))}
              disabled={disabled}
              className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {timeoutOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Automatically log out after period of inactivity</p>
          </div>

          {/* Password Expiry */}
          <div>
            <label htmlFor="password-expiry" className="block text-sm font-medium text-foreground mb-2">
              Password Expiry
            </label>
            <select
              id="password-expiry"
              data-testid="password-expiry"
              value={preferences.passwordExpiry || 90}
              onChange={e => onUpdate('passwordExpiry', Number(e.target.value))}
              disabled={disabled}
              className="block w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordExpiryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Require password change after specified period</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export type { SecurityPreferences as SecurityPreferencesType };
