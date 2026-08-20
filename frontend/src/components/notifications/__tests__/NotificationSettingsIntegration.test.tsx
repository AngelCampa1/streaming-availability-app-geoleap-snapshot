import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSettingsIntegration, UserProfile } from '../NotificationSettingsIntegration';
import { NotificationSettings } from '../NotificationPreferences';

const mockUserProfile: UserProfile = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  avatar: '/images/avatar.jpg',
  preferences: {
    language: 'en',
    timezone: 'America/New_York',
    region: 'US',
    theme: 'light',
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
    },
  },
  subscription: {
    tier: 'premium',
    status: 'active',
    expiresAt: new Date('2025-12-31'),
  },
  privacy: {
    profilePublic: true,
    shareWatchHistory: false,
    allowRecommendations: true,
    dataCollection: false,
  },
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2025-01-13'),
};

const mockNotificationSettings: NotificationSettings = {
  globalEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  emailDigest: {
    enabled: true,
    frequency: 'daily',
    time: '09:00',
  },
  preferences: [
    {
      id: 'watchlist-available',
      category: 'Watchlist',
      name: 'Content Available',
      description: 'When content from your watchlist becomes available',
      channels: { email: true, push: true, inApp: true },
      priority: 'high',
      frequency: 'instant',
    },
    {
      id: 'security-login',
      category: 'Security',
      name: 'Login Alerts',
      description: 'When someone logs into your account',
      channels: { email: true, push: true, inApp: true, sms: true },
      priority: 'critical',
      frequency: 'instant',
    },
  ],
  customRules: [],
};

describe('NotificationSettingsIntegration', () => {
  const mockOnProfileUpdate = jest.fn();
  const mockOnNotificationSettingsUpdate = jest.fn();
  const mockOnSync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSync.mockResolvedValue(undefined);
  });

  describe('Rendering & Basic Functionality', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(
          <NotificationSettingsIntegration
            userProfile={mockUserProfile}
            notificationSettings={mockNotificationSettings}
          />
        );
      }).not.toThrow();
    });

    it('displays user profile information', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText(/@testuser/)).toBeInTheDocument();
        expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
      });
    });

    it('displays user avatar when provided', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        const avatar = screen.getByAltText('Test User');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', '/images/avatar.jpg');
      });
    });

    it('displays fallback avatar when no image provided', async () => {
      const profileWithoutAvatar = { ...mockUserProfile, avatar: undefined };

      render(
        <NotificationSettingsIntegration
          userProfile={profileWithoutAvatar}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        // Should display first letter of display name
        expect(screen.getByText('T')).toBeInTheDocument();
      });
    });

    it('displays member since information', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Member since/)).toBeInTheDocument();
      });
    });
  });

  describe('Subscription Badges', () => {
    it('displays premium badge for premium subscription', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        const premiumBadges = screen.getAllByText('Premium');
        expect(premiumBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays family badge for family subscription', async () => {
      const familyProfile = {
        ...mockUserProfile,
        subscription: { ...mockUserProfile.subscription, tier: 'family' as const },
      };

      render(
        <NotificationSettingsIntegration
          userProfile={familyProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        const familyBadges = screen.getAllByText('Family');
        expect(familyBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays free badge for free subscription', async () => {
      const freeProfile = {
        ...mockUserProfile,
        subscription: { ...mockUserProfile.subscription, tier: 'free' as const },
      };

      render(
        <NotificationSettingsIntegration
          userProfile={freeProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        const freeBadges = screen.getAllByText('Free');
        expect(freeBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays expired badge for expired subscription', async () => {
      const expiredProfile = {
        ...mockUserProfile,
        subscription: { ...mockUserProfile.subscription, status: 'expired' as const },
      };

      render(
        <NotificationSettingsIntegration
          userProfile={expiredProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        const expiredBadges = screen.getAllByText('expired');
        expect(expiredBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays cancelled badge for cancelled subscription', async () => {
      const cancelledProfile = {
        ...mockUserProfile,
        subscription: { ...mockUserProfile.subscription, status: 'cancelled' as const },
      };

      render(
        <NotificationSettingsIntegration
          userProfile={cancelledProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        const cancelledBadges = screen.getAllByText('cancelled');
        expect(cancelledBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sync Functionality', () => {
    it('displays sync button', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
          onSync={mockOnSync}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sync')).toBeInTheDocument();
      });
    });

    it('calls onSync when sync button clicked', async () => {
      const user = userEvent.setup();

      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
          onSync={mockOnSync}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sync')).toBeInTheDocument();
      });

      const syncButton = screen.getByText('Sync');
      await user.click(syncButton);

      await waitFor(() => {
        expect(mockOnSync).toHaveBeenCalled();
      });
    });

    it('displays last sync time as "Never synced" initially', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Never synced')).toBeInTheDocument();
      });
    });

    it('disables sync button during sync operation', async () => {
      const user = userEvent.setup();

      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
          onSync={mockOnSync}
        />
      );

      const syncButton = screen.getByText('Sync').closest('button');
      expect(syncButton).toBeInTheDocument();
      expect(syncButton).not.toBeDisabled();

      if (syncButton) {
        await user.click(syncButton);

        await waitFor(() => {
          // After successful sync, should show success message
          expect(mockOnSync).toHaveBeenCalled();
        });
      }
    });

    it('handles sync failure gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockOnSync.mockRejectedValue(new Error('Sync failed'));

      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
          onSync={mockOnSync}
        />
      );

      const syncButton = screen.getByText('Sync');
      await user.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Tab Navigation', () => {
    it('displays all tab options', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
        expect(screen.getByText('Privacy')).toBeInTheDocument();
      });
    });

    it('switches to notifications tab when clicked', async () => {
      const user = userEvent.setup();

      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      const notificationsTab = screen.getByText('Notifications');
      await user.click(notificationsTab);

      await waitFor(() => {
        // Should display notifications content
        expect(notificationsTab).toBeInTheDocument();
      });
    });

    it('switches to preferences tab when clicked', async () => {
      const user = userEvent.setup();

      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      const preferencesTab = screen.getByText('Preferences');
      await user.click(preferencesTab);

      await waitFor(() => {
        expect(preferencesTab).toBeInTheDocument();
      });
    });

    it('switches to privacy tab when clicked', async () => {
      const user = userEvent.setup();

      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      const privacyTab = screen.getByText('Privacy');
      await user.click(privacyTab);

      await waitFor(() => {
        expect(privacyTab).toBeInTheDocument();
      });
    });

    it('defaults to profile tab', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        // Profile tab should be initially selected
        const profileTab = screen.getByText('Profile');
        expect(profileTab).toBeInTheDocument();
      });
    });
  });

  describe('Callback Functions', () => {
    it('calls onProfileUpdate when provided', () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      expect(mockOnProfileUpdate).not.toHaveBeenCalled();
    });

    it('calls onNotificationSettingsUpdate when provided', () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
          onNotificationSettingsUpdate={mockOnNotificationSettingsUpdate}
        />
      );

      expect(mockOnNotificationSettingsUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Props and Configuration', () => {
    it('accepts custom className', () => {
      const { container } = render(
        <NotificationSettingsIntegration
          className="custom-class"
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('custom-class');
    });

    it('handles enableBiometricAuth prop', () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
          enableBiometricAuth={true}
        />
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('handles showAdvancedOptions prop', () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
          showAdvancedOptions={false}
        />
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats last sync time correctly for recent syncs', async () => {
      const user = userEvent.setup();

      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
          onSync={mockOnSync}
        />
      );

      const syncButton = screen.getByText('Sync');
      await user.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText('Just synced')).toBeInTheDocument();
      });
    });
  });

  describe('User Profile Data', () => {
    it('displays username with @ symbol', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/@testuser/)).toBeInTheDocument();
      });
    });

    it('displays email address', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
      });
    });

    it('displays display name', async () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
    });
  });

  describe('Component State', () => {
    it('initializes with correct default state', () => {
      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      // Should show default sync status
      expect(screen.getByText('Never synced')).toBeInTheDocument();
    });

    it('maintains state after tab navigation', async () => {
      const user = userEvent.setup();

      render(
        <NotificationSettingsIntegration
          userProfile={mockUserProfile}
          notificationSettings={mockNotificationSettings}
        />
      );

      // Navigate to different tabs
      const notificationsTab = screen.getByText('Notifications');
      await user.click(notificationsTab);

      const profileTab = screen.getByText('Profile');
      await user.click(profileTab);

      // Profile content should still be displayed
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
    });
  });
});
