/**
 * TypeScript interfaces for Social Media Integration
 * Based on backend SocialAuthController and SocialAuthModels
 */

// Core Social Platform Types
export enum SocialPlatform {
  Facebook = 'facebook',
  Twitter = 'twitter',
  Instagram = 'instagram',
  TikTok = 'tiktok',
  LinkedIn = 'linkedin',
  YouTube = 'youtube',
  Discord = 'discord',
  Twitch = 'twitch',
  Reddit = 'reddit',
  WhatsApp = 'whatsapp',
}

// OAuth and Authentication Types
export interface OAuthInitiationResult {
  isSuccess: boolean;
  authorizationUrl: string;
  state: string;
  expiresAt: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface OAuthCallbackResult {
  isSuccess: boolean;
  userInfo?: SocialProfile;
  grantedScopes?: string[];
  tokenExpiresAt: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface ConnectSocialAccountRequest {
  redirectUrl: string;
  scopes?: string[];
  additionalParameters?: Record<string, string>;
}

// Social Profile and Connection Types
export interface SocialProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  profileImageUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  isVerified: boolean;
  additionalData?: Record<string, unknown>;
}

export interface SocialConnection {
  id: string;
  userId: string;
  platform: SocialPlatform;
  socialUserId: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  bio: string;
  connectedAt: string;
  lastTokenRefresh?: string;
  isTokenValid: boolean;
  grantedScopes: string;
  followersCount: number;
  followingCount: number;
  isVerified: boolean;
  profileData?: Record<string, unknown>;
  updatedAt: string;
}

// Privacy and Settings Types
export interface SocialPrivacyConsent {
  id: string;
  userId: string;
  allowSocialDataCollection: boolean;
  allowFriendDiscovery: boolean;
  allowSocialRecommendations: boolean;
  allowActivityTracking: boolean;
  allowProfileMatching: boolean;
  allowSocialAnalytics: boolean;
  shareDataWithThirdParties: boolean;
  specificPlatformConsents: Record<string, unknown>;
  consentGivenAt: string;
  consentRevokedAt?: string;
  isGdprCompliant: boolean;
  consentVersion: string;
  gdprLawfulBasis: string;
  updatedAt: string;
}

export interface UpdateSocialPreferencesRequest {
  allowSocialSharing: boolean;
  allowFriendDiscovery: boolean;
  allowRecommendations: boolean;
  allowActivityTracking: boolean;
  preferredPlatforms?: string[];
  platformSettings?: Record<string, unknown>;
}

// Content and Sharing Types
export interface SocialShareContent {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: 'movie' | 'tv' | 'person' | 'article' | 'video' | 'music';
  imageUrl?: string;
  hashtags?: string[];
}

export interface SocialPostRequest {
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  platforms?: SocialPlatform[];
  platformSpecificData?: Record<string, string>;
  schedulePost?: boolean;
  scheduledFor?: string;
}

export interface SocialPostResult {
  isSuccess: boolean;
  postId?: string;
  postUrl?: string;
  postedAt?: string;
  errorMessage?: string;
  errorCode?: string;
}

// Activity and Feed Types
export interface SocialActivity {
  id: string;
  userId: string;
  platform: SocialPlatform;
  activityType: SocialActivityType;
  contentId?: string;
  contentTitle?: string;
  contentType?: string;
  description: string;
  imageUrl?: string;
  targetUrl?: string;
  targetUserId?: string;
  createdAt: string;
  isPublic: boolean;
  metadata?: Record<string, unknown>;
}

export enum SocialActivityType {
  Share = 'share',
  Like = 'like',
  Comment = 'comment',
  Follow = 'follow',
  Unfollow = 'unfollow',
  Post = 'post',
  Repost = 'repost',
  ProfileUpdate = 'profile_update',
  ConnectionImport = 'connection_import',
}

export interface SocialActivityFeed {
  id: string;
  activity: SocialActivity;
  user: {
    id: string;
    displayName: string;
    profileImageUrl?: string;
  };
  friendsWhoAlsoLiked?: string[];
  isFromFriend: boolean;
  relevanceScore: number;
  createdAt: string;
}

// Recommendation Types
export interface ContentRecommendation {
  contentId: string;
  contentType: string;
  title: string;
  description: string;
  imageUrl: string;
  score: number;
  reason: string;
  sourcePlatforms: string[];
  friendCount?: number;
  type: 'movie' | 'tv' | 'person' | 'content';
}

export interface SocialRecommendation {
  id: string;
  userId: string;
  recommendationType: 'content' | 'user' | 'hashtag';
  contentId: string;
  contentTitle: string;
  contentType: string;
  score: number;
  reason: string;
  sourcePlatforms: string[];
  generatedAt: string;
  expiresAt: string;
  isActive: boolean;
  recommendationData?: Record<string, unknown>;
}

// Social Proof and Analytics Types
export interface SocialProof {
  shareCount: number;
  friendActivity: string[];
  trending: boolean;
  popularityScore: number;
  platformBreakdown?: Record<SocialPlatform, number>;
  recentActivity?: SocialActivity[];
}

export interface SocialAnalytics {
  totalConnections: number;
  totalPosts: number;
  totalInteractions: number;
  platformBreakdown: Record<string, number>;
  activityByType: Record<string, number>;
  lastActivity?: string;
}

// Platform Information Types
export interface SocialPlatformInfo {
  name: string;
  displayName: string;
  isEnabled: boolean;
  requiredScopes: string[];
  optionalScopes: string[];
  supportsPosting: boolean;
  supportsFriends: boolean;
  rateLimits?: Record<string, number>;
  iconUrl?: string;
  color?: string;
}

// Friend and Graph Types
export interface SocialFriend {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  connectionType: 'friend' | 'follower' | 'following' | 'mutual';
  connectedSince?: string;
  isRegisteredUser: boolean;
  geoLeapUserId?: string;
  platform: SocialPlatform;
}

export interface SocialImportResult {
  isSuccess: boolean;
  importedConnections: number;
  skippedConnections: number;
  errors?: string[];
  errorMessage?: string;
  errorCode?: string;
}

// Token Management Types
export interface TokenValidationResult {
  isSuccess: boolean;
  isValid: boolean;
  expiresAt?: string;
  wasRefreshed: boolean;
  errorMessage?: string;
  errorCode?: string;
}

// UI Component Props Types
export interface SocialLoginButtonProps {
  platform: SocialPlatform;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outline' | 'filled';
  disabled?: boolean;
  loading?: boolean;
  redirectTo?: string;
  onSuccess?: (result: OAuthCallbackResult) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export interface SocialShareButtonProps {
  // Content props (individual for flexibility)
  contentId: string;
  contentTitle: string;
  contentDescription?: string;
  contentImage?: string;

  // Platform and behavior
  platform: SocialPlatform;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outline' | 'filled';
  disabled?: boolean;
  loading?: boolean;

  // Event handlers
  onShareSuccess?: (result: { platform: SocialPlatform; shareUrl: string }) => void;
  onShareError?: (error: { platform: SocialPlatform; error: string }) => void;

  // Optional props
  shareCount?: number;
  privacySettings?: {
    allowSocialSharing?: boolean;
    sharePersonalInfo?: boolean;
  };
  className?: string;
}

export interface MobileSocialSharingProps {
  // Content props
  contentId: string;
  contentTitle: string;
  contentDescription?: string;
  contentImage?: string;

  // Event handlers
  onShareSuccess?: (result: { platform: string; shareUrl?: string; method?: string }) => void;
  onShareError?: (error: { platform: string; error: string }) => void;

  // Mobile-specific props
  className?: string;
}

export interface SocialConnectionsProps {
  userId: string;
  editable?: boolean;
  showPrivacyControls?: boolean;
  onConnectionUpdate?: (platform: SocialPlatform, action: 'connect' | 'disconnect') => void;
  className?: string;
}

// Error Types
export interface SocialError {
  code: string;
  message: string;
  platform?: SocialPlatform;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

// Hook Return Types
export interface UseSocialAuthReturn {
  // State
  isAuthenticated: boolean;
  user: SocialProfile | null;
  connections: SocialConnection[];
  isLoading: boolean;
  error: SocialError | null;

  // Actions
  login: (platform: SocialPlatform, redirectTo?: string) => Promise<void>;
  connect: (platform: SocialPlatform) => Promise<SocialConnection>;
  disconnect: (platform: SocialPlatform) => Promise<void>;
  refreshConnections: () => Promise<void>;
  validateToken: (platform: SocialPlatform) => Promise<TokenValidationResult>;

  // Utilities
  isConnected: (platform: SocialPlatform) => boolean;
  getConnection: (platform: SocialPlatform) => SocialConnection | undefined;
  canConnect: (platform: SocialPlatform) => boolean;
}

export interface UseSocialSharingReturn {
  // State
  isSharing: boolean;
  shareResults: Record<SocialPlatform, SocialPostResult>;
  error: SocialError | null;

  // Actions
  share: (
    content: SocialShareContent,
    platforms: SocialPlatform[],
    customMessage?: string
  ) => Promise<SocialPostResult[]>;
  shareToSingle: (
    content: SocialShareContent,
    platform: SocialPlatform,
    customMessage?: string
  ) => Promise<SocialPostResult>;
  generateShareUrl: (content: SocialShareContent) => Promise<string>;

  // Utilities
  getSocialProof: (contentId: string) => Promise<SocialProof>;
  trackShare: (contentId: string, platform: SocialPlatform) => void;
}

// Context Types
export interface SocialAuthContextType {
  // User and connections
  user: SocialProfile | null;
  connections: SocialConnection[];
  privacySettings: SocialPrivacyConsent | null;

  // Loading states
  isLoading: boolean;
  isConnecting: Record<SocialPlatform, boolean>;

  // Authentication methods
  loginWithProvider: (platform: SocialPlatform, redirectTo?: string) => Promise<void>;
  connectProvider: (platform: SocialPlatform) => Promise<SocialConnection>;
  disconnectProvider: (platform: SocialPlatform) => Promise<void>;

  // Privacy management
  updatePrivacySettings: (settings: Partial<UpdateSocialPreferencesRequest>) => Promise<void>;

  // Connection management
  refreshConnections: () => Promise<void>;
  validateConnection: (platform: SocialPlatform) => Promise<TokenValidationResult>;

  // Utility methods
  isProviderConnected: (platform: SocialPlatform) => boolean;
  getConnection: (platform: SocialPlatform) => SocialConnection | undefined;
  canConnect: (platform: SocialPlatform) => boolean;

  // Error handling
  error: SocialError | null;
  clearError: () => void;
}
