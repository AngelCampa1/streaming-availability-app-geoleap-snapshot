'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationPreferences } from './NotificationPreferences';
import { ContentPreferences } from './ContentPreferences';
import { SecurityPreferences } from './SecurityPreferences';
import { RegionPreferences } from './RegionPreferences';
import { preferences as preferencesApi } from '@/lib/api';
import { debounce } from 'lodash';

interface UserPreferences {
  id?: string;
  userId: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  preferredGenre?: string;
  contentLanguage?: string;
  adultContent?: boolean;
  subtitlesEnabled?: boolean;
  videoQuality?: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
  primaryRegion?: string;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UserPreferencesManagerProps {
  userId: string;
  autoSave?: boolean;
}

export const UserPreferencesManager: React.FC<UserPreferencesManagerProps> = ({ userId, autoSave = false }) => {
  const queryClient = useQueryClient();
  const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user preferences
  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['userPreferences', userId],
    queryFn: () => preferencesApi.getUserPreferences(userId),
    enabled: !!userId,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (prefs: Partial<UserPreferences>) => preferencesApi.updateUserPreferences(userId, prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences', userId] });
      setHasChanges(false);
      setIsSaving(false);
    },
    onError: error => {
      console.error('Failed to update preferences:', error);
      setIsSaving(false);
    },
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: () => preferencesApi.exportUserData(userId),
    onSuccess: data => {
      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${userId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  // Delete data mutation
  const deleteDataMutation = useMutation({
    mutationFn: () => preferencesApi.deleteUserData(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences', userId] });
      if (typeof window !== 'undefined') {
        alert('User data has been successfully deleted.');
      }
    },
  });

  // Initialize local preferences when data loads
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  // Debounced auto-save function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedAutoSave = useCallback(
    debounce((prefs: UserPreferences) => {
      setIsSaving(true);
      updatePreferencesMutation.mutate(prefs);
    }, 500), // Reduced from 1000ms for better UX
    [] // Empty deps - mutation is always stable
  );

  // Handle preference changes
  const handlePreferenceChange = useCallback(
    (changes: Partial<UserPreferences>) => {
      setLocalPreferences(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...changes };
        setHasChanges(true);

        // Auto-save if enabled
        if (autoSave) {
          debouncedAutoSave(updated);
        }

        return updated;
      });
    },
    [autoSave, debouncedAutoSave]
  );

  // Handle manual save
  const handleSave = () => {
    if (localPreferences) {
      setIsSaving(true);
      updatePreferencesMutation.mutate(localPreferences);
    }
  };

  // Handle reset
  const handleReset = () => {
    if (preferences) {
      setLocalPreferences(preferences);
      setHasChanges(false);
    }
  };

  // Handle export
  const handleExport = () => {
    exportDataMutation.mutate();
  };

  // Handle delete
  const handleDelete = () => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete all your user data? This action cannot be undone.'
    );
    if (confirmed) {
      deleteDataMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8" role="status">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true"></div>
        <span className="ml-3 text-muted-foreground" aria-live="polite" aria-busy="true">
          Loading preferences...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded"
        role="alert"
        aria-live="assertive"
      >
        Error loading preferences. Please try again later.
      </div>
    );
  }

  if (!localPreferences) {
    return <div className="text-center text-muted-foreground p-8">No preferences found.</div>;
  }

  return (
    <main
      data-testid="preferences-container"
      className="max-w-4xl mx-auto p-6 space-y-8"
      role="main"
      aria-labelledby="preferences-title"
    >
      <div className="bg-card shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-border">
          <h1 id="preferences-title" className="text-2xl font-bold text-foreground">
            User Preferences
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account preferences and settings</p>
        </div>

        <div className="p-6 space-y-8">
          {/* Notification Preferences */}
          <section aria-labelledby="notification-preferences-heading">
            <h2 id="notification-preferences-heading" className="text-lg font-semibold text-foreground mb-4">
              Notification Preferences
            </h2>
            <NotificationPreferences
              preferences={{
                emailNotifications: localPreferences.emailNotifications,
                pushNotifications: localPreferences.pushNotifications,
              }}
              onUpdate={(key: string, value: any) => handlePreferenceChange({ [key]: value })}
            />
          </section>

          {/* Content Preferences */}
          <section aria-labelledby="content-preferences-heading">
            <h2 id="content-preferences-heading" className="text-lg font-semibold text-foreground mb-4">
              Content Preferences
            </h2>
            <ContentPreferences
              preferences={{
                preferredGenre: localPreferences.preferredGenre,
                contentLanguage: localPreferences.contentLanguage,
                adultContent: localPreferences.adultContent,
                subtitlesEnabled: localPreferences.subtitlesEnabled,
                videoQuality: localPreferences.videoQuality,
              }}
              onUpdate={(key: string, value: any) => handlePreferenceChange({ [key]: value })}
            />
          </section>

          {/* Security Preferences */}
          <section aria-labelledby="security-preferences-heading">
            <h2 id="security-preferences-heading" className="text-lg font-semibold text-foreground mb-4">
              Security Preferences
            </h2>
            <SecurityPreferences
              preferences={{
                twoFactorEnabled: localPreferences.twoFactorEnabled,
              }}
              onUpdate={(key: string, value: any) => handlePreferenceChange({ [key]: value })}
            />
          </section>

          {/* Region Preferences */}
          <section aria-labelledby="region-preferences-heading">
            <h2 id="region-preferences-heading" className="text-lg font-semibold text-foreground mb-4">
              Region Preferences
            </h2>
            <RegionPreferences
              preferences={{
                primaryRegion: localPreferences.primaryRegion,
              }}
              onUpdate={(key: string, value: any) => handlePreferenceChange({ [key]: value })}
            />
          </section>
        </div>

        {/* Status Region for Updates */}
        {(updatePreferencesMutation.isError || exportDataMutation.isError || deleteDataMutation.isError) && (
          <div
            role="alert"
            aria-live="assertive"
            className="mx-6 mb-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded"
          >
            {updatePreferencesMutation.error?.message ||
              exportDataMutation.error?.message ||
              deleteDataMutation.error?.message ||
              'An error occurred. Please try again.'}
          </div>
        )}

        {/* Success Status */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {updatePreferencesMutation.isSuccess && 'Preferences updated successfully'}
          {exportDataMutation.isSuccess && 'Data exported successfully'}
          {deleteDataMutation.isSuccess && 'Data deleted successfully'}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-muted/50 border-t border-border flex justify-between items-center">
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              disabled={exportDataMutation.isPending}
              aria-describedby="export-description"
              className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportDataMutation.isPending ? 'Exporting...' : 'Export Data'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteDataMutation.isPending}
              aria-describedby="delete-description"
              className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive border border-transparent rounded-md hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteDataMutation.isPending ? 'Deleting...' : 'Delete Data'}
            </button>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
              aria-describedby="reset-description"
              className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            {!autoSave && (
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                aria-describedby="save-description"
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden descriptions for buttons */}
      <div className="sr-only">
        <span id="export-description">Download your preferences data as a JSON file</span>
        <span id="delete-description">Permanently delete all your user data. This action cannot be undone.</span>
        <span id="reset-description">Reset all changes to original values</span>
        <span id="save-description">Save all pending changes to your preferences</span>
      </div>
    </main>
  );
};
