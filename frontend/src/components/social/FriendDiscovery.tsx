'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Users,
  UserPlus,
  UserCheck,
  Mail,
  X,
  Filter,
  MapPin,
  Globe,
  Star,
  MessageCircle,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  UserX,
} from 'lucide-react';
import { useSocialAuth } from './SocialAuthProvider';
import { EmptyState } from '@/components/ui/empty-state';

interface FriendSuggestion {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  provider: string;
  mutualFriends: number;
  location?: string;
  bio?: string;
  interests: string[];
  activityLevel: 'high' | 'medium' | 'low';
  lastActive: string;
  isVerified?: boolean;
  commonContent: {
    movies: number;
    shows: number;
    genres: string[];
  };
  socialProof: {
    followers: number;
    following: number;
    reviews: number;
    rating: number;
  };
  connectionReason: 'mutual_friends' | 'similar_taste' | 'same_location' | 'imported_contacts' | 'platform_friends';
  privacyLevel: 'open' | 'friends_only' | 'limited';
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUser: {
    username: string;
    displayName: string;
    avatar?: string;
    provider: string;
  };
  message?: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface DiscoveryFilters {
  providers: string[];
  mutualFriendsMin: number;
  location: string;
  interests: string[];
  activityLevel: string[];
}

export function FriendDiscovery() {
  const { user, connections: _connections } = useSocialAuth();
  const [activeTab, setActiveTab] = useState<'suggestions' | 'requests' | 'search'>('suggestions');
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<DiscoveryFilters>({
    providers: [],
    mutualFriendsMin: 0,
    location: '',
    interests: [],
    activityLevel: [],
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load initial data
  useEffect(() => {
    if (user?.privacySettings.allowFriendDiscovery) {
      loadSuggestions();
      loadRequests();
    }
  }, [user]);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/friends/suggestions', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load friend suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendFriendRequest = async (userId: string, message?: string) => {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, message }),
      });

      if (response.ok) {
        // Remove from suggestions
        setSuggestions(prev => prev.filter(s => s.id !== userId));
        // Update search results if present
        setSearchResults(prev => prev.filter(s => s.id !== userId));
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  const respondToRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to respond to friend request:', error);
    }
  };

  const getConnectionReasonIcon = (reason: string) => {
    switch (reason) {
      case 'mutual_friends':
        return <Users size={14} className="text-primary" />;
      case 'similar_taste':
        return <Star size={14} className="text-primary" />;
      case 'same_location':
        return <MapPin size={14} className="text-success" />;
      case 'imported_contacts':
        return <Mail size={14} className="text-warning" />;
      case 'platform_friends':
        return <Globe size={14} className="text-info" />;
      default:
        return <Users size={14} className="text-muted-foreground" />;
    }
  };

  const getConnectionReasonText = (reason: string) => {
    switch (reason) {
      case 'mutual_friends':
        return 'Mutual friends';
      case 'similar_taste':
        return 'Similar taste';
      case 'same_location':
        return 'Same location';
      case 'imported_contacts':
        return 'In your contacts';
      case 'platform_friends':
        return 'Social media friend';
      default:
        return 'Suggested for you';
    }
  };

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-success/10 border-success/20 text-success';
      case 'medium':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const renderSuggestionCard = (suggestion: FriendSuggestion) => (
    <div key={suggestion.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={suggestion.avatar || '/default-avatar.png'}
              alt={suggestion.displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
            {suggestion.isVerified && (
              <CheckCircle size={16} className="absolute -bottom-1 -right-1 text-primary bg-card rounded-full" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-foreground">{suggestion.displayName}</h3>
              <span className="text-sm text-muted-foreground">@{suggestion.username}</span>
            </div>

            <div className="flex items-center space-x-2 mt-1">
              {getConnectionReasonIcon(suggestion.connectionReason)}
              <span className="text-sm text-foreground">{getConnectionReasonText(suggestion.connectionReason)}</span>
            </div>

            {suggestion.mutualFriends > 0 && (
              <p className="text-sm text-foreground mt-1">
                {suggestion.mutualFriends} mutual friend{suggestion.mutualFriends > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded-full ${getActivityLevelColor(suggestion.activityLevel)}`}>
            {suggestion.activityLevel} activity
          </span>
        </div>
      </div>

      {suggestion.bio && <p className="text-sm text-foreground mb-3">{suggestion.bio}</p>}

      {/* Common content */}
      <div className="bg-muted rounded-lg p-3 mb-3">
        <div className="flex items-center space-x-4 text-sm text-foreground">
          <span>{suggestion.commonContent.movies} movies in common</span>
          <span>{suggestion.commonContent.shows} shows in common</span>
        </div>

        {suggestion.commonContent.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {suggestion.commonContent.genres.slice(0, 3).map(genre => (
              <span
                key={genre}
                className="px-2 py-1 text-xs bg-primary/10 border-primary/20 text-primary rounded"
              >
                {genre}
              </span>
            ))}
            {suggestion.commonContent.genres.length > 3 && (
              <span className="px-2 py-1 text-xs text-muted-foreground">
                +{suggestion.commonContent.genres.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Social proof */}
      <div className="flex items-center justify-between text-sm text-foreground mb-4">
        <div className="flex items-center space-x-4">
          <span>{suggestion.socialProof.followers} followers</span>
          <span>{suggestion.socialProof.reviews} reviews</span>
          <div className="flex items-center space-x-1">
            <Star size={12} className="text-warning fill-current" />
            <span>{suggestion.socialProof.rating.toFixed(1)}</span>
          </div>
        </div>

        <span className="text-xs">{new Date(suggestion.lastActive).toLocaleDateString()}</span>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={() => sendFriendRequest(suggestion.id)}
          className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <UserPlus size={16} className="inline mr-2" />
          Add Friend
        </button>

        <button className="px-3 py-2 border border-border rounded-full hover:bg-accent transition-colors">
          <MessageCircle size={16} />
        </button>

        <button className="px-3 py-2 border border-border rounded-full hover:bg-accent transition-colors">
          <ExternalLink size={16} />
        </button>
      </div>
    </div>
  );

  const renderRequestCard = (request: FriendRequest) => (
    <div key={request.id} className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={request.fromUser.avatar || '/default-avatar.png'}
            alt={request.fromUser.displayName}
            className="w-10 h-10 rounded-full object-cover"
          />

          <div>
            <h3 className="font-semibold text-foreground">{request.fromUser.displayName}</h3>
            <p className="text-sm text-foreground">@{request.fromUser.username}</p>
            <p className="text-sm text-muted-foreground">via {request.fromUser.provider}</p>

            {request.message && <p className="text-sm text-foreground mt-2 italic">&quot;{request.message}&quot;</p>}

            <p className="text-xs text-muted-foreground mt-2">{new Date(request.timestamp).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex space-x-2 mt-4">
        <button
          onClick={() => respondToRequest(request.id, 'accept')}
          className="flex-1 bg-success/10 border border-success/20 text-success px-4 py-2 rounded-md hover:bg-success/20 transition-colors text-sm font-medium"
        >
          <UserCheck size={16} className="inline mr-2" />
          Accept
        </button>

        <button
          onClick={() => respondToRequest(request.id, 'decline')}
          className="flex-1 bg-muted text-foreground px-4 py-2 rounded-md hover:bg-accent transition-colors text-sm font-medium"
        >
          <X size={16} className="inline mr-2" />
          Decline
        </button>
      </div>
    </div>
  );

  if (!user?.privacySettings.allowFriendDiscovery) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12 bg-muted rounded-lg">
          <AlertTriangle size={48} className="mx-auto text-warning mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Friend Discovery Disabled</h3>
          <p className="text-muted-foreground mb-4">
            Enable friend discovery in your privacy settings to find and connect with friends.
          </p>
          <button
            onClick={() => (window.location.href = '/settings/social')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Update Privacy Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Discover Friends</h1>
        <p className="text-muted-foreground">Find friends from your social networks and similar interests</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-muted rounded-lg p-1">
        {[
          { id: 'suggestions' as const, label: 'Suggestions', count: suggestions.length },
          { id: 'requests' as const, label: 'Requests', count: requests.length },
          { id: 'search' as const, label: 'Search' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-card text-primary shadow-sm'
                : 'text-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="mb-6">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users by name, username, or email..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      {(activeTab === 'suggestions' || activeTab === 'search') && (
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-border rounded-md hover:bg-accent text-foreground"
          >
            <Filter size={16} />
            <span>Filters</span>
          </button>

          {showFilters && (
            <div className="mt-4 p-4 border border-border rounded-lg bg-muted">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Minimum Mutual Friends</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={filters.mutualFriendsMin}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        mutualFriendsMin: parseInt(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <span className="text-sm text-muted-foreground">{filters.mutualFriendsMin}+</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Activity Level</label>
                  <select
                    multiple
                    value={filters.activityLevel}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        activityLevel: Array.from(e.target.selectedOptions, option => option.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground"
                  >
                    <option value="high">High Activity</option>
                    <option value="medium">Medium Activity</option>
                    <option value="low">Low Activity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Platform</label>
                  <select
                    multiple
                    value={filters.providers}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        providers: Array.from(e.target.selectedOptions, option => option.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground"
                  >
                    <option value="google">Google</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter</option>
                    <option value="github">GitHub</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="discord">Discord</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="grid gap-4 md:grid-cols-2">
        {activeTab === 'suggestions' && suggestions.map(renderSuggestionCard)}
        {activeTab === 'requests' && requests.map(renderRequestCard)}
        {activeTab === 'search' && searchResults.map(renderSuggestionCard)}
      </div>

      {/* Empty States using standardized EmptyState component */}
      {activeTab === 'suggestions' && suggestions.length === 0 && !isLoading && (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No Friend Suggestions"
          description="Connect your social accounts to discover friends!"
          action={{
            label: 'Connect Accounts',
            onClick: () => (window.location.href = '/settings/social'),
          }}
          suggestions={[
            'Link your Google account',
            'Connect with Facebook friends',
            'Import your contacts',
          ]}
          className="bg-muted rounded-lg"
        />
      )}

      {activeTab === 'requests' && requests.length === 0 && !isLoading && (
        <EmptyState
          icon={<Mail className="h-12 w-12" />}
          title="No Friend Requests"
          description="You don't have any pending friend requests."
          suggestions={[
            'Share your profile with friends',
            'Send friend requests to discover users',
          ]}
          className="bg-muted rounded-lg"
        />
      )}

      {activeTab === 'search' && searchQuery && searchResults.length === 0 && !isLoading && (
        <EmptyState
          icon={<UserX className="h-12 w-12" />}
          title="No Results Found"
          description="Try searching with different keywords."
          suggestions={[
            'Check the spelling of the username',
            'Try searching by email instead',
            'Browse friend suggestions',
          ]}
          action={{
            label: 'Browse Suggestions',
            onClick: () => setActiveTab('suggestions'),
            variant: 'outline',
          }}
          className="bg-muted rounded-lg"
        />
      )}
    </div>
  );
}

export default FriendDiscovery;
