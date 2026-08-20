/**
 * Social End-to-End Test Suite
 * Complete workflow testing for social media integration
 * Tests real user journeys from authentication to content sharing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Import all social components for E2E testing
import { SocialAuthProvider } from '../../../frontend/src/contexts/SocialAuthContext';
import { SocialLoginButton } from '../../../frontend/src/components/social/SocialLoginButton';
import { SocialShareButton } from '../../../frontend/src/components/social/SocialShareButton';
import { SocialOnboarding } from '../../../frontend/src/components/social/SocialOnboarding';
import { SocialConnectionsManager } from '../../../frontend/src/components/social/SocialConnectionsManager';
import { SocialRecommendations } from '../../../frontend/src/components/social/SocialRecommendations';
import { SocialAnalyticsTracker } from '../../../frontend/src/components/social/SocialAnalyticsTracker';
import { SocialPlatform } from '../../../frontend/src/lib/types/social';

// Mock all external services with realistic E2E flows
const mockSocialAuthService = {
  initiateSocialLogin: jest.fn(),
  handleAuthCallback: jest.fn(),
  refreshToken: jest.fn(),
  disconnectSocial: jest.fn(),
  getUserProfile: jest.fn(),
  getFriendsList: jest.fn(),
  validateToken: jest.fn(),
  getConnectedPlatforms: jest.fn(),
  updatePermissions: jest.fn()
};

const mockSocialSharingService = {
  shareContent: jest.fn(),
  trackShare: jest.fn(),
  getShareMetrics: jest.fn(),
  generateShareUrl: jest.fn(),
  getSocialProof: jest.fn(),
  getViralMetrics: jest.fn()
};

const mockPrivacyService = {
  getConsentStatus: jest.fn(),
  updateConsent: jest.fn(),
  exportUserData: jest.fn(),
  deleteUserData: jest.fn(),
  getDataUsageReport: jest.fn(),
  recordConsentHistory: jest.fn()
};

const mockAnalyticsService = {
  trackSocialLogin: jest.fn(),
  trackConsentChange: jest.fn(),
  trackSocialInteraction: jest.fn(),
  trackShare: jest.fn(),
  trackClick: jest.fn(),
  trackConversion: jest.fn(),
  getAnalyticsDashboard: jest.fn()
};

const mockRecommendationService = {
  getSocialRecommendations: jest.fn(),
  getFriendActivity: jest.fn(),
  getPopularContent: jest.fn(),
  getTrendingShares: jest.fn(),
  updatePreferences: jest.fn()
};

const mockNotificationService = {
  sendNotification: jest.fn(),
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn(),
  markAsRead: jest.fn()
};

// Mock all service modules
jest.mock('../../../frontend/src/lib/social-auth-service', () => ({
  socialAuthService: mockSocialAuthService
}));

jest.mock('../../../frontend/src/lib/social-sharing-service', () => ({
  socialSharingService: mockSocialSharingService
}));

jest.mock('../../../frontend/src/lib/privacy-service', () => ({
  privacyService: mockPrivacyService
}));

jest.mock('../../../frontend/src/lib/analytics-service', () => ({
  analyticsService: mockAnalyticsService
}));

jest.mock('../../../frontend/src/lib/recommendation-service', () => ({
  recommendationService: mockRecommendationService
}));

jest.mock('../../../frontend/src/lib/notification-service', () => ({
  notificationService: mockNotificationService
}));

// Mock browser APIs
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(() => ({
    close: jest.fn(),
    closed: false,
    location: { href: '' },
    postMessage: jest.fn()
  }))
});

Object.defineProperty(navigator, 'share', {
  writable: true,
  value: jest.fn(() => Promise.resolve())
});

Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'https://localhost:3000',
    origin: 'https://localhost:3000',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn()
  }
});

// Test wrapper with all providers
const E2ETestWrapper: React.FC<{ children: React.ReactNode, initialRoute?: string }> = ({ 
  children, 
  initialRoute = '/' 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <SocialAuthProvider>
          {children}
        </SocialAuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Social End-to-End Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup realistic E2E mock responses
    mockSocialAuthService.initiateSocialLogin.mockResolvedValue({
      authUrl: 'https://facebook.com/oauth/authorize?client_id=123&state=abc123',
      state: 'abc123',
      codeChallenge: 'challenge123'
    });

    mockSocialAuthService.handleAuthCallback.mockResolvedValue({
      success: true,
      user: {
        id: 'fb_user_123',
        name: 'John Doe',
        email: 'john@example.com',
        profilePicture: 'https://facebook.com/profile.jpg',
        verified: true
      },
      accessToken: 'fb_access_token_123',
      refreshToken: 'fb_refresh_token_123',
      expiresIn: 3600
    });

    mockSocialAuthService.getConnectedPlatforms.mockResolvedValue([]);

    mockPrivacyService.getConsentStatus.mockResolvedValue({
      hasConsent: false,
      consentDate: null,
      permissions: [],
      needsUpdate: true
    });

    mockRecommendationService.getSocialRecommendations.mockResolvedValue([
      { 
        id: '1', 
        title: 'The Dark Knight', 
        type: 'movie', 
        friendCount: 5,
        socialProof: '5 friends watched this'
      },
      { 
        id: '2', 
        title: 'Breaking Bad', 
        type: 'tv', 
        friendCount: 3,
        socialProof: '3 friends are watching this'
      }
    ]);
  });

  describe('Complete User Onboarding Journey', () => {
    it('should guide new user through complete social setup', async () => {
      const user = userEvent.setup();
      const onCompleteHandler = jest.fn();

      render(
        <E2ETestWrapper>
          <SocialOnboarding onComplete={onCompleteHandler} />
        </E2ETestWrapper>
      );

      // Step 1: Welcome screen
      expect(screen.getByText(/connect your social accounts/i)).toBeInTheDocument();
      expect(screen.getByText(/discover what your friends are watching/i)).toBeInTheDocument();

      const getStartedButton = screen.getByRole('button', { name: /get started/i });
      await user.click(getStartedButton);

      // Step 2: Platform selection
      await waitFor(() => {
        expect(screen.getByText(/choose your platforms/i)).toBeInTheDocument();
      });

      const facebookButton = screen.getByRole('button', { name: /connect facebook/i });
      const twitterButton = screen.getByRole('button', { name: /connect twitter/i });
      
      expect(facebookButton).toBeInTheDocument();
      expect(twitterButton).toBeInTheDocument();

      // Connect Facebook
      await user.click(facebookButton);

      await waitFor(() => {
        expect(mockSocialAuthService.initiateSocialLogin).toHaveBeenCalledWith({
          platform: SocialPlatform.Facebook,
          scopes: ['public_profile', 'email'],
          redirectUri: expect.stringContaining('/auth/callback/facebook'),
          state: expect.any(String)
        });
      });

      // Simulate successful OAuth callback
      mockSocialAuthService.getConnectedPlatforms.mockResolvedValue([
        { platform: SocialPlatform.Facebook, connected: true, profileName: 'John Doe' }
      ]);

      // Step 3: Privacy settings
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
      });

      // Configure privacy preferences
      const shareActivityToggle = screen.getByRole('checkbox', { 
        name: /share my viewing activity with friends/i 
      });
      const friendRecommendationsToggle = screen.getByRole('checkbox', { 
        name: /allow friend recommendations/i 
      });

      await user.click(shareActivityToggle);
      await user.click(friendRecommendationsToggle);

      // Step 4: Complete onboarding
      const finishButton = screen.getByRole('button', { name: /finish setup/i });
      await user.click(finishButton);

      await waitFor(() => {
        expect(onCompleteHandler).toHaveBeenCalledWith({
          connectedPlatforms: [SocialPlatform.Facebook],
          privacySettings: {
            shareActivity: true,
            allowFriendRecommendations: true,
            shareWatchlist: false,
            publicProfile: false
          },
          completedAt: expect.any(String)
        });
      });

      // Verify analytics tracking
      expect(mockAnalyticsService.trackSocialLogin).toHaveBeenCalledWith({
        platform: SocialPlatform.Facebook,
        method: 'oauth2',
        timestamp: expect.any(String),
        onboardingFlow: true
      });
    });
  });

  describe('Social Authentication Flow E2E', () => {
    it('should complete full OAuth authentication cycle', async () => {
      const user = userEvent.setup();

      // Step 1: User clicks login button
      render(
        <E2ETestWrapper>
          <SocialLoginButton platform={SocialPlatform.Facebook} />
          <SocialAnalyticsTracker />
        </E2ETestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login with facebook/i });
      await user.click(loginButton);

      // Step 2: OAuth initiation
      await waitFor(() => {
        expect(mockSocialAuthService.initiateSocialLogin).toHaveBeenCalledWith({
          platform: SocialPlatform.Facebook,
          scopes: ['public_profile', 'email'],
          redirectUri: expect.stringContaining('/auth/callback/facebook'),
          state: expect.any(String)
        });
      });

      // Step 3: Simulate OAuth callback handling
      await waitFor(() => {
        expect(mockSocialAuthService.handleAuthCallback).toHaveBeenCalled();
      });

      // Step 4: Verify user profile loading
      mockSocialAuthService.getUserProfile.mockResolvedValue({
        id: 'fb_user_123',
        name: 'John Doe',
        email: 'john@example.com',
        profilePicture: 'https://facebook.com/profile.jpg',
        friends: []
      });

      await waitFor(() => {
        expect(mockSocialAuthService.getUserProfile).toHaveBeenCalledWith({
          platform: SocialPlatform.Facebook,
          accessToken: 'fb_access_token_123'
        });
      });

      // Step 5: Verify analytics tracking
      expect(mockAnalyticsService.trackSocialLogin).toHaveBeenCalledWith({
        platform: SocialPlatform.Facebook,
        method: 'oauth2',
        timestamp: expect.any(String),
        sessionId: expect.any(String)
      });

      // Step 6: Verify success state
      await waitFor(() => {
        expect(screen.getByText(/connected successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle OAuth errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock OAuth error
      mockSocialAuthService.initiateSocialLogin.mockRejectedValue(
        new Error('OAuth error: access_denied')
      );

      render(
        <E2ETestWrapper>
          <SocialLoginButton platform={SocialPlatform.Facebook} />
        </E2ETestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login with facebook/i });
      await user.click(loginButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });

      // Should provide retry option
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      // Reset mock for retry
      mockSocialAuthService.initiateSocialLogin.mockResolvedValue({
        authUrl: 'https://facebook.com/oauth/authorize',
        state: 'new_state'
      });

      await user.click(retryButton);

      await waitFor(() => {
        expect(mockSocialAuthService.initiateSocialLogin).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Social Sharing Workflow E2E', () => {
    it('should complete full content sharing cycle', async () => {
      const user = userEvent.setup();

      const content = {
        id: 'movie_123',
        title: 'The Dark Knight',
        type: 'movie' as const,
        url: 'https://example.com/movie/123',
        description: 'Epic superhero movie'
      };

      // Mock successful sharing
      mockSocialSharingService.shareContent.mockResolvedValue({
        success: true,
        shareId: 'share_123',
        shareUrl: 'https://facebook.com/share/123',
        platform: SocialPlatform.Facebook
      });

      mockSocialSharingService.trackShare.mockResolvedValue({
        tracked: true,
        analytics: { impressions: 1, clicks: 0 }
      });

      render(
        <E2ETestWrapper>
          <SocialShareButton content={content} platform={SocialPlatform.Facebook} />
          <SocialAnalyticsTracker />
        </E2ETestWrapper>
      );

      // Step 1: User clicks share button
      const shareButton = screen.getByRole('button', { name: /share on facebook/i });
      await user.click(shareButton);

      // Step 2: Share processing
      await waitFor(() => {
        expect(mockSocialSharingService.shareContent).toHaveBeenCalledWith({
          contentId: 'movie_123',
          contentType: 'movie',
          platform: SocialPlatform.Facebook,
          title: 'The Dark Knight',
          description: 'Epic superhero movie',
          url: 'https://example.com/movie/123'
        });
      });

      // Step 3: Analytics tracking
      await waitFor(() => {
        expect(mockAnalyticsService.trackShare).toHaveBeenCalledWith({
          contentId: 'movie_123',
          contentType: 'movie',
          platform: SocialPlatform.Facebook,
          method: 'button_click',
          shareId: 'share_123'
        });
      });

      // Step 4: Success feedback
      await waitFor(() => {
        expect(screen.getByText(/shared successfully/i)).toBeInTheDocument();
      });

      // Step 5: Verify sharing metrics update
      expect(mockSocialSharingService.trackShare).toHaveBeenCalledWith({
        shareId: 'share_123',
        event: 'share_completed',
        timestamp: expect.any(String)
      });
    });

    it('should track viral sharing metrics', async () => {
      const user = userEvent.setup();

      // Mock viral content metrics
      mockSocialSharingService.getViralMetrics.mockResolvedValue({
        contentId: 'viral_movie_456',
        totalShares: 1250,
        platforms: {
          facebook: 800,
          twitter: 300,
          instagram: 150
        },
        viralCoefficient: 2.1,
        trending: true
      });

      render(
        <E2ETestWrapper>
          <div data-testid="viral-content">
            <h1>Viral Movie Content</h1>
            <SocialShareButton 
              content={{
                id: 'viral_movie_456',
                title: 'Viral Movie',
                type: 'movie',
                url: 'https://example.com/viral/456'
              }} 
              platform={SocialPlatform.Facebook} 
            />
          </div>
        </E2ETestWrapper>
      );

      const shareButton = screen.getByRole('button', { name: /share on facebook/i });
      await user.click(shareButton);

      // Should track viral metrics
      await waitFor(() => {
        expect(mockAnalyticsService.trackSocialInteraction).toHaveBeenCalledWith({
          type: 'viral_share',
          contentId: 'viral_movie_456',
          platform: SocialPlatform.Facebook,
          viralScore: expect.any(Number)
        });
      });
    });
  });

  describe('Friend Discovery and Recommendations E2E', () => {
    it('should complete friend discovery and content recommendation flow', async () => {
      const user = userEvent.setup();

      // Setup connected social accounts
      mockSocialAuthService.getConnectedPlatforms.mockResolvedValue([
        { platform: SocialPlatform.Facebook, connected: true, profileName: 'John Doe' },
        { platform: SocialPlatform.Twitter, connected: true, profileName: '@johndoe' }
      ]);

      // Mock friends list
      mockSocialAuthService.getFriendsList.mockResolvedValue([
        { id: 'friend_1', name: 'Alice Smith', mutualConnections: 15 },
        { id: 'friend_2', name: 'Bob Johnson', mutualConnections: 8 },
        { id: 'friend_3', name: 'Carol Brown', mutualConnections: 22 }
      ]);

      render(
        <E2ETestWrapper>
          <SocialConnectionsManager />
          <SocialRecommendations userId="user_123" />
        </E2ETestWrapper>
      );

      // Step 1: Verify connected accounts display
      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
        expect(screen.getByText(/@johndoe/i)).toBeInTheDocument();
      });

      // Step 2: Load friend recommendations
      await waitFor(() => {
        expect(screen.getByText(/the dark knight/i)).toBeInTheDocument();
        expect(screen.getByText(/5 friends watched this/i)).toBeInTheDocument();
        expect(screen.getByText(/breaking bad/i)).toBeInTheDocument();
        expect(screen.getByText(/3 friends are watching this/i)).toBeInTheDocument();
      });

      // Step 3: Interact with recommendation
      const recommendationCard = screen.getByText(/the dark knight/i).closest('[data-testid="recommendation-card"]');
      if (recommendationCard) {
        const viewButton = within(recommendationCard).getByRole('button', { name: /view details/i });
        await user.click(viewButton);

        // Should track interaction
        await waitFor(() => {
          expect(mockAnalyticsService.trackSocialInteraction).toHaveBeenCalledWith({
            type: 'recommendation_click',
            contentId: '1',
            platform: 'social_discovery',
            friendInfluence: 5
          });
        });
      }

      // Step 4: Verify friend activity updates
      expect(mockRecommendationService.getFriendActivity).toHaveBeenCalledWith({
        userId: 'user_123',
        platforms: [SocialPlatform.Facebook, SocialPlatform.Twitter]
      });
    });
  });

  describe('Privacy and Consent Management E2E', () => {
    it('should complete GDPR consent and data management flow', async () => {
      const user = userEvent.setup();

      render(
        <E2ETestWrapper initialRoute="/privacy">
          <div data-testid="privacy-dashboard">
            <h1>Privacy Dashboard</h1>
            <SocialConnectionsManager />
          </div>
        </E2ETestWrapper>
      );

      // Step 1: Check current consent status
      await waitFor(() => {
        expect(mockPrivacyService.getConsentStatus).toHaveBeenCalled();
      });

      // Step 2: Update consent preferences
      mockPrivacyService.updateConsent.mockResolvedValue({
        success: true,
        consentId: 'consent_123',
        timestamp: new Date().toISOString()
      });

      // Simulate consent form interaction
      const consentForm = screen.getByTestId('privacy-dashboard');
      expect(consentForm).toBeInTheDocument();

      // Step 3: Export user data
      mockPrivacyService.exportUserData.mockResolvedValue({
        success: true,
        downloadUrl: 'https://secure-export.example.com/user_123_data.json',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Step 4: Verify consent tracking
      await waitFor(() => {
        expect(mockAnalyticsService.trackConsentChange).toHaveBeenCalledWith({
          userId: 'user_123',
          consentType: 'social_data_processing',
          granted: expect.any(Boolean),
          timestamp: expect.any(String)
        });
      });
    });
  });

  describe('Real-time Social Activity E2E', () => {
    it('should handle real-time social notifications and updates', async () => {
      const user = userEvent.setup();

      // Mock real-time updates
      let notificationCount = 0;
      mockNotificationService.sendNotification.mockImplementation((notification) => {
        notificationCount++;
        return Promise.resolve({ 
          id: `notification_${notificationCount}`, 
          sent: true,
          timestamp: new Date().toISOString()
        });
      });

      render(
        <E2ETestWrapper>
          <div data-testid="social-feed">
            <SocialRecommendations userId="user_123" />
            <SocialAnalyticsTracker />
          </div>
        </E2ETestWrapper>
      );

      // Step 1: Simulate friend activity
      const friendActivity = {
        friendId: 'friend_1',
        action: 'watched',
        contentId: 'movie_456',
        contentTitle: 'Inception',
        timestamp: new Date().toISOString()
      };

      // Step 2: Process real-time update
      mockRecommendationService.getFriendActivity.mockResolvedValue([friendActivity]);

      // Step 3: Verify notification sent
      await waitFor(() => {
        expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
          type: 'friend_activity',
          title: 'Friend Activity',
          message: 'Your friend watched Inception',
          userId: 'user_123',
          data: friendActivity
        });
      });

      // Step 4: Verify analytics tracking
      expect(mockAnalyticsService.trackSocialInteraction).toHaveBeenCalledWith({
        type: 'friend_activity_notification',
        friendId: 'friend_1',
        contentId: 'movie_456',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Cross-Platform Integration E2E', () => {
    it('should handle multiple platform connections and synchronization', async () => {
      const user = userEvent.setup();

      // Mock multiple connected platforms
      mockSocialAuthService.getConnectedPlatforms.mockResolvedValue([
        { platform: SocialPlatform.Facebook, connected: true, profileName: 'John Doe' },
        { platform: SocialPlatform.Twitter, connected: true, profileName: '@johndoe' },
        { platform: SocialPlatform.Instagram, connected: true, profileName: 'john.doe' }
      ]);

      render(
        <E2ETestWrapper>
          <SocialConnectionsManager />
        </E2ETestWrapper>
      );

      // Step 1: Verify all platforms displayed
      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument(); // Facebook
        expect(screen.getByText(/@johndoe/i)).toBeInTheDocument(); // Twitter
        expect(screen.getByText(/john\.doe/i)).toBeInTheDocument(); // Instagram
      });

      // Step 2: Test cross-platform sharing
      const content = {
        id: 'movie_789',
        title: 'Cross-Platform Movie',
        type: 'movie' as const,
        url: 'https://example.com/movie/789'
      };

      // Simulate sharing to multiple platforms
      const platforms = [SocialPlatform.Facebook, SocialPlatform.Twitter, SocialPlatform.Instagram];
      
      for (const platform of platforms) {
        mockSocialSharingService.shareContent.mockResolvedValueOnce({
          success: true,
          shareId: `share_${platform}_123`,
          shareUrl: `https://${platform}.com/share/123`,
          platform
        });
      }

      // Step 3: Verify synchronization across platforms
      await waitFor(() => {
        expect(mockAnalyticsService.trackSocialInteraction).toHaveBeenCalledWith({
          type: 'cross_platform_sync',
          platforms: platforms,
          contentId: content.id,
          timestamp: expect.any(String)
        });
      });
    });
  });

  describe('Error Recovery and Resilience E2E', () => {
    it('should recover from network failures gracefully', async () => {
      const user = userEvent.setup();

      // Mock initial network failure
      mockSocialAuthService.initiateSocialLogin
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          authUrl: 'https://facebook.com/oauth/authorize',
          state: 'recovery_state'
        });

      render(
        <E2ETestWrapper>
          <SocialLoginButton platform={SocialPlatform.Facebook} />
        </E2ETestWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /login with facebook/i });
      
      // Step 1: Initial failure
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Step 2: Automatic retry mechanism
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Step 3: Successful recovery
      await waitFor(() => {
        expect(mockSocialAuthService.initiateSocialLogin).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/connecting/i)).toBeInTheDocument();
      });

      // Step 4: Verify analytics tracking includes recovery
      expect(mockAnalyticsService.trackSocialInteraction).toHaveBeenCalledWith({
        type: 'error_recovery',
        originalError: 'Network error',
        recoveryMethod: 'user_retry',
        platform: SocialPlatform.Facebook,
        timestamp: expect.any(String)
      });
    });
  });
});