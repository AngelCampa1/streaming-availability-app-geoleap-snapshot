import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Filter, ArrowRight, Zap, Shield, DollarSign, Globe2, Smartphone, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface VpnProvider {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  hasFreeTrial: boolean;
  freeTrialDays?: number;
  overallRating?: number;
  totalRatings: number;
  isFeatured: boolean;
  logoUrl?: string;
  affiliateUrl?: string;
  websiteUrl: string;
  hasKillSwitch: boolean;
  hasNoLogsPolicy: boolean;
  supportsStreaming: boolean;
  supportsP2P: boolean;
  serverCount: number;
  countryCount: number;
}

const MobileVpnSelection: React.FC = () => {
  const { user: _user } = useAuth();
  const [providers, setProviders] = useState<VpnProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { id: 'featured', label: 'Featured', icon: Star },
    { id: 'streaming', label: 'Streaming', icon: Smartphone },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'value', label: 'Best Value', icon: DollarSign },
    { id: 'speed', label: 'Fastest', icon: Zap },
  ];

  useEffect(() => {
    fetchProviders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      let endpoint = '/api/vpnguidance/providers';
      const params = new URLSearchParams();

      switch (selectedCategory) {
        case 'featured':
          params.append('featured', 'true');
          break;
        case 'streaming':
          params.append('supportsStreaming', 'true');
          break;
        case 'value':
          params.append('maxPrice', '15');
          break;
      }

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch providers');

      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (monthly: number, annual: number) => {
    const monthlyFromAnnual = annual / 12;
    if (monthlyFromAnnual < monthly) {
      return {
        price: monthlyFromAnnual,
        label: 'annual',
        savings: Math.round(((monthly - monthlyFromAnnual) / monthly) * 100),
      };
    }
    return { price: monthly, label: 'monthly', savings: 0 };
  };

  const renderProviderCard = (provider: VpnProvider) => {
    const pricing = formatPrice(provider.monthlyPrice, provider.annualPrice);

    return (
      <Card key={provider.id} className="mb-4">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              {provider.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={provider.logoUrl} alt={provider.name} className="w-10 h-10 rounded-lg object-cover" />
              )}
              <div>
                <h3 className="font-semibold text-lg">{provider.name}</h3>
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

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{provider.description}</p>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted rounded-lg p-2">
              <div className="flex items-center justify-between">
                <Globe2 className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Servers</span>
              </div>
              <p className="font-semibold text-sm mt-1">{provider.serverCount.toLocaleString()}</p>
            </div>
            <div className="bg-muted rounded-lg p-2">
              <div className="flex items-center justify-between">
                <Globe2 className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Countries</span>
              </div>
              <p className="font-semibold text-sm mt-1">{provider.countryCount}</p>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-1 mb-4">
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
                <Smartphone className="w-3 h-3 mr-1" />
                Streaming
              </Badge>
            )}
            {provider.supportsP2P && (
              <Badge variant="outline" className="text-xs">
                P2P
              </Badge>
            )}
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Starting from</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-xl font-bold text-success">${pricing.price.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">/{pricing.label}</span>
                  {pricing.savings > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Save {pricing.savings}%
                    </Badge>
                  )}
                </div>
              </div>
              {provider.hasFreeTrial && (
                <div className="text-right">
                  <Badge variant="outline" className="text-xs mb-1">
                    Free Trial
                  </Badge>
                  <p className="text-xs text-muted-foreground">{provider.freeTrialDays} days</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button className="flex-1" size="sm" asChild>
              <a href={provider.affiliateUrl || provider.websiteUrl} target="_blank" rel="noopener noreferrer">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={provider.websiteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 bg-muted rounded"></div>
                <div className="h-12 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-foreground">VPN Selection</h1>
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-1" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96">
                <SheetHeader>
                  <SheetTitle>Filter VPN Providers</SheetTitle>
                  <SheetDescription>Customize your VPN search criteria</SheetDescription>
                </SheetHeader>
                <div className="py-6">
                  <p className="text-sm text-muted-foreground">Filters coming soon...</p>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-5">
              {categories.map(category => {
                const Icon = category.icon;
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex flex-col items-center gap-1 h-auto py-2"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{category.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4">
          {loading ? (
            renderLoadingSkeleton()
          ) : providers.length > 0 ? (
            <div className="space-y-4">{providers.map(renderProviderCard)}</div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No VPN providers found for the selected category.</p>
                <Button onClick={() => setSelectedCategory('featured')} className="mt-4" variant="outline">
                  View Featured Providers
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Quick Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" size="sm">
            Compare Selected
          </Button>
          <Button className="flex-1" size="sm">
            Get Recommendations
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileVpnSelection;
