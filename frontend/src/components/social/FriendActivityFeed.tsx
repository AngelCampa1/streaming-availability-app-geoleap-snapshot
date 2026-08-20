'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Star,
  Users,
  TrendingUp,
  RefreshCw,
  Filter,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';
import { logger } from '@/lib/logger';

interface FriendActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userProvider: string;
  activityType: 'watch' | 'rate' | 'share' | 'comment' | 'favorite' | 'review' | 'follow';
  timestamp: string;
  content: {
    title: string;
    type: 'movie' | 'show' | 'episode' | 'person' | 'list';
    id: string;
    image?: string;
    description?: string;
    metadata?: Record<string, any>;
  };
  socialData?: {
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    userReacted?: boolean;
  };
  privacy: 'public' | 'friends' | 'private';
  isOnline?: boolean;
}

interface ActivityFilters {
  activityTypes: string[];
  friends: string[];
  timeRange: 'hour' | 'day' | 'week' | 'month' | 'all';
  contentTypes: string[];
}

interface FriendActivityFeedProps {
  maxItems?: number;
  showFilters?: boolean;
  realTimeUpdates?: boolean;
  compactMode?: boolean;
  className?: string;
}

export function FriendActivityFeed({
  maxItems = 50,
  showFilters = true,
  realTimeUpdates = true,
  compactMode = false,
  className = '',
}: FriendActivityFeedProps) {
  const { user, connections: _connections } = useSocialAuth();
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({
    activityTypes: [],
    friends: [],
    timeRange: 'week',
    contentTypes: [],
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize WebSocket for real-time updates
  useEffect(() => {
    if (!realTimeUpdates || !user) return;

    const connectWebSocket = () => {
      try {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/social-feed/ws`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          logger.info('[FriendActivityFeed] Connected to activity feed WebSocket');
          // Send authentication
          wsRef.current?.send(
            JSON.stringify({
              type: 'auth',
              // SECURITY: Token sent via httpOnly cookies (credentials: 'include')
            // WebSocket auth handled by server-side cookie validation
            })
          );
        };

        wsRef.current.onmessage = event => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'activity') {
              // Add new activity to the feed
              setActivities(prev => {
                const newActivities = [data.activity, ...prev];
                return newActivities.slice(0, maxItems);
              });
            } else if (data.type === 'activity_update') {
              // Update existing activity (likes, comments, etc.)
              setActivities(prev =>
                prev.map(activity => (activity.id === data.activityId ? { ...activity, ...data.updates } : activity))
              );
            }
          } catch (parseError) {
            console.error('Failed to parse WebSocket message:', parseError);
          }
        };

        wsRef.current.onerror = error => {
          console.error('WebSocket error:', error);
        };

        wsRef.current.onclose = () => {
          logger.info('[FriendActivityFeed] WebSocket connection closed');
          // Reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, [realTimeUpdates, user, maxItems]);

  // Load initial activities
  useEffect(() => {
    loadActivities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadActivities = useCallback(
    async (refresh = false) => {
      if (!user) return;

      // Cancel previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const params = new URLSearchParams({
          limit: maxItems.toString(),
          timeRange: filters.timeRange,
          ...(filters.activityTypes.length > 0 && { activityTypes: filters.activityTypes.join(',') }),
          ...(filters.friends.length > 0 && { friends: filters.friends.join(',') }),
          ...(filters.contentTypes.length > 0 && { contentTypes: filters.contentTypes.join(',') }),
        });

        const response = await fetch(`/api/social-feed/activities?${params}`, {
          credentials: 'include',
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load activities');
        }

        const data = await response.json();
        setActivities(data.activities || []);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Failed to load activities:', error);
        setError(error instanceof Error ? error.message : 'Failed to load friend activities');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user, maxItems, filters]
  );

  const handleRefresh = () => {
    loadActivities(true);
  };

  const handleReaction = async (activityId: string, reactionType: 'like' | 'comment' | 'share') => {
    try {
      // SECURITY: Use credentials: 'include' for cookie-based auth (no localStorage)
      const response = await fetch('/api/social-feed/reactions', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId,
          reactionType,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update activity with new reaction counts
        setActivities(prev =>
          prev.map(activity =>
            activity.id === activityId
              ? {
                  ...activity,
                  socialData: {
                    platform: activity.socialData?.platform || result.socialData?.platform || '',
                    likes: result.socialData?.likes ?? activity.socialData?.likes ?? 0,
                    comments: result.socialData?.comments ?? activity.socialData?.comments ?? 0,
                    shares: result.socialData?.shares ?? activity.socialData?.shares ?? 0,
                    userReacted: true,
                  },
                }
              : activity
          )
        );
      }
    } catch (error) {
      console.error('Failed to react to activity:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'watch':
        return <Play size={16} className="text-primary" />;
      case 'rate':
        return <Star size={16} className="text-warning" />;
      case 'share':
        return <Share2 size={16} className="text-success" />;
      case 'comment':
        return <MessageCircle size={16} className="text-accent" />;
      case 'favorite':
        return <Heart size={16} className="text-destructive" />;
      case 'review':
        return <MessageCircle size={16} className="text-primary" />;
      case 'follow':
        return <Users size={16} className="text-primary" />;
      default:
        return <TrendingUp size={16} className="text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: FriendActivity) => {
    const actions: Record<string, string> = {
      watch: 'watched',
      rate: 'rated',
      share: 'shared',
      comment: 'commented on',
      favorite: 'favorited',
      review: 'reviewed',
      follow: 'followed',
    };

    return `${actions[activity.activityType] || 'interacted with'} ${activity.content.title}`;
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderActivity = (activity: FriendActivity) => (
    <div
      key={activity.id}
      className={`bg-card rounded-lg border border-border ${compactMode ? 'p-3' : 'p-4'} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start space-x-3">
        {/* User Avatar */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activity.userAvatar || '/default-avatar.png'}
            alt={activity.userName}
            className={`rounded-full ring-2 ring-border ${compactMode ? 'w-8 h-8' : 'w-10 h-10'}`}
          />
          {activity.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success border-2 border-card rounded-full"></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-foreground">{activity.userName}</span>
            {getActivityIcon(activity.activityType)}
            <span className="text-sm text-muted-foreground">{getRelativeTime(activity.timestamp)}</span>
            {activity.userProvider && (
              <span className="text-xs text-muted-foreground">via {activity.userProvider}</span>
            )}
          </div>

          <p className="text-sm text-foreground mb-2">{getActivityText(activity)}</p>

          {/* Content Card */}
          {activity.content && (
            <div className="flex items-center space-x-3 p-2 bg-muted rounded-lg mb-3">
              {activity.content.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activity.content.image}
                  alt={activity.content.title}
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{activity.content.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{activity.content.type}</p>
                {activity.content.metadata?.rating && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Star size={12} className="text-warning fill-current" />
                    <span className="text-xs text-foreground">{activity.content.metadata.rating}/10</span>
                  </div>
                )}
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <ExternalLink size={14} />
              </button>
            </div>
          )}

          {/* Social Interactions */}
          {activity.socialData && !compactMode && (
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <button
                onClick={() => handleReaction(activity.id, 'like')}
                className={`flex items-center space-x-1 hover:text-destructive ${
                  activity.socialData.userReacted ? 'text-destructive' : ''
                }`}
              >
                <Heart size={14} className={activity.socialData.userReacted ? 'fill-current' : ''} />
                <span>{activity.socialData.likes}</span>
              </button>

              <button
                onClick={() => handleReaction(activity.id, 'comment')}
                className="flex items-center space-x-1 hover:text-primary"
              >
                <MessageCircle size={14} />
                <span>{activity.socialData.comments}</span>
              </button>

              <button
                onClick={() => handleReaction(activity.id, 'share')}
                className="flex items-center space-x-1 hover:text-success"
              >
                <Share2 size={14} />
                <span>{activity.socialData.shares}</span>
              </button>
            </div>
          )}
        </div>

        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );

  if (!user?.privacySettings.allowFriendDiscovery) {
    return (
      <div className="text-center py-12 bg-muted rounded-lg">
        <Users size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Friend Discovery Disabled</h3>
        <p className="text-foreground">Enable friend discovery in your privacy settings to see activity feeds.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users size={20} className="text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Friend Activity</h2>
          <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">{activities.length}</span>
        </div>

        <div className="flex items-center space-x-2">
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
            >
              <Filter size={16} />
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && showFilterPanel && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    timeRange: e.target.value as 'hour' | 'day' | 'week' | 'month' | 'all',
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              >
                <option value="hour">Last Hour</option>
                <option value="day">Last Day</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Activity Type</label>
              <select
                multiple
                value={filters.activityTypes}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    activityTypes: Array.from(e.target.selectedOptions, option => option.value),
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              >
                <option value="watch">Watched</option>
                <option value="rate">Rated</option>
                <option value="share">Shared</option>
                <option value="comment">Commented</option>
                <option value="favorite">Favorited</option>
                <option value="review">Reviewed</option>
                <option value="follow">Followed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Content Type</label>
              <select
                multiple
                value={filters.contentTypes}
                onChange={e =>
                  setFilters(prev => ({
                    ...prev,
                    contentTypes: Array.from(e.target.selectedOptions, option => option.value),
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              >
                <option value="movie">Movies</option>
                <option value="show">TV Shows</option>
                <option value="episode">Episodes</option>
                <option value="person">People</option>
                <option value="list">Lists</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin text-primary mx-auto mb-4 w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
          <p className="text-foreground">Loading friend activities...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">{error}</p>
          <button onClick={handleRefresh} className="mt-2 text-destructive hover:text-destructive/80 text-sm font-medium">
            Try again
          </button>
        </div>
      )}

      {/* Activities List */}
      {!isLoading && !error && (
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <Users size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Recent Activity</h3>
              <p className="text-foreground">Your friends haven&apos;t shared any activities recently.</p>
            </div>
          ) : (
            activities.map(renderActivity)
          )}
        </div>
      )}

      {/* Real-time indicator */}
      {realTimeUpdates && (
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse mr-2"></div>
          Live updates enabled
        </div>
      )}
    </div>
  );
}

export default FriendActivityFeed;
