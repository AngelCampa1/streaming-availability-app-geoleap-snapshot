'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { changePassword, PasswordStrengthResult } from '@/lib/api';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';
import { StreamingServicesManager } from '@/components/StreamingServicesManager';
import { logger } from '@/lib/logger';
import AppLayout from '@/components/layout/AppLayout';

// Skeleton component for settings page to prevent CLS
function SettingsPageSkeleton() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card shadow rounded-lg min-h-[600px]">
          {/* Tab bar skeleton */}
          <div className="border-b border-border">
            <nav className="-mb-px flex">
              <div className="py-4 px-6 w-20 h-8 bg-muted animate-pulse rounded" />
              <div className="py-4 px-6 w-32 h-8 bg-muted animate-pulse rounded ml-2" />
              <div className="py-4 px-6 w-24 h-8 bg-muted animate-pulse rounded ml-2" />
            </nav>
          </div>
          {/* Content skeleton */}
          <div className="p-6 space-y-6">
            <div className="h-10 bg-muted animate-pulse rounded w-1/3" />
            <div className="space-y-4">
              <div className="h-12 bg-muted animate-pulse rounded" />
              <div className="h-12 bg-muted animate-pulse rounded" />
              <div className="h-12 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function SettingsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle redirect for unauthenticated users with minimal CLS
  useEffect(() => {
    // Wait for auth check to complete before making auth decisions
    if (authLoading) return;

    if (!isAuthenticated && !isRedirecting) {
      setIsRedirecting(true);
      router.push('/auth/login?redirect=/settings');
    }
  }, [authLoading, isAuthenticated, router, isRedirecting]);

  // Show skeleton while loading or redirecting
  if (authLoading || isRedirecting || !user) {
    return <SettingsPageSkeleton />;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card shadow rounded-lg">
          <div className="border-b border-border">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('streaming')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'streaming'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Streaming Services
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'security'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Security
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && <ProfileTab user={user} />}
            {activeTab === 'streaming' && <StreamingServicesTab />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

interface UserInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  emailConfirmed?: boolean;
}

function ProfileTab({ user }: { user: UserInfo }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-foreground">Profile Information</h3>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-foreground">First Name</label>
          <input
            type="text"
            value={user.firstName || ''}
            disabled
            className="mt-1 block w-full px-3 py-2 border border-border rounded-lg shadow-sm bg-muted text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">Last Name</label>
          <input
            type="text"
            value={user.lastName || ''}
            disabled
            className="mt-1 block w-full px-3 py-2 border border-border rounded-lg shadow-sm bg-muted text-muted-foreground"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-foreground">Email</label>
          <input
            type="email"
            value={user.email || ''}
            disabled
            className="mt-1 block w-full px-3 py-2 border border-border rounded-lg shadow-sm bg-muted text-muted-foreground"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Email verification status: {user.emailConfirmed ? '✅ Verified' : '⚠️ Not verified'}
          </p>
          {!user.emailConfirmed && (
            <p className="mt-1 text-xs text-warning">
              Note: Email verification is no longer required. All new accounts are auto-verified.
            </p>
          )}
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-primary">
            <p className="font-medium">Profile updates coming soon!</p>
            <p className="mt-1">Profile editing functionality will be available in a future update.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);

  const handlePasswordStrengthChange = (result: PasswordStrengthResult) => {
    setPasswordStrength(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (!passwordStrength?.meetsRequirements) {
      setError('New password does not meet security requirements.');
      return;
    }

    setIsLoading(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccess('Password changed successfully! You have been logged out of other sessions for security.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength(null);
      logger.info('Password changed successfully');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred while changing your password. Please try again.';
      setError(errorMessage);
      logger.error('Password change failed', { error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setPasswordStrength(null);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-foreground">Change Password</h3>

      {success && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-success mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{success}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg">
            <div className="flex">
              <svg className="h-5 w-5 text-error mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground mb-2">
            Current Password
          </label>
          <div className="relative">
            <input
              name="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 pr-10 border border-border rounded-lg shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              name="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 pr-10 border border-border rounded-lg shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              placeholder="Enter your new password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>

          {newPassword && (
            <PasswordStrengthIndicator
              password={newPassword}
              className="mt-3"
              onStrengthChange={handlePasswordStrengthChange}
            />
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 pr-10 border border-border rounded-lg shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          {confirmPassword && newPassword && confirmPassword !== newPassword && (
            <p className="mt-1 text-sm text-error">Passwords do not match</p>
          )}
          {confirmPassword && newPassword && confirmPassword === newPassword && (
            <p className="mt-1 text-sm text-success">Passwords match ✓</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={
              isLoading ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword ||
              !passwordStrength?.meetsRequirements
            }
            className="bg-primary text-primary-foreground py-2 px-4 rounded-full font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Changing Password...
              </div>
            ) : (
              'Change Password'
            )}
          </button>

          <button
            type="button"
            onClick={resetForm}
            disabled={isLoading}
            className="bg-muted text-foreground py-2 px-4 rounded-full font-medium hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            Reset Form
          </button>
        </div>
      </form>

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mt-6">
        <div className="flex">
          <svg className="h-5 w-5 text-warning mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-warning-foreground">
            <p className="font-medium">Security Notice:</p>
            <p className="mt-1">Changing your password will log you out of all other sessions for security.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StreamingServicesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Streaming Services</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the streaming services you subscribe to for personalized search results.
        </p>
      </div>

      <StreamingServicesManager />
    </div>
  );
}
