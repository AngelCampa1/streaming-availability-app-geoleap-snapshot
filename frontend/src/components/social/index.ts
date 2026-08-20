// Social Authentication
export { default as SocialAuthProvider, useSocialAuth } from './SocialAuthProvider';
export type { SocialAuthConnection, SocialAuthUser } from './SocialAuthProvider';

export { default as SocialLoginButton, SocialLoginGroup, COMMON_PROVIDERS, ALL_PROVIDERS } from './SocialLoginButton';

export { default as SocialAuthCallback } from './SocialAuthCallback';

export { default as SocialConnectionsManager } from './SocialConnectionsManager';

// Friend Features
export { default as FriendActivityFeed } from './FriendActivityFeed';
export { default as FriendDiscovery } from './FriendDiscovery';

// Social Recommendations
export { default as SocialRecommendations } from './SocialRecommendations';

// Social Proof
export {
  default as SocialProofWidget,
  SocialBadgeComponent,
  SocialBadgeCollection,
  TrustScore,
  SocialStats,
  EngagementIndicator,
  createBadge,
  BADGE_CONFIGS,
} from './SocialProofElements';
export type { SocialBadge, SocialProofData } from './SocialProofElements';

// Enhanced Features (NEW)
export { default as SocialPrivacyControls } from './SocialPrivacyControls';
export { default as EnhancedOAuthIntegration } from './EnhancedOAuthIntegration';
export { default as SocialSharingOptimization } from './SocialSharingOptimization';
export { default as SocialNotificationCenter } from './SocialNotificationCenter';
export { default as SocialActivityAnalytics } from './SocialActivityAnalytics';

// Onboarding
export { default as SocialOnboarding } from './SocialOnboarding';

// Analytics
export {
  default as SocialAnalyticsProvider,
  useSocialAnalytics,
  withSocialAnalytics,
  useTrackSocialLogin,
  useTrackFriendRequest,
  useTrackContentShare,
  useTrackRecommendationClick,
  useTrackFeedInteraction,
} from './SocialAnalyticsTracker';
export type { SocialAnalyticsEvent } from './SocialAnalyticsTracker';

// Existing components (maintained for backward compatibility)
export { default as SocialShareButton } from './SocialShareButton';
export { default as ShareAnalyticsDashboard } from './ShareAnalyticsDashboard';
export { default as ShareModal } from './ShareModal';
export { default as MobileSocialSharing } from './MobileSocialSharing';
export { default as SocialShareModal } from './SocialShareModal';
export { default as ShareButton } from './ShareButton';
export { default as SocialSharingExample } from './SocialSharingExample';

// Social sharing hooks (from existing codebase)
export {
  default as useSocialSharing,
  useShareAnalytics,
  useMobileShare,
  useShareTracking,
} from '../../hooks/useSocialSharing';
