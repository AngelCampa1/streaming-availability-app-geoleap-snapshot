'use client';

import React from'react';
import {
  CheckCircle,
  Shield,
  Award,
  Users,
  Star,
  TrendingUp,
  Zap,
  Crown,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Flame,
} from'lucide-react';

// Social proof badge types
export interface SocialBadge {
  id: string;
  type:'verified' |'expert' |'top_reviewer' |'early_adopter' |'influencer' |'trusted' |'active' |'popular';
  label: string;
  description?: string;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  criteria?: string;
  earnedAt?: string;
}

// Social proof data interface
export interface SocialProofData {
  followers: number;
  following: number;
  reviews: number;
  avgRating: number;
  totalLikes: number;
  totalShares: number;
  watchedContent: number;
  badges: SocialBadge[];
  trustScore: number;
  popularityRank?: number;
  engagementRate: number;
}

// Predefined badges
const BADGE_CONFIGS: Record<string, Omit<SocialBadge,'id' |'earnedAt'>> = {
  verified: {
    type:'verified',
    label:'Verified',
    description:'Verified user account',
    color:'text-primary bg-primary/10',
    icon: CheckCircle,
    criteria:'Account verification completed',
  },
  expert: {
    type:'expert',
    label:'Expert',
    description:'Content expert in specific genres',
    color:'text-primary bg-primary/10',
    icon: Award,
    criteria:'Recognized expertise in content categories',
  },
  top_reviewer: {
    type:'top_reviewer',
    label:'Top Reviewer',
    description:'Writes high-quality reviews',
    color:'text-warning bg-warning/10',
    icon: Star,
    criteria:'100+ helpful reviews',
  },
  early_adopter: {
    type:'early_adopter',
    label:'Early Adopter',
    description:'Joined during early access',
    color:'text-success bg-success/10',
    icon: Zap,
    criteria:'Joined during beta or early access',
  },
  influencer: {
    type:'influencer',
    label:'Influencer',
    description:'Has significant social influence',
    color:'text-pink-600  bg-pink-100',
    icon: Crown,
    criteria:'10K+ followers or high engagement',
  },
  trusted: {
    type:'trusted',
    label:'Trusted',
    description:'High trust score from community',
    color:'text-info bg-info/10',
    icon: Shield,
    criteria:'High community trust rating',
  },
  active: {
    type:'active',
    label:'Active User',
    description:'Regularly engages with content',
    color:'text-warning bg-warning/10',
    icon: Flame,
    criteria:'Daily activity for 30+ days',
  },
  popular: {
    type:'popular',
    label:'Popular',
    description:'Content receives high engagement',
    color:'text-destructive bg-destructive/10',
    icon: TrendingUp,
    criteria:'High average likes and shares',
  },
};

// Badge component
interface SocialBadgeProps {
  badge: SocialBadge;
  size?:'sm' |'md' |'lg';
  showTooltip?: boolean;
  className?: string;
}

export function SocialBadgeComponent({ badge, size ='md', showTooltip = true, className ='' }: SocialBadgeProps) {
  const { icon: Icon } = badge;

  const sizeClasses = {
    sm:'px-1.5 py-0.5 text-xs',
    md:'px-2 py-1 text-sm',
    lg:'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`inline-flex items-center space-x-1 rounded-full font-medium ${badge.color} ${sizeClasses[size]} ${className}`}
      title={showTooltip ? `${badge.label}: ${badge.description}` : undefined}
    >
      <Icon size={iconSizes[size]} />
      <span>{badge.label}</span>
    </span>
  );
}

// Badge collection component
interface SocialBadgeCollectionProps {
  badges: SocialBadge[];
  maxVisible?: number;
  size?:'sm' |'md' |'lg';
  layout?:'horizontal' |'vertical' |'grid';
  className?: string;
}

export function SocialBadgeCollection({
  badges,
  maxVisible = 3,
  size ='md',
  layout ='horizontal',
  className ='',
}: SocialBadgeCollectionProps) {
  const visibleBadges = badges.slice(0, maxVisible);
  const remainingCount = badges.length - maxVisible;

  const layoutClasses = {
    horizontal:'flex flex-wrap gap-1',
    vertical:'flex flex-col gap-1',
    grid:'grid grid-cols-2 gap-1',
  };

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {visibleBadges.map(badge => (
        <SocialBadgeComponent key={badge.id} badge={badge} size={size} />
      ))}

      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ${
            size ==='sm' ?'px-1.5 py-0.5 text-xs' : size ==='lg' ?'px-3 py-1.5 text-base' :'px-2 py-1 text-sm'
          }`}
          title={`${remainingCount} more badge${remainingCount > 1 ?'s' :''}`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

// Trust score indicator
interface TrustScoreProps {
  score: number; // 0-100
  size?:'sm' |'md' |'lg';
  showLabel?: boolean;
  className?: string;
}

export function TrustScore({ score, size ='md', showLabel = true, className ='' }: TrustScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return'text-success bg-success/10';
    if (score >= 60) return'text-warning bg-warning/10';
    if (score >= 40) return'text-warning bg-warning/10';
    return'text-destructive bg-destructive/10';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return'Highly Trusted';
    if (score >= 60) return'Trusted';
    if (score >= 40) return'Somewhat Trusted';
    return'New User';
  };

  const sizeClasses = {
    sm:'px-1.5 py-0.5 text-xs',
    md:'px-2 py-1 text-sm',
    lg:'px-3 py-1.5 text-base',
  };

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <div
        className={`inline-flex items-center space-x-1 rounded-full font-medium ${getScoreColor(score)} ${sizeClasses[size]}`}
      >
        <Shield size={size ==='sm' ? 12 : size ==='lg' ? 16 : 14} />
        <span>{score}/100</span>
      </div>

      {showLabel && <span className="text-sm text-muted-foreground">{getScoreLabel(score)}</span>}
    </div>
  );
}

// Social stats component
interface SocialStatsProps {
  data: SocialProofData;
  layout?:'horizontal' |'vertical' |'grid';
  showAll?: boolean;
  className?: string;
}

export function SocialStats({ data, layout ='horizontal', showAll = true, className ='' }: SocialStatsProps) {
  const stats = [
    { label:'Followers', value: data.followers, icon: Users, color:'text-primary' },
    { label:'Reviews', value: data.reviews, icon: MessageCircle, color:'text-success' },
    {
      label:'Avg Rating',
      value: data.avgRating.toFixed(1),
      icon: Star,
      color:'text-warning',
    },
    { label:'Total Likes', value: data.totalLikes, icon: Heart, color:'text-destructive' },
    { label:'Shares', value: data.totalShares, icon: Share2, color:'text-primary' },
    { label:'Watched', value: data.watchedContent, icon: Eye, color:'text-info' },
  ];

  const displayStats = showAll ? stats : stats.slice(0, 3);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const layoutClasses = {
    horizontal:'flex flex-wrap gap-4',
    vertical:'flex flex-col gap-2',
    grid:'grid grid-cols-2 md:grid-cols-3 gap-3',
  };

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {displayStats.map(stat => (
        <div key={stat.label} className="flex items-center space-x-2">
          <stat.icon size={16} className={stat.color} />
          <div className="text-sm">
            <span className="font-semibold text-foreground">
              {stat.label ==='Avg Rating' ? stat.value : formatNumber(Number(stat.value))}
            </span>
            <span className="text-muted-foreground ml-1">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Engagement indicator
interface EngagementIndicatorProps {
  rate: number; // 0-1
  className?: string;
}

export function EngagementIndicator({ rate, className ='' }: EngagementIndicatorProps) {
  const getEngagementColor = (rate: number) => {
    if (rate >= 0.1) return'text-success bg-success/10';
    if (rate >= 0.05) return'text-warning bg-warning/10';
    if (rate >= 0.02) return'text-warning bg-warning/10';
    return'text-muted-foreground bg-muted';
  };

  const getEngagementLabel = (rate: number) => {
    if (rate >= 0.1) return'High Engagement';
    if (rate >= 0.05) return'Good Engagement';
    if (rate >= 0.02) return'Low Engagement';
    return'Minimal Engagement';
  };

  return (
    <div
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium ${getEngagementColor(rate)} ${className}`}
    >
      <TrendingUp size={14} />
      <span>{getEngagementLabel(rate)}</span>
      <span className="text-xs opacity-75">({(rate * 100).toFixed(1)}%)</span>
    </div>
  );
}

// Complete social proof widget
interface SocialProofWidgetProps {
  data: SocialProofData;
  compact?: boolean;
  showBadges?: boolean;
  showStats?: boolean;
  showTrustScore?: boolean;
  className?: string;
}

export function SocialProofWidget({
  data,
  compact = false,
  showBadges = true,
  showStats = true,
  showTrustScore = true,
  className ='',
}: SocialProofWidgetProps) {
  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        {showBadges && data.badges.length > 0 && (
          <SocialBadgeCollection badges={data.badges} maxVisible={2} size="sm" />
        )}

        {showTrustScore && <TrustScore score={data.trustScore} size="sm" showLabel={false} />}

        {showStats && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>{data.followers} followers</span>
            <span>•</span>
            <span>{data.reviews} reviews</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {showBadges && data.badges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Badges</h4>
          <SocialBadgeCollection badges={data.badges} maxVisible={6} layout="horizontal" />
        </div>
      )}

      {showTrustScore && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Trust Score</h4>
          <TrustScore score={data.trustScore} />
        </div>
      )}

      {showStats && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Social Stats</h4>
          <SocialStats data={data} layout="grid" />
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Engagement</h4>
        <EngagementIndicator rate={data.engagementRate} />
      </div>
    </div>
  );
}

// Utility function to create badges
export const createBadge = (type: keyof typeof BADGE_CONFIGS, earnedAt?: string): SocialBadge => ({
  id: `${type}-${Date.now()}`,
  ...BADGE_CONFIGS[type],
  earnedAt,
});

// Export all badge configs for reference
export { BADGE_CONFIGS };

export default SocialProofWidget;
