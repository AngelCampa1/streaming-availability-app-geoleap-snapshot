import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Shield, Zap, DollarSign, Globe, Monitor, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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

interface VpnRecommendation {
  recommendedProviders: VpnProvider[];
  recommendationReason: string;
  recommendationType:
    | 'BestOverall'
    | 'BestValue'
    | 'BestForStreaming'
    | 'BestForP2P'
    | 'BestForBeginners'
    | 'BestForSecurity'
    | 'BestForSpeed';
  confidenceScore: number;
  criteria: Record<string, unknown>;
}

type RecommendationType =
  | 'BestOverall'
  | 'BestValue'
  | 'BestForStreaming'
  | 'BestForP2P'
  | 'BestForBeginners'
  | 'BestForSecurity'
  | 'BestForSpeed';

const VpnRecommendations: React.FC = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<VpnRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<RecommendationType>('BestOverall');
  const [budget, _setBudget] = useState<number>(25);
  const [streamingServices, _setStreamingServices] = useState<string[]>(['Netflix', 'Disney Plus']);

  const fetchRecommendations = async (type: RecommendationType) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type,
        ...(budget && { budget: budget.toString() }),
        ...(streamingServices.length > 0 && { streamingServices: streamingServices.join(',') }),
      });

      const response = await fetch(`/api/vpnguidance/recommendations?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecommendations(selectedType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedType, budget, streamingServices]);

  const getStatusBadgeVariant = (status: StreamingCompatibility['status']) => {
    switch (status) {
      case 'WorksReliably':
        return 'default';
      case 'WorksSometimes':
        return 'secondary';
      case 'DoesNotWork':
        return 'destructive';
      case 'Blocked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: StreamingCompatibility['status']) => {
    switch (status) {
      case 'WorksReliably':
        return 'Works Reliably';
      case 'WorksSometimes':
        return 'Works Sometimes';
      case 'DoesNotWork':
        return 'Does Not Work';
      case 'Blocked':
        return 'Blocked';
      default:
        return 'Not Tested';
    }
  };

  const formatPrice = (monthly: number, annual: number) => {
    const monthlyFromAnnual = annual / 12;
    return monthlyFromAnnual < monthly
      ? `$${monthlyFromAnnual.toFixed(2)}/mo (annual) • $${monthly.toFixed(2)}/mo (monthly)`
      : `$${monthly.toFixed(2)}/mo`;
  };

  // Helper function to calculate effectiveness score (extracted to fix Rules of Hooks)
  const calculateEffectivenessScore = (compatibilities: StreamingCompatibility[]) => {
    if (!compatibilities.length) return 0;
    const workingCount = compatibilities.filter(c => c.status === 'WorksReliably').length;
    return Math.round((workingCount / compatibilities.length) * 100);
  };

  const renderProviderCard = (provider: VpnProvider) => {
    const effectivenessScore = calculateEffectivenessScore(provider.streamingCompatibilities);

    return (
      <Card key={provider.id} className="h-full flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {provider.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={provider.logoUrl} alt={provider.name} className="w-12 h-12 rounded-lg object-cover" />
              )}
              <div>
                <CardTitle className="text-xl">{provider.name}</CardTitle>
                {provider.overallRating && (
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="ml-1 text-sm font-medium">{provider.overallRating}</span>
                    <span className="ml-1 text-sm text-muted-foreground">({provider.totalRatings})</span>
                  </div>
                )}
              </div>
            </div>
            {provider.isFeatured && <Badge variant="secondary">Featured</Badge>}
          </div>
          <CardDescription className="mt-3">{provider.description}</CardDescription>
        </CardHeader>

        <CardContent className="flex-grow space-y-4">
          {/* Pricing */}
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-success mr-1" />
                <span className="font-medium">Pricing</span>
              </div>
              {provider.hasFreeTrial && (
                <Badge variant="outline" className="text-xs">
                  {provider.freeTrialDays} days free
                </Badge>
              )}
            </div>
            <p className="text-sm">{formatPrice(provider.monthlyPrice, provider.annualPrice)}</p>
          </div>

          {/* Key Features */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Servers
              </span>
              <span className="font-medium">
                {provider.serverCount.toLocaleString()} servers in {provider.countryCount} countries
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                Devices
              </span>
              <span className="font-medium">{provider.maxSimultaneousConnections || 'Unlimited'} simultaneous</span>
            </div>

            {/* Security Features */}
            <div className="flex flex-wrap gap-2 mt-3">
              {provider.hasKillSwitch && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Kill Switch
                </Badge>
              )}
              {provider.hasNoLogsPolicy && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  No Logs
                </Badge>
              )}
              {provider.supportsStreaming && (
                <Badge variant="outline" className="text-xs">
                  <Monitor className="w-3 h-3 mr-1" />
                  Streaming
                </Badge>
              )}
              {provider.supportsP2P && (
                <Badge variant="outline" className="text-xs">
                  P2P Friendly
                </Badge>
              )}
            </div>

            {/* Platform Support */}
            <div className="mt-3">
              <p className="text-sm text-muted-foreground mb-2">Supported Platforms:</p>
              <div className="flex flex-wrap gap-1">
                {provider.supportedPlatforms.map(platform => (
                  <Badge key={platform} variant="secondary" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Streaming Effectiveness */}
            {provider.streamingCompatibilities.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Streaming Effectiveness</span>
                  <span className="text-sm text-muted-foreground">{effectivenessScore}%</span>
                </div>
                <Progress value={effectivenessScore} className="h-2" />
                <div className="flex flex-wrap gap-1 mt-2">
                  {provider.streamingCompatibilities.slice(0, 4).map(compat => (
                    <Badge
                      key={compat.streamingServiceId}
                      variant={getStatusBadgeVariant(compat.status)}
                      className="text-xs"
                    >
                      {compat.streamingServiceName}: {getStatusText(compat.status)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex gap-2 pt-4">
          <Button className="flex-1" asChild>
            <a href={provider.affiliateUrl || provider.websiteUrl} target="_blank" rel="noopener noreferrer">
              Get Started
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer">
              Learn More
            </a>
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const recommendationTabs = [
    { value: 'BestOverall', label: 'Best Overall', icon: Star },
    { value: 'BestValue', label: 'Best Value', icon: DollarSign },
    { value: 'BestForStreaming', label: 'Streaming', icon: Monitor },
    { value: 'BestForP2P', label: 'P2P/Torrenting', icon: Globe },
    { value: 'BestForBeginners', label: 'Beginners', icon: Smartphone },
    { value: 'BestForSecurity', label: 'Security', icon: Shield },
    { value: 'BestForSpeed', label: 'Speed', icon: Zap },
  ];

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please sign in to view VPN recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">VPN Recommendations</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover the best VPN services tailored to your streaming and privacy needs. Our recommendations are based on
          real-world testing and user reviews.
        </p>
      </div>

      <Tabs value={selectedType} onValueChange={value => setSelectedType(value as RecommendationType)}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
          {recommendationTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1 text-xs lg:text-sm">
                <Icon className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden lg:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {recommendationTabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="h-96">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-5/6"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {error && (
              <Card className="bg-error/10 border-error/20">
                <CardContent className="p-6">
                  <p className="text-error">{error}</p>
                  <Button onClick={() => fetchRecommendations(selectedType)} className="mt-4" variant="outline">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}

            {recommendations && (
              <div className="space-y-6">
                <div className="bg-primary/5 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">
                        {recommendations.recommendationReason}
                      </h3>
                      <div className="flex items-center mt-2 space-x-4 text-sm text-primary">
                        <span>Confidence: {Math.round(recommendations.confidenceScore * 100)}%</span>
                        <span>•</span>
                        <span>{recommendations.recommendedProviders.length} providers</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.recommendedProviders.map(renderProviderCard)}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default VpnRecommendations;
