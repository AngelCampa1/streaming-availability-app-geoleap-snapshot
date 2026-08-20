import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Star, Check, X, ArrowRight, Shield, Globe, DollarSign } from 'lucide-react';

interface VpnProvider {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  affiliateUrl?: string;
  logoUrl?: string;
  monthlyPrice: number;
  annualPrice: number;
  hasFreeTrial: boolean;
  freeTrialDays?: number;
  serverCount: number;
  countryCount: number;
  supportsP2P: boolean;
  supportsStreaming: boolean;
  hasKillSwitch: boolean;
  hasNoLogsPolicy: boolean;
  maxSimultaneousConnections?: number;
  supportedPlatforms: string[];
  overallRating?: number;
  totalRatings: number;
  isFeatured: boolean;
  streamingCompatibilities: StreamingCompatibility[];
  serverLocations: ServerLocation[];
}

interface StreamingCompatibility {
  streamingServiceId: string;
  streamingServiceName: string;
  status: 'NotTested' | 'WorksReliably' | 'WorksSometimes' | 'DoesNotWork' | 'Blocked';
  notes?: string;
  lastTested: string;
  compatibleRegions?: string[];
}

interface ServerLocation {
  country: string;
  countryCode: string;
  city?: string;
  serverCount: number;
  isOptimizedForStreaming: boolean;
  isP2PFriendly: boolean;
}

interface ComparisonCriteria {
  comparePrice: boolean;
  compareFeatures: boolean;
  compareRatings: boolean;
  compareStreaming: boolean;
  compareServers: boolean;
  specificStreamingServices?: string[];
}

interface VpnProviderComparisonProps {
  providers: VpnProvider[];
  onProviderClick?: (provider: VpnProvider) => void;
  onAffiliateClick?: (provider: VpnProvider) => void;
}

export const VpnProviderComparison: React.FC<VpnProviderComparisonProps> = ({
  providers,
  onProviderClick,
  onAffiliateClick,
}) => {
  const [comparisonCriteria, setComparisonCriteria] = useState<ComparisonCriteria>({
    comparePrice: true,
    compareFeatures: true,
    compareRatings: true,
    compareStreaming: true,
    compareServers: true,
  });

  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-muted-foreground">No ratings</span>;

    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-warning text-warning" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-warning/50 text-warning" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-muted" />);
    }

    return (
      <div className="flex items-center gap-1">
        {stars}
        <span className="text-sm text-muted-foreground ml-2">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}/mo`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WorksReliably':
        return 'bg-success/10 text-success';
      case 'WorksSometimes':
        return 'bg-warning/10 text-warning';
      case 'DoesNotWork':
      case 'Blocked':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WorksReliably':
        return <Check className="w-4 h-4" />;
      case 'DoesNotWork':
      case 'Blocked':
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Comparison Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            VPN Provider Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={comparisonCriteria.comparePrice}
                onChange={e => setComparisonCriteria(prev => ({ ...prev, comparePrice: e.target.checked }))}
                className="rounded border-input"
              />
              <span>Pricing</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={comparisonCriteria.compareFeatures}
                onChange={e => setComparisonCriteria(prev => ({ ...prev, compareFeatures: e.target.checked }))}
                className="rounded border-input"
              />
              <span>Features</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={comparisonCriteria.compareRatings}
                onChange={e => setComparisonCriteria(prev => ({ ...prev, compareRatings: e.target.checked }))}
                className="rounded border-input"
              />
              <span>Ratings</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={comparisonCriteria.compareStreaming}
                onChange={e => setComparisonCriteria(prev => ({ ...prev, compareStreaming: e.target.checked }))}
                className="rounded border-input"
              />
              <span>Streaming</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={comparisonCriteria.compareServers}
                onChange={e => setComparisonCriteria(prev => ({ ...prev, compareServers: e.target.checked }))}
                className="rounded border-input"
              />
              <span>Servers</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Mobile-friendly comparison cards */}
      <div className="block md:hidden space-y-4">
        {providers.map(provider => (
          <Card key={provider.id} className="relative">
            {provider.isFeatured && (
              <div className="absolute -top-2 -right-2 z-10">
                <Badge className="bg-gradient-to-r from-accent to-primary text-primary-foreground">Featured</Badge>
              </div>
            )}

            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {provider.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={provider.logoUrl} alt={provider.name} className="w-12 h-12 rounded-lg object-contain" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    {comparisonCriteria.compareRatings && (
                      <div className="mt-1">{renderStars(provider.overallRating)}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Pricing */}
              {comparisonCriteria.comparePrice && (
                <div className="bg-muted p-3 rounded-lg">
                  <h4 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Pricing
                  </h4>
                  <div className="space-y-1">
                    <p className="text-sm">
                      Monthly: <span className="font-medium">{formatPrice(provider.monthlyPrice)}</span>
                    </p>
                    <p className="text-sm">
                      Annual: <span className="font-medium">{formatPrice(provider.annualPrice / 12)}</span>
                    </p>
                    {provider.hasFreeTrial && (
                      <Badge variant="outline" className="text-xs">
                        {provider.freeTrialDays} day free trial
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Features */}
              {comparisonCriteria.compareFeatures && (
                <div className="bg-muted p-3 rounded-lg">
                  <h4 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Features
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {provider.hasKillSwitch ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <X className="w-4 h-4 text-destructive" />
                      )}
                      <span>Kill Switch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.hasNoLogsPolicy ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <X className="w-4 h-4 text-destructive" />
                      )}
                      <span>No Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.supportsStreaming ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <X className="w-4 h-4 text-destructive" />
                      )}
                      <span>Streaming</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.supportsP2P ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <X className="w-4 h-4 text-destructive" />
                      )}
                      <span>P2P/Torrent</span>
                    </div>
                  </div>
                  {provider.maxSimultaneousConnections && (
                    <p className="text-sm mt-2">
                      Devices: <span className="font-medium">{provider.maxSimultaneousConnections}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Servers */}
              {comparisonCriteria.compareServers && (
                <div className="bg-muted p-3 rounded-lg">
                  <h4 className="font-medium text-sm text-foreground mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Server Network
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>
                      Servers: <span className="font-medium">{provider.serverCount.toLocaleString()}</span>
                    </p>
                    <p>
                      Countries: <span className="font-medium">{provider.countryCount}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Streaming Services */}
              {comparisonCriteria.compareStreaming && provider.streamingCompatibilities.length > 0 && (
                <div className="bg-muted p-3 rounded-lg">
                  <h4 className="font-medium text-sm text-foreground mb-2">Streaming Compatibility</h4>
                  <div className="flex flex-wrap gap-1">
                    {provider.streamingCompatibilities.slice(0, 4).map(compat => (
                      <Badge
                        key={compat.streamingServiceId}
                        variant="outline"
                        className={`text-xs ${getStatusColor(compat.status)}`}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(compat.status)}
                          {compat.streamingServiceName}
                        </span>
                      </Badge>
                    ))}
                    {provider.streamingCompatibilities.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{provider.streamingCompatibilities.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onProviderClick?.(provider)}>
                  Learn More
                </Button>
                <Button className="flex-1" size="sm" onClick={() => onAffiliateClick?.(provider)}>
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop comparison table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left p-4 font-medium">Provider</th>
                    {comparisonCriteria.comparePrice && <th className="text-center p-4 font-medium">Pricing</th>}
                    {comparisonCriteria.compareRatings && <th className="text-center p-4 font-medium">Rating</th>}
                    {comparisonCriteria.compareFeatures && <th className="text-center p-4 font-medium">Features</th>}
                    {comparisonCriteria.compareServers && <th className="text-center p-4 font-medium">Servers</th>}
                    {comparisonCriteria.compareStreaming && <th className="text-center p-4 font-medium">Streaming</th>}
                    <th className="text-center p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map(provider => (
                    <tr key={provider.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {provider.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={provider.logoUrl}
                              alt={provider.name}
                              className="w-10 h-10 rounded object-contain"
                            />
                          )}
                          <div>
                            <h3 className="font-medium flex items-center gap-2">
                              {provider.name}
                              {provider.isFeatured && (
                                <Badge className="bg-gradient-to-r from-accent to-primary text-primary-foreground text-xs">
                                  Featured
                                </Badge>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">{provider.description}</p>
                          </div>
                        </div>
                      </td>

                      {comparisonCriteria.comparePrice && (
                        <td className="p-4 text-center">
                          <div className="space-y-1">
                            <p className="font-medium">{formatPrice(provider.monthlyPrice)}</p>
                            <p className="text-sm text-muted-foreground">{formatPrice(provider.annualPrice / 12)} annually</p>
                            {provider.hasFreeTrial && (
                              <Badge variant="outline" className="text-xs">
                                Free trial
                              </Badge>
                            )}
                          </div>
                        </td>
                      )}

                      {comparisonCriteria.compareRatings && (
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center">
                            {renderStars(provider.overallRating)}
                            <p className="text-xs text-muted-foreground mt-1">{provider.totalRatings} reviews</p>
                          </div>
                        </td>
                      )}

                      {comparisonCriteria.compareFeatures && (
                        <td className="p-4">
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div
                              className={`flex items-center gap-1 ${provider.hasKillSwitch ? 'text-success' : 'text-destructive'}`}
                            >
                              {provider.hasKillSwitch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              Kill Switch
                            </div>
                            <div
                              className={`flex items-center gap-1 ${provider.hasNoLogsPolicy ? 'text-success' : 'text-destructive'}`}
                            >
                              {provider.hasNoLogsPolicy ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              No Logs
                            </div>
                            <div
                              className={`flex items-center gap-1 ${provider.supportsStreaming ? 'text-success' : 'text-destructive'}`}
                            >
                              {provider.supportsStreaming ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              Streaming
                            </div>
                            <div
                              className={`flex items-center gap-1 ${provider.supportsP2P ? 'text-success' : 'text-destructive'}`}
                            >
                              {provider.supportsP2P ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              P2P
                            </div>
                          </div>
                          {provider.maxSimultaneousConnections && (
                            <p className="text-xs text-center mt-2 text-muted-foreground">
                              {provider.maxSimultaneousConnections} devices
                            </p>
                          )}
                        </td>
                      )}

                      {comparisonCriteria.compareServers && (
                        <td className="p-4 text-center">
                          <div className="space-y-1">
                            <p className="font-medium">{provider.serverCount.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{provider.countryCount} countries</p>
                          </div>
                        </td>
                      )}

                      {comparisonCriteria.compareStreaming && (
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {provider.streamingCompatibilities.slice(0, 3).map(compat => (
                              <Badge
                                key={compat.streamingServiceId}
                                variant="outline"
                                className={`text-xs ${getStatusColor(compat.status)}`}
                              >
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(compat.status)}
                                  {compat.streamingServiceName}
                                </span>
                              </Badge>
                            ))}
                            {provider.streamingCompatibilities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{provider.streamingCompatibilities.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                      )}

                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => onProviderClick?.(provider)}>
                            Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onAffiliateClick?.(provider)}
                          >
                            Get Started
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {providers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No VPN providers to compare</h3>
            <p className="text-muted-foreground">Add some VPN providers to see the comparison table.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VpnProviderComparison;
