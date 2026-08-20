'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Bell, Shield, Activity, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  timeZone?: string;
  language: string;
  profileImageUrl?: string;
  bio?: string;
  createdAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
  hasGoogleAccount: boolean;
  hasAppleAccount: boolean;
  notificationPreferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
    weeklyDigest: boolean;
  };
}

interface UserActivityLog {
  id: string;
  activityType: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activityLog, setActivityLog] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [emailChangeData, setEmailChangeData] = useState({
    newEmail: '',
    currentPassword: '',
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    timeZone: '',
    language: 'en',
    profileImageUrl: '',
    bio: '',
  });

  const loadProfile = useCallback(async () => {
    // Wait for auth check to complete before making auth decisions
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    try {
      // Auth is verified above, credentials include cookies

      const response = await fetch('/api/user-profile/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const profileData = await response.json();
      setProfile(profileData);

      // Initialize form with current profile data
      setProfileForm({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        displayName: profileData.displayName || '',
        timeZone: profileData.timeZone || '',
        language: profileData.language || 'en',
        profileImageUrl: profileData.profileImageUrl || '',
        bio: profileData.bio || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, router]);

  const loadActivityLog = useCallback(async () => {
    try {
      const response = await fetch('/api/user-profile/activity-log?take=10', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const activities = await response.json();
        setActivityLog(activities);
      }
    } catch (err) {
      console.error('Failed to load activity log:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- profile state is populated after the async request resolves.
    loadProfile();
    if (activeTab === 'activity') {
      loadActivityLog();
    }
  }, [activeTab, loadProfile, loadActivityLog]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user-profile/me', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationUpdate = async (key: string, value: boolean) => {
    if (!profile?.notificationPreferences) return;

    try {
      const updatedPreferences = {
        ...profile.notificationPreferences,
        [key]: value,
      };

      const response = await fetch('/api/user-profile/notification-preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPreferences),
      });

      if (response.ok) {
        setProfile({
          ...profile,
          notificationPreferences: updatedPreferences,
        });
      }
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/user-profile/change-email', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailChangeData),
      });

      if (response.ok) {
        setSuccess('Email change verification sent. Please check your new email address.');
        setShowChangeEmail(false);
        setEmailChangeData({ newEmail: '', currentPassword: '' });
      } else {
        const error = await response.text();
        setError(error || 'Failed to request email change');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request email change');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE to confirm account deletion.');
      return;
    }

    setDeletingAccount(true);
    setDeleteError(null);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user-profile/me', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        const message = contentType?.includes('application/json')
          ? ((await response.json())?.error?.message ?? 'Failed to delete account')
          : (await response.text()) || 'Failed to delete account';
        throw new Error(message);
      }

      await logout();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load profile. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-8">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>
      </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'account', label: 'Account', icon: Mail },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'activity', label: 'Activity', icon: Activity },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Personal Information</h2>
            <p className="text-muted-foreground">Update your personal details and profile information</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    value={profileForm.firstName}
                    onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    value={profileForm.lastName}
                    onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  value={profileForm.displayName}
                  onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  placeholder="Enter your display name (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeZone">Time Zone</Label>
                  <Input
                    value={profileForm.timeZone}
                    onChange={e => setProfileForm({ ...profileForm, timeZone: e.target.value })}
                    placeholder="e.g., America/New_York"
                  />
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <select
                    value={profileForm.language}
                    onChange={e => setProfileForm({ ...profileForm, language: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="profileImageUrl">Profile Image URL</Label>
                <Input
                  value={profileForm.profileImageUrl}
                  onChange={e => setProfileForm({ ...profileForm, profileImageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg (optional)"
                  type="url"
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  value={profileForm.bio}
                  onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Tell us about yourself (optional)"
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Account Information</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">{profile.email}</span>
                    {profile.emailVerified ? (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline" onClick={() => setShowChangeEmail(!showChangeEmail)}>
                  Change Email
                </Button>
              </div>

              {showChangeEmail && (
                <Card className="p-4 bg-muted/50">
                  <form onSubmit={handleEmailChange} className="space-y-4">
                    <div>
                      <Label htmlFor="newEmail">New Email Address</Label>
                      <Input
                        type="email"
                        value={emailChangeData.newEmail}
                        onChange={e => setEmailChangeData({ ...emailChangeData, newEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        type="password"
                        value={emailChangeData.currentPassword}
                        onChange={e => setEmailChangeData({ ...emailChangeData, currentPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving ? 'Sending...' : 'Send Verification'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowChangeEmail(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              <Separator />

              <div>
                <Label>Account Created</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <Label>Last Login</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never logged in'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-error/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-error" />
                <h2 className="text-xl font-semibold">Delete Account</h2>
              </div>
              <p className="text-muted-foreground">
                Permanently remove your login and profile when the account is not linked to retained billing,
                subscription, social, analytics, or audit records.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {deleteError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="deleteConfirmation">Type DELETE to confirm</Label>
                <Input
                  id="deleteConfirmation"
                  value={deleteConfirmation}
                  onChange={event => {
                    setDeleteConfirmation(event.target.value);
                    setDeleteError(null);
                  }}
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || deletingAccount}
              >
                {deletingAccount ? 'Deleting...' : 'Delete Account'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && profile.notificationPreferences && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Notification Preferences</h2>
            <p className="text-muted-foreground">Choose what notifications you want to receive</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                key: 'emailNotifications',
                label: 'Email Notifications',
                description: 'Receive important account and security notifications via email',
              },
              {
                key: 'pushNotifications',
                label: 'Push Notifications',
                description: 'Receive notifications directly to your browser or device',
              },
              {
                key: 'marketingEmails',
                label: 'Marketing Emails',
                description: 'Receive news about new features and product updates',
              },
              {
                key: 'weeklyDigest',
                label: 'Weekly Digest',
                description: 'Get a weekly summary of your account activity',
              },
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{label}</Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={profile.notificationPreferences![key as keyof typeof profile.notificationPreferences]}
                  onCheckedChange={checked => handleNotificationUpdate(key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Security & Connected Accounts</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Connected Accounts</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground text-sm font-bold">
                      G
                    </div>
                    <div>
                      <p className="font-medium">Google</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.hasGoogleAccount ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {profile.hasGoogleAccount && <Badge variant="default">Connected</Badge>}
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-foreground rounded flex items-center justify-center text-background text-sm font-bold"></div>
                    <div>
                      <p className="font-medium">Apple</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.hasAppleAccount ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {profile.hasAppleAccount && <Badge variant="default">Connected</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <p className="text-muted-foreground">Your recent account activity and security events</p>
          </CardHeader>
          <CardContent>
            {activityLog.length > 0 ? (
              <div className="space-y-3">
                {activityLog.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                    <Activity className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.activityType}</p>
                      {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
