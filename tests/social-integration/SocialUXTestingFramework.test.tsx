/**
 * Social Media Integration User Experience Testing Framework
 * Tests user journeys, accessibility, mobile responsiveness, and engagement flows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { jest } from '@jest/globals';
import { SocialIntegrationWizard } from '../../frontend/src/components/social/SocialIntegrationWizard';
import { FriendDiscoveryInterface } from '../../frontend/src/components/social/FriendDiscoveryInterface';
import { SocialRecommendationsFeed } from '../../frontend/src/components/social/SocialRecommendationsFeed';
import { SocialActivityFeed } from '../../frontend/src/components/social/SocialActivityFeed';
import { PrivacyControlsPanel } from '../../frontend/src/components/social/PrivacyControlsPanel';
import { SocialPlatform } from '../../frontend/src/lib/types/social';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock services and dependencies
const mockSocialService = {
  connectPlatform: jest.fn(),
  disconnectPlatform: jest.fn(),
  getFriends: jest.fn(),
  getRecommendations: jest.fn(),
  getActivityFeed: jest.fn(),
  updatePrivacySettings: jest.fn()
};

const mockAnalyticsService = {
  trackUserFlow: jest.fn(),
  trackEngagement: jest.fn(),
  trackError: jest.fn(),
  trackConversion: jest.fn()
};

const mockToastService = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn()
};

jest.mock('../../frontend/src/lib/social-service', () => ({
  socialService: mockSocialService
}));

jest.mock('../../frontend/src/lib/analytics-service', () => ({
  analyticsService: mockAnalyticsService
}));

jest.mock('../../frontend/src/lib/toast-service', () => ({
  toastService: mockToastService
}));

// Mock viewport for mobile testing
const mockViewport = {
  width: 1024,
  height: 768,
  setSize: jest.fn((width: number, height: number) => {
    mockViewport.width = width;
    mockViewport.height = height;
  })
};

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: mockViewport.width
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: mockViewport.height
});

// Mock IntersectionObserver for infinite scroll testing
class MockIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  
  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    this.callback(entries as IntersectionObserverEntry[], this as any);
  }
}

global.IntersectionObserver = MockIntersectionObserver as any;

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode; initialProps?: any }> = ({ 
  children, 
  initialProps = {} 
}) => (
  <div data-testid="test-wrapper" {...initialProps}>
    {children}
  </div>
);

describe('Social Integration User Experience Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockViewport.setSize(1024, 768); // Reset to desktop
  });

  describe('Social Platform Connection Wizard', () => {
    it('should guide users through the complete social connection process', async () => {
      const user = userEvent.setup();
      mockSocialService.connectPlatform.mockResolvedValue({
        success: true,
        platform: SocialPlatform.Facebook,
        friendsCount: 156,
        profileData: {
          name: 'John Doe',
          profilePicture: 'https://example.com/profile.jpg'
        }
      });

      render(
        <TestWrapper>
          <SocialIntegrationWizard />
        </TestWrapper>
      );

      // Step 1: Platform selection
      expect(screen.getByText(/connect your social accounts/i)).toBeInTheDocument();
      expect(screen.getByText(/discover what your friends are watching/i)).toBeInTheDocument();
      
      const facebookButton = screen.getByRole('button', { name: /connect facebook/i });
      await user.click(facebookButton);

      // Step 2: Privacy consent
      await waitFor(() => {
        expect(screen.getByText(/privacy and permissions/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/we'll only access/i)).toBeInTheDocument();
      expect(screen.getByText(/your basic profile/i)).toBeInTheDocument();
      expect(screen.getByText(/your friends list/i)).toBeInTheDocument();
      
      const acceptButton = screen.getByRole('button', { name: /accept and continue/i });
      await user.click(acceptButton);

      // Step 3: Connection success
      await waitFor(() => {
        expect(screen.getByText(/successfully connected/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/156 friends found/i)).toBeInTheDocument();
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      
      // Track completion
      expect(mockAnalyticsService.trackUserFlow).toHaveBeenCalledWith({
        flow: 'social_integration_wizard',
        step: 'completed',
        platform: SocialPlatform.Facebook,
        success: true
      });
    });

    it('should handle connection errors gracefully', async () => {
      const user = userEvent.setup();
      mockSocialService.connectPlatform.mockRejectedValue(new Error('OAuth authorization failed'));

      render(
        <TestWrapper>
          <SocialIntegrationWizard />
        </TestWrapper>
      );

      const twitterButton = screen.getByRole('button', { name: /connect twitter/i });
      await user.click(twitterButton);

      const acceptButton = screen.getByRole('button', { name: /accept and continue/i });
      await user.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/please try again/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      
      expect(mockAnalyticsService.trackError).toHaveBeenCalledWith({
        error: 'social_connection_failed',
        platform: SocialPlatform.Twitter,
        step: 'oauth_authorization'
      });
    });

    it('should be accessible to screen reader users', async () => {
      render(
        <TestWrapper>
          <SocialIntegrationWizard />
        </TestWrapper>
      );

      const results = await axe(screen.getByTestId('test-wrapper'));
      expect(results).toHaveNoViolations();

      // Check ARIA labels and roles
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', expect.stringContaining('Social integration'));
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      const platformButtons = screen.getAllByRole('button', { name: /connect/i });
      platformButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-describedby');
      });
    });
  });

  describe('Friend Discovery Interface', () => {
    const mockFriends = [
      {
        id: 'friend_1',
        name: 'Alice Johnson',
        platform: SocialPlatform.Facebook,
        profilePicture: 'https://example.com/alice.jpg',
        mutualFriends: 12,
        recentActivity: 'Watched "The Crown" on Netflix',
        isConnected: false
      },
      {
        id: 'friend_2',
        name: 'Bob Smith',
        platform: SocialPlatform.Twitter,
        profilePicture: 'https://example.com/bob.jpg',
        mutualFriends: 8,
        recentActivity: 'Liked "Stranger Things" on Instagram',
        isConnected: true
      }
    ];

    it('should display friends in an engaging, scannable format', async () => {
      mockSocialService.getFriends.mockResolvedValue({
        friends: mockFriends,
        totalCount: 156,
        page: 1,
        hasMore: true
      });

      render(
        <TestWrapper>
          <FriendDiscoveryInterface />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });
      
      // Check friend cards display essential info
      const aliceCard = screen.getByTestId('friend-card-friend_1');
      expect(within(aliceCard).getByText('Alice Johnson')).toBeInTheDocument();
      expect(within(aliceCard).getByText('12 mutual friends')).toBeInTheDocument();
      expect(within(aliceCard).getByText(/watched "the crown"/i)).toBeInTheDocument();
      expect(within(aliceCard).getByRole('button', { name: /connect/i })).toBeInTheDocument();
      
      // Check connected friend state
      const bobCard = screen.getByTestId('friend-card-friend_2');
      expect(within(bobCard).getByText('✓ Connected')).toBeInTheDocument();
      expect(within(bobCard).queryByRole('button', { name: /connect/i })).not.toBeInTheDocument();
    });

    it('should handle friend connection with optimistic updates', async () => {
      const user = userEvent.setup();
      mockSocialService.getFriends.mockResolvedValue({
        friends: [mockFriends[0]], // Only Alice (not connected)
        totalCount: 1,
        hasMore: false
      });
      
      mockSocialService.connectPlatform.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <FriendDiscoveryInterface />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const connectButton = screen.getByRole('button', { name: /connect with alice/i });
      await user.click(connectButton);

      // Should show connecting state immediately
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(connectButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('✓ Connected')).toBeInTheDocument();
      });
      
      expect(mockAnalyticsService.trackEngagement).toHaveBeenCalledWith({
        action: 'friend_connected',
        friendId: 'friend_1',
        platform: SocialPlatform.Facebook
      });
    });

    it('should implement infinite scroll for large friend lists', async () => {
      const user = userEvent.setup();
      let page = 1;
      
      mockSocialService.getFriends.mockImplementation(({ page: requestPage }) => {
        const startIndex = (requestPage - 1) * 10;
        const friends = Array.from({ length: 10 }, (_, i) => ({
          id: `friend_${startIndex + i + 1}`,
          name: `Friend ${startIndex + i + 1}`,
          platform: SocialPlatform.Facebook,
          isConnected: false
        }));
        
        return Promise.resolve({
          friends,
          totalCount: 100,
          page: requestPage,
          hasMore: requestPage < 10
        });
      });

      render(
        <TestWrapper>
          <FriendDiscoveryInterface />
        </TestWrapper>
      );

      // Initial load
      await waitFor(() => {
        expect(screen.getByText('Friend 1')).toBeInTheDocument();
        expect(screen.getByText('Friend 10')).toBeInTheDocument();
      });

      // Simulate scroll to bottom (trigger intersection observer)
      const observer = (global.IntersectionObserver as any).mock.instances[0];
      observer.trigger([{ isIntersecting: true }]);

      // Should load more friends
      await waitFor(() => {
        expect(screen.getByText('Friend 20')).toBeInTheDocument();
      });
      
      expect(mockSocialService.getFriends).toHaveBeenCalledTimes(2);
    });
  });

  describe('Social Recommendations Feed', () => {
    const mockRecommendations = [
      {
        id: 'rec_1',
        contentId: 'movie_123',
        title: 'The Social Dilemma',
        type: 'movie',
        posterUrl: 'https://example.com/poster1.jpg',
        socialProof: {
          friendsWatched: 8,
          friendsLiked: 6,
          networkPopularity: 0.75
        },
        recommendationScore: 0.89,
        platforms: ['Netflix', 'Hulu']
      },
      {
        id: 'rec_2',
        contentId: 'tv_456',
        title: 'Stranger Things',
        type: 'tv_show',
        posterUrl: 'https://example.com/poster2.jpg',
        socialProof: {
          friendsWatched: 15,
          friendsLiked: 12,
          networkPopularity: 0.91
        },
        recommendationScore: 0.94,
        platforms: ['Netflix']
      }
    ];

    it('should display social recommendations with clear social proof', async () => {
      mockSocialService.getRecommendations.mockResolvedValue({
        recommendations: mockRecommendations,
        totalCount: 50,
        hasMore: true
      });

      render(
        <TestWrapper>
          <SocialRecommendationsFeed />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('The Social Dilemma')).toBeInTheDocument();
      });

      // Check social proof display
      const recommendation1 = screen.getByTestId('recommendation-rec_1');
      expect(within(recommendation1).getByText('8 friends watched')).toBeInTheDocument();
      expect(within(recommendation1).getByText('6 friends liked')).toBeInTheDocument();
      expect(within(recommendation1).getByText(/75% network popularity/i)).toBeInTheDocument();
      
      // Check available platforms
      expect(within(recommendation1).getByText('Netflix')).toBeInTheDocument();
      expect(within(recommendation1).getByText('Hulu')).toBeInTheDocument();
      
      // Check recommendation scoring indicators
      expect(within(recommendation1).getByTestId('recommendation-score')).toHaveAttribute(
        'data-score',
        '0.89'
      );
    });

    it('should handle recommendation interactions and track engagement', async () => {
      const user = userEvent.setup();
      mockSocialService.getRecommendations.mockResolvedValue({
        recommendations: [mockRecommendations[0]],
        totalCount: 1,
        hasMore: false
      });

      render(
        <TestWrapper>
          <SocialRecommendationsFeed />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('The Social Dilemma')).toBeInTheDocument();
      });

      // Test different interaction types
      const likeButton = screen.getByRole('button', { name: /like/i });
      const shareButton = screen.getByRole('button', { name: /share/i });
      const watchLaterButton = screen.getByRole('button', { name: /add to watchlist/i });
      
      await user.click(likeButton);
      expect(mockAnalyticsService.trackEngagement).toHaveBeenCalledWith({
        action: 'recommendation_liked',
        contentId: 'movie_123',
        recommendationId: 'rec_1',
        socialScore: 0.89
      });
      
      await user.click(shareButton);
      expect(mockAnalyticsService.trackEngagement).toHaveBeenCalledWith({
        action: 'recommendation_shared',
        contentId: 'movie_123',
        recommendationId: 'rec_1'
      });
      
      await user.click(watchLaterButton);
      expect(mockAnalyticsService.trackEngagement).toHaveBeenCalledWith({
        action: 'recommendation_saved',
        contentId: 'movie_123',
        recommendationId: 'rec_1'
      });
    });

    it('should adapt layout for mobile devices', async () => {
      // Set mobile viewport
      mockViewport.setSize(375, 667);
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));

      mockSocialService.getRecommendations.mockResolvedValue({
        recommendations: mockRecommendations,
        totalCount: 2,
        hasMore: false
      });

      render(
        <TestWrapper>
          <SocialRecommendationsFeed />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('The Social Dilemma')).toBeInTheDocument();
      });

      // Check mobile-optimized layout
      const container = screen.getByTestId('recommendations-container');
      expect(container).toHaveClass('mobile-layout');
      
      // Social proof should be condensed on mobile
      expect(screen.getByText('8 friends ❤️')).toBeInTheDocument(); // Condensed format
      
      // Action buttons should be swipe-friendly
      const actionButtons = screen.getAllByRole('button');
      actionButtons.forEach(button => {
        expect(button).toHaveStyle({ minHeight: '44px' }); // iOS touch target size
      });
    });
  });

  describe('Social Activity Feed', () => {
    const mockActivities = [
      {
        id: 'activity_1',
        type: 'friend_watched',
        friend: {
          name: 'Sarah Wilson',
          profilePicture: 'https://example.com/sarah.jpg'
        },
        content: {
          title: 'Breaking Bad',
          type: 'tv_show',
          posterUrl: 'https://example.com/bb.jpg'
        },
        platform: SocialPlatform.Facebook,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        metadata: { rating: 5, episode: 'S1E1' }
      },
      {
        id: 'activity_2',
        type: 'friend_shared',
        friend: {
          name: 'Mike Chen',
          profilePicture: 'https://example.com/mike.jpg'
        },
        content: {
          title: 'The Office',
          type: 'tv_show',
          posterUrl: 'https://example.com/office.jpg'
        },
        platform: SocialPlatform.Twitter,
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        metadata: { comment: 'Best comedy ever!' }
      }
    ];

    it('should display activity feed in chronological order with engaging content', async () => {
      mockSocialService.getActivityFeed.mockResolvedValue({
        activities: mockActivities,
        totalCount: 25,
        hasMore: true
      });

      render(
        <TestWrapper>
          <SocialActivityFeed />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/sarah wilson/i)).toBeInTheDocument();
      });

      // Check activity formatting
      const activity1 = screen.getByTestId('activity-activity_1');
      expect(within(activity1).getByText(/sarah wilson watched/i)).toBeInTheDocument();
      expect(within(activity1).getByText('Breaking Bad')).toBeInTheDocument();
      expect(within(activity1).getByText('2 hours ago')).toBeInTheDocument();
      expect(within(activity1).getByText('⭐ 5/5')).toBeInTheDocument();
      
      const activity2 = screen.getByTestId('activity-activity_2');
      expect(within(activity2).getByText(/mike chen shared/i)).toBeInTheDocument();
      expect(within(activity2).getByText('The Office')).toBeInTheDocument();
      expect(within(activity2).getByText('6 hours ago')).toBeInTheDocument();
      expect(within(activity2).getByText('"Best comedy ever!"')).toBeInTheDocument();
    });

    it('should allow users to interact with friend activities', async () => {
      const user = userEvent.setup();
      mockSocialService.getActivityFeed.mockResolvedValue({
        activities: [mockActivities[0]],
        totalCount: 1,
        hasMore: false
      });

      render(
        <TestWrapper>
          <SocialActivityFeed />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      });

      // Test interaction buttons
      const likeButton = screen.getByRole('button', { name: /like this activity/i });
      const commentButton = screen.getByRole('button', { name: /comment/i });
      const watchButton = screen.getByRole('button', { name: /watch breaking bad/i });
      
      await user.click(likeButton);
      expect(mockAnalyticsService.trackEngagement).toHaveBeenCalledWith({
        action: 'activity_liked',
        activityId: 'activity_1',
        contentId: 'breaking_bad',
        friendName: 'Sarah Wilson'
      });
      
      await user.click(watchButton);
      expect(mockAnalyticsService.trackConversion).toHaveBeenCalledWith({
        action: 'content_clicked_from_activity',
        contentId: 'breaking_bad',
        source: 'friend_activity',
        friendName: 'Sarah Wilson'
      });
    });

    it('should group similar activities to reduce feed clutter', async () => {
      const groupedActivities = [
        {
          id: 'group_1',
          type: 'multiple_friends_watched',
          friends: ['Alice', 'Bob', 'Charlie'],
          content: {
            title: 'Squid Game',
            type: 'tv_show'
          },
          count: 3,
          latestTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        }
      ];

      mockSocialService.getActivityFeed.mockResolvedValue({
        activities: groupedActivities,
        totalCount: 1,
        hasMore: false
      });

      render(
        <TestWrapper>
          <SocialActivityFeed groupSimilar={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/3 friends watched/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Squid Game')).toBeInTheDocument();
      expect(screen.getByText(/alice, bob, and charlie/i)).toBeInTheDocument();
      
      // Should have expand option for grouped activities
      const expandButton = screen.getByRole('button', { name: /see all/i });
      expect(expandButton).toBeInTheDocument();
    });
  });

  describe('Privacy Controls Panel', () => {
    const mockPrivacySettings = {
      platforms: {
        facebook: {
          connected: true,
          permissions: {
            profile: true,
            friends: true,
            activity: false
          },
          dataRetention: '2_years',
          shareActivity: false
        },
        twitter: {
          connected: true,
          permissions: {
            profile: true,
            following: true,
            tweets: true
          },
          dataRetention: '1_year',
          shareActivity: true
        }
      },
      globalSettings: {
        allowRecommendations: true,
        allowFriendDiscovery: true,
        publicProfile: false
      }
    };

    it('should display comprehensive privacy controls with clear explanations', async () => {
      mockSocialService.getPrivacySettings = jest.fn().mockResolvedValue(mockPrivacySettings);
      
      render(
        <TestWrapper>
          <PrivacyControlsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
      });

      // Check platform-specific controls
      expect(screen.getByText('Facebook')).toBeInTheDocument();
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      
      // Check permission toggles
      const profileToggle = screen.getByLabelText(/access profile information/i);
      const friendsToggle = screen.getByLabelText(/access friends list/i);
      const activityToggle = screen.getByLabelText(/track activity/i);
      
      expect(profileToggle).toBeChecked();
      expect(friendsToggle).toBeChecked();
      expect(activityToggle).not.toBeChecked();
      
      // Check explanatory text
      expect(screen.getByText(/used to personalize recommendations/i)).toBeInTheDocument();
      expect(screen.getByText(/help you discover what friends are watching/i)).toBeInTheDocument();
      expect(screen.getByText(/improve content suggestions/i)).toBeInTheDocument();
    });

    it('should allow granular permission management with immediate feedback', async () => {
      const user = userEvent.setup();
      mockSocialService.getPrivacySettings = jest.fn().mockResolvedValue(mockPrivacySettings);
      mockSocialService.updatePrivacySettings.mockResolvedValue({ success: true });
      
      render(
        <TestWrapper>
          <PrivacyControlsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
      });

      // Toggle a permission
      const activityToggle = screen.getByLabelText(/track activity/i);
      await user.click(activityToggle);

      // Should show immediate feedback
      expect(screen.getByText(/settings updated/i)).toBeInTheDocument();
      expect(activityToggle).toBeChecked();
      
      expect(mockSocialService.updatePrivacySettings).toHaveBeenCalledWith({
        platform: 'facebook',
        permission: 'activity',
        enabled: true
      });
      
      // Should show impact explanation
      expect(screen.getByText(/this will improve your recommendations/i)).toBeInTheDocument();
    });

    it('should provide data export and deletion options', async () => {
      const user = userEvent.setup();
      mockSocialService.getPrivacySettings = jest.fn().mockResolvedValue(mockPrivacySettings);
      
      render(
        <TestWrapper>
          <PrivacyControlsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
      });

      // Data management section
      expect(screen.getByText(/data management/i)).toBeInTheDocument();
      
      const exportButton = screen.getByRole('button', { name: /export my data/i });
      const deleteButton = screen.getByRole('button', { name: /delete my data/i });
      
      expect(exportButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
      
      // Test export functionality
      await user.click(exportButton);
      expect(screen.getByText(/preparing your data export/i)).toBeInTheDocument();
      
      // Test delete with confirmation
      await user.click(deleteButton);
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    });

    it('should be accessible and keyboard navigable', async () => {
      mockSocialService.getPrivacySettings = jest.fn().mockResolvedValue(mockPrivacySettings);
      
      render(
        <TestWrapper>
          <PrivacyControlsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
      });

      // Accessibility check
      const results = await axe(screen.getByTestId('test-wrapper'));
      expect(results).toHaveNoViolations();
      
      // Keyboard navigation test
      const firstToggle = screen.getAllByRole('checkbox')[0];
      firstToggle.focus();
      expect(firstToggle).toHaveFocus();
      
      // All interactive elements should have proper ARIA labels
      const toggles = screen.getAllByRole('checkbox');
      toggles.forEach(toggle => {
        expect(toggle).toHaveAccessibleName();
        expect(toggle).toHaveAttribute('aria-describedby');
      });
    });
  });

  describe('Performance and Loading States', () => {
    it('should show appropriate loading states during data fetching', async () => {
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockSocialService.getRecommendations.mockReturnValue(delayedPromise);
      
      render(
        <TestWrapper>
          <SocialRecommendationsFeed />
        </TestWrapper>
      );

      // Should show loading skeleton
      expect(screen.getByTestId('recommendations-loading')).toBeInTheDocument();
      expect(screen.getAllByTestId('recommendation-skeleton')).toHaveLength(6);
      
      // Resolve the promise
      resolvePromise!({
        recommendations: mockRecommendations,
        totalCount: 2,
        hasMore: false
      });
      
      await waitFor(() => {
        expect(screen.queryByTestId('recommendations-loading')).not.toBeInTheDocument();
        expect(screen.getByText('The Social Dilemma')).toBeInTheDocument();
      });
    });

    it('should handle empty states with helpful messaging', async () => {
      mockSocialService.getFriends.mockResolvedValue({
        friends: [],
        totalCount: 0,
        hasMore: false
      });
      
      render(
        <TestWrapper>
          <FriendDiscoveryInterface />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no friends found/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/connect more social accounts/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /connect another platform/i })).toBeInTheDocument();
    });

    it('should optimize image loading with lazy loading and placeholders', async () => {
      mockSocialService.getRecommendations.mockResolvedValue({
        recommendations: mockRecommendations,
        totalCount: 2,
        hasMore: false
      });
      
      render(
        <TestWrapper>
          <SocialRecommendationsFeed />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('The Social Dilemma')).toBeInTheDocument();
      });

      // Check lazy loading implementation
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('alt'); // Accessibility
      });
      
      // Should have placeholder while loading
      const posterImages = screen.getAllByTestId(/poster-image/);
      posterImages.forEach(img => {
        expect(img).toHaveStyle({ backgroundColor: expect.any(String) }); // Placeholder
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully with retry options', async () => {
      const user = userEvent.setup();
      mockSocialService.getRecommendations
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          recommendations: mockRecommendations,
          totalCount: 2,
          hasMore: false
        });
      
      render(
        <TestWrapper>
          <SocialRecommendationsFeed />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/failed to load recommendations/i)).toBeInTheDocument();
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
      
      // Test retry functionality
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('The Social Dilemma')).toBeInTheDocument();
      });
    });

    it('should provide helpful error messages for different error types', async () => {
      const errorScenarios = [
        {
          error: new Error('Authentication failed'),
          expectedMessage: /please reconnect your social account/i,
          expectedAction: /reconnect/i
        },
        {
          error: new Error('Rate limit exceeded'),
          expectedMessage: /too many requests/i,
          expectedAction: /try again later/i
        },
        {
          error: new Error('Service unavailable'),
          expectedMessage: /service temporarily unavailable/i,
          expectedAction: /try again/i
        }
      ];

      for (const scenario of errorScenarios) {
        mockSocialService.getActivityFeed.mockRejectedValueOnce(scenario.error);
        
        const { unmount } = render(
          <TestWrapper>
            <SocialActivityFeed />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText(scenario.expectedMessage)).toBeInTheDocument();
        });
        
        expect(screen.getByRole('button', { name: scenario.expectedAction })).toBeInTheDocument();
        
        unmount();
      }
    });
  });
});