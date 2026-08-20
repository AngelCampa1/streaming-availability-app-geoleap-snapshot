'use client';

import { useState } from 'react';
import { ExternalLink, Shield } from 'lucide-react';
import { AffiliatePartner } from '@/lib/types/affiliate';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionTier } from '@/lib/types/paywall';

interface AffiliateRecommendationProps {
  partners: AffiliatePartner[];
  countryCode?: string;
  contentTitle?: string;
  onTrackClick: (partnerId: string) => Promise<string | null>;
  variant?: 'inline' | 'banner' | 'modal';
  className?: string;
}

export function AffiliateRecommendation({
  partners,
  countryCode,
  contentTitle,
  onTrackClick,
  variant = 'inline',
  className = '',
}: AffiliateRecommendationProps) {
  const { subscription, loading } = useSubscription();
  const [clicked, setClicked] = useState<string | null>(null);

  // Return null while loading to avoid flash of affiliate content for premium users
  if (loading) return null;

  // Only show for free users
  const isPremium = subscription?.tier !== undefined && subscription.tier >= SubscriptionTier.Premium;
  if (isPremium || partners.length === 0) return null;

  const handleClick = async (partner: AffiliatePartner) => {
    setClicked(partner.id);
    const url = await onTrackClick(partner.id);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const topPartner = partners[0];

  if (variant === 'banner') {
    return (
      <div className={`rounded-lg border border-primary/20 bg-primary/5 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {contentTitle ? `Watch "${contentTitle}" with a VPN` : 'Access geo-restricted content'}
            </p>
            <p className="text-xs text-muted-foreground">
              {countryCode ? `Available in ${countryCode} with ` : 'Try '}
              {topPartner.name}
            </p>
          </div>
          <button
            onClick={() => handleClick(topPartner)}
            className="flex-shrink-0 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try {topPartner.name}
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
        <Shield className="h-4 w-4 text-primary" />
        Access with a VPN
      </p>
      {partners.slice(0, 3).map(partner => (
        <button
          key={partner.id}
          onClick={() => handleClick(partner)}
          disabled={clicked === partner.id}
          className="w-full flex items-center justify-between rounded-full border border-border bg-card px-3 py-2 text-sm hover:border-primary/50 hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            {partner.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.logoUrl} alt={partner.name} className="h-5 w-5 object-contain flex-shrink-0" />
            )}
            <span className="font-medium text-card-foreground truncate">{partner.name}</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-primary flex-shrink-0 ml-2">
            Get Access <ExternalLink className="h-3 w-3" />
          </span>
        </button>
      ))}
    </div>
  );
}

export default AffiliateRecommendation;
