'use client';

import React from 'react';
import Image from 'next/image';
import { Star, ExternalLink, Server, Zap } from 'lucide-react';
import { VpnProviderSummary } from '@/types/vpn-country';

interface VpnProviderListProps {
  providers: VpnProviderSummary[];
  countryCode: string;
  onSelectVpn?: (vpnId: string, countryCode: string) => void;
  className?: string;
}

/**
 * VpnProviderList - Sub-component for displaying VPN providers for a specific country
 *
 * Features:
 * - Provider logo
 * - Name and rating
 * - Price display
 * - Server count in country
 * - Speed information
 * - Affiliate link button
 */
export const VpnProviderList: React.FC<VpnProviderListProps> = ({
  providers,
  countryCode,
  onSelectVpn,
  className = '',
}) => {
  const handleProviderClick = (providerId: string, affiliateLink?: string) => {
    if (onSelectVpn) {
      onSelectVpn(providerId, countryCode);
    }

    // Open affiliate link if available
    if (affiliateLink) {
      window.open(affiliateLink, '_blank', 'noopener,noreferrer');
    }
  };

  if (providers.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground text-center py-4 ${className}`}>
        No VPN providers available for this country
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`} data-testid="vpn-provider-list">
      {providers.map((provider, index) => (
        <div
          key={provider.vpnProviderId || index}
          className="flex items-center justify-between gap-3 p-3 bg-background rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200"
          data-testid={`vpn-provider-${provider.vpnProviderId}`}
        >
          {/* Left section: Logo and Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Provider Logo */}
            <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {provider.vpnProviderLogoUrl ? (
                <Image
                  src={provider.vpnProviderLogoUrl}
                  alt={`${provider.vpnProviderName} logo`}
                  width={40}
                  height={40}
                  className="object-contain"
                />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">
                  {provider.vpnProviderName.charAt(0)}
                </span>
              )}
            </div>

            {/* Provider Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm text-foreground truncate">
                  {provider.vpnProviderName}
                </h4>

                {/* Rating */}
                {provider.rating > 0 && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                    <span className="text-xs font-medium text-foreground">
                      {provider.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Additional Info Row */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {/* Server Count */}
                {provider.serverCount !== undefined && provider.serverCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    <span>{provider.serverCount} servers</span>
                  </div>
                )}

                {/* Speed */}
                {provider.speedMbps !== undefined && provider.speedMbps > 0 && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>{provider.speedMbps} Mbps</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Price and Action */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Price */}
            {provider.price !== undefined && provider.currency && (
              <div className="text-right">
                <div className="text-sm font-bold text-success">
                  {provider.currency}{provider.price.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">per month</div>
              </div>
            )}

            {/* View Details Button */}
            <button
              type="button"
              onClick={() => handleProviderClick(provider.vpnProviderId, provider.affiliateLink)}
              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-full transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={`View details for ${provider.vpnProviderName}`}
            >
              <span>View</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VpnProviderList;
