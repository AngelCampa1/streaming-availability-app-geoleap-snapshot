/**
 * Social Activity Feed Component
 * Real-time display of social media activities and friend interactions
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SocialActivityFeed as SocialActivityFeedType,
  SocialActivity,
  SocialActivityType,
  SocialPlatform,
} from '../../types/social';
import { useSocialAuth } from '../../contexts/SocialAuthContext';
import { getSocialColor } from '../../lib/social-platform-colors';
import { logger } from '@/lib/logger';

interface SocialActivityFeedProps {
  userId: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showFilters?: boolean;
  className?: string;
}

interface ActivityFilters {
  platforms: SocialPlatform[];
  activityTypes: SocialActivityType[];
  friendsOnly: boolean;
  timeRange: 'all' | '24h' | '7d' | '30d';
}

const ACTIVITY_ICONS = {
  [SocialActivityType.Share]: '📤',
  [SocialActivityType.Like]: '❤️',
  [SocialActivityType.Comment]: '💬',
  [SocialActivityType.Follow]: '👥',
  [SocialActivityType.Unfollow]: '👋',
  [SocialActivityType.Post]: '📝',
  [SocialActivityType.Repost]: '🔄',
  [SocialActivityType.ProfileUpdate]: '👤',
  [SocialActivityType.ConnectionImport]: '📥',
};

const PLATFORM_COLORS = {
  [SocialPlatform.Facebook]: getSocialColor('facebook'),
  [SocialPlatform.Twitter]: getSocialColor('twitter'),
  [SocialPlatform.Instagram]: getSocialColor('instagram'),
  [SocialPlatform.TikTok]: getSocialColor('tiktok'),
  [SocialPlatform.LinkedIn]: getSocialColor('linkedin'),
  [SocialPlatform.YouTube]: getSocialColor('youtube'),
  [SocialPlatform.Discord]: getSocialColor('discord'),
  [SocialPlatform.Twitch]: getSocialColor('twitch'),
  [SocialPlatform.Reddit]: getSocialColor('reddit'),
  [SocialPlatform.WhatsApp]: getSocialColor('whatsapp'),
};

export const SocialActivityFeed: React.FC<SocialActivityFeedProps> = ({
  userId: _userId,
  limit = 50,
  autoRefresh = false,
  refreshInterval = 30000,
  showFilters = true,
  className = '',
}) => {
  const { connections, isLoading: authLoading } = useSocialAuth();

  // State
  const [activities, setActivities] = useState<SocialActivityFeedType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({
    platforms: Object.values(SocialPlatform),
    activityTypes: Object.values(SocialActivityType),
    friendsOnly: false,
    timeRange: '7d',
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Mock API functions (replace with actual API calls)
  const fetchActivityFeed = useCallback(async (): Promise<SocialActivityFeedType[]> => {
    // Mock data - replace with actual API call
    const mockActivities: SocialActivityFeedType[] = [
      {
        id: '1',
        activity: {
          id: 'act_1',
          userId: 'user_123',
          platform: SocialPlatform.Facebook,
          activityType: SocialActivityType.Share,
          contentId: 'movie_456',
          contentTitle: 'The Dark Knight',
          contentType: 'movie',
          description: 'Shared "The Dark Knight" to Facebook',
          imageUrl: 'https://example.com/movie-poster.jpg',
          targetUrl: 'https://example.com/movie/456',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          isPublic: true,
        },
        user: {
          id: 'user_123',
          displayName: 'John Doe',
          profileImageUrl: 'https://example.com/avatar1.jpg',
        },
        friendsWhoAlsoLiked: ['Alice Smith', 'Bob Johnson'],
        isFromFriend: true,
        relevanceScore: 0.85,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        activity: {
          id: 'act_2',
          userId: 'user_456',
          platform: SocialPlatform.Twitter,
          activityType: SocialActivityType.Like,
          contentId: 'tv_789',
          contentTitle: 'Breaking Bad',
          contentType: 'tv',
          description: 'Liked "Breaking Bad" on Twitter',
          imageUrl: 'https://example.com/tv-poster.jpg',
          targetUrl: 'https://example.com/tv/789',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          isPublic: true,
        },
        user: {
          id: 'user_456',
          displayName: 'Alice Smith',
          profileImageUrl: 'https://example.com/avatar2.jpg',
        },
        friendsWhoAlsoLiked: ['Charlie Brown'],
        isFromFriend: true,
        relevanceScore: 0.92,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return mockActivities;
  }, []);

  // Load activity feed
  const loadActivityFeed = useCallback(async () => {
    try {
      setError(null);
      if (!authLoading) {
        setIsLoading(true);
      }

      const feedData = await fetchActivityFeed();
      setActivities(feedData);
      setLastRefresh(new Date());
    } catch (err) {
      logger.error('[SocialActivityFeed] Failed to load activity feed', { error: err instanceof Error ? err.message : String(err) });
      setError('Failed to load activity feed');
    } finally {
      setIsLoading(false);
    }
  }, [fetchActivityFeed, authLoading]);

  // Initial load
  useEffect(() => {
    loadActivityFeed();
  }, [loadActivityFeed]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadActivityFeed, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadActivityFeed]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      // Platform filter
      if (!filters.platforms.includes(item.activity.platform)) {
        return false;
      }

      // Activity type filter
      if (!filters.activityTypes.includes(item.activity.activityType)) {
        return false;
      }

      // Friends only filter
      if (filters.friendsOnly && !item.isFromFriend) {
        return false;
      }

      // Time range filter
      const activityDate = new Date(item.activity.createdAt);
      const now = new Date();
      const timeDiff = now.getTime() - activityDate.getTime();

      switch (filters.timeRange) {
        case '24h':
          return timeDiff <= 24 * 60 * 60 * 1000;
        case '7d':
          return timeDiff <= 7 * 24 * 60 * 60 * 1000;
        case '30d':
          return timeDiff <= 30 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    });
  }, [activities, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ActivityFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  // Get activity description
  const getActivityDescription = (activity: SocialActivity) => {
    const action = activity.activityType.replace('_', ' ');
    return `${action} "${activity.contentTitle}"`;
  };

  if (authLoading || isLoading) {
    return (
      <div className={`social-activity-feed loading ${className}`}>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex space-x-3 p-4 border border-border rounded-lg">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`social-activity-feed ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Activity Feed</h2>
            <p className="text-muted-foreground">See what your friends are watching and sharing</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Last updated: {formatRelativeTime(lastRefresh.toISOString())}
            </span>
            <button
              onClick={loadActivityFeed}
              disabled={isLoading}
              className="p-2 text-foreground hover:text-foreground/80 disabled:opacity-50"
              aria-label="Refresh activity feed"
            >
              <svg
                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-muted rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Time range filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Time Range</label>
                <select
                  value={filters.timeRange}
                  onChange={e => handleFilterChange({ timeRange: e.target.value as ActivityFilters['timeRange'] })}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                >
                  <option value="all">All time</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>

              {/* Friends only toggle */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Show Only</label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.friendsOnly}
                    onChange={e => handleFilterChange({ friendsOnly: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-ring"
                  />
                  <span className="ml-2 text-sm text-foreground">Friends only</span>
                </label>
              </div>

              {/* Connected platforms count */}
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Showing activities from {connections.filter(c => c.isTokenValid).length} connected platforms
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center">
            <span className="text-destructive mr-2">⚠️</span>
            <p className="text-destructive">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-destructive hover:text-destructive/80"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Activity feed */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground text-6xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Activities</h3>
            <p className="text-muted-foreground">
              {connections.length === 0
                ? 'Connect your social media accounts to see activity from friends'
                : 'No recent activities from your connected accounts'}
            </p>
          </div>
        ) : (
          filteredActivities.map(item => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex space-x-3">
                {/* User avatar */}
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.user.profileImageUrl || '/default-avatar.png'}
                    alt={item.user.displayName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-border"
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/default-avatar.png';
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Activity header */}
                  <div className="flex items-center space-x-2 mb-2">
                    <p className="text-sm font-medium text-foreground">{item.user.displayName}</p>
                    <span className="text-sm text-muted-foreground">{getActivityDescription(item.activity)}</span>
                    <span className="text-sm text-muted-foreground">{formatRelativeTime(item.activity.createdAt)}</span>
                  </div>

                  {/* Activity content */}
                  <div className="flex items-center space-x-3">
                    {/* Activity icon */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm ring-1 ring-border"
                      style={{ backgroundColor: `${PLATFORM_COLORS[item.activity.platform]}20` }}
                    >
                      {ACTIVITY_ICONS[item.activity.activityType]}
                    </div>

                    {/* Content info */}
                    <div className="flex-1">
                      <p className="text-sm text-foreground font-medium">{item.activity.contentTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.activity.contentType} • {item.activity.platform}
                      </p>
                    </div>

                    {/* Content image */}
                    {item.activity.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.activity.imageUrl}
                        alt={item.activity.contentTitle}
                        className="w-16 h-16 rounded-lg object-cover ring-1 ring-border"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  {/* Social proof */}
                  {item.friendsWhoAlsoLiked && item.friendsWhoAlsoLiked.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        💝 Also liked by {item.friendsWhoAlsoLiked.slice(0, 2).join(', ')}
                        {item.friendsWhoAlsoLiked.length > 2 && ` and ${item.friendsWhoAlsoLiked.length - 2} others`}
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-3 flex items-center space-x-4">
                    <button
                      onClick={() => {
                        if (item.activity.targetUrl) {
                          window.open(item.activity.targetUrl, '_blank');
                        }
                      }}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      View Content →
                    </button>
                    <button
                      className="text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        // Track interaction
                        logger.info('[SocialActivityFeed] Activity interaction', { activityId: item.id });
                      }}
                    >
                      ❤️ Like
                    </button>
                    <button
                      className="text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        // Open share modal
                        logger.info('[SocialActivityFeed] Share activity', { activityId: item.id });
                      }}
                    >
                      📤 Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load more button */}
      {filteredActivities.length >= limit && (
        <div className="text-center mt-6">
          <button
            onClick={() => {
              // Load more activities
              logger.info('[SocialActivityFeed] Load more activities');
            }}
            className="px-6 py-3 border border-border rounded-md text-foreground hover:bg-accent"
          >
            Load More Activities
          </button>
        </div>
      )}
    </div>
  );
};

export default SocialActivityFeed;
