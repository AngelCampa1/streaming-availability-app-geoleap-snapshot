'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VpnRecommendations from '@/components/vpn/VpnRecommendations';
import VpnComparison from '@/components/vpn/VpnComparison';
import MobileVpnSelection from '@/components/vpn/MobileVpnSelection';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Shield, GitCompare, Star, Users, Zap, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildVpnGuidanceSections } from '@/lib/seo/related-links';

const VpnGuidancePage: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTab, setActiveTab] = useState('recommendations');

  // Show mobile-optimized version on mobile devices
  if (isMobile) {
    return <MobileVpnSelection />;
  }

  const features = [
    {
      icon: Star,
      title: 'Smart Recommendations',
      description: 'VPN suggestions based on your selected streaming needs and preferences',
    },
    {
      icon: GitCompare,
      title: 'Side-by-Side Comparison',
      description: 'Compare up to 5 VPN providers on features, pricing, and streaming compatibility',
    },
    {
      icon: Shield,
      title: 'Security & Privacy Focus',
      description: 'Detailed analysis of security features, no-logs policies, and privacy protection',
    },
    {
      icon: Zap,
      title: 'Compatibility Checks',
      description: 'Streaming access notes, provider features, and practical setup constraints',
    },
    {
      icon: Users,
      title: 'User Fit',
      description: 'Recommendations shaped around devices, locations, budget, and privacy needs',
    },
    {
      icon: DollarSign,
      title: 'Best Value Analysis',
      description: 'Find the best deals and value propositions for your budget',
    },
  ];

  const streamingServices = [
    { name: 'Netflix', compatibility: 'High' },
    { name: 'Disney Plus', compatibility: 'High' },
    { name: 'Amazon Prime', compatibility: 'High' },
    { name: 'Hulu', compatibility: 'High' },
    { name: 'BBC iPlayer', compatibility: 'High' },
    { name: 'HBO Max', compatibility: 'High' },
  ];

  return (
    <AppLayout showBreadcrumbs={false} maxWidth="full">
      <div className="min-h-screen bg-muted">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary via-secondary to-primary-hover text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Find a Streaming <span className="text-warning">VPN</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-primary-foreground">
              Compare VPN services for streaming, privacy, and security with recommendations based on provider
              features, country coverage, device support, and budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => setActiveTab('recommendations')}
                size="lg"
                className="bg-warning hover:bg-warning/90 text-black font-semibold"
              >
                Get Recommendations
              </Button>
              <Button
                onClick={() => setActiveTab('comparison')}
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-black font-semibold"
              >
                Compare Providers
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose Our VPN Guidance-</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We compare VPN providers across performance signals, privacy features, device support, and streaming
            compatibility so the recommendation matches how you actually watch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Streaming Compatibility Stats */}
      <div className="bg-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Streaming Service Compatibility</h2>
            <p className="text-lg text-muted-foreground">
              Compatibility notes across major streaming platforms
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {streamingServices.map((service, index) => (
              <div key={index} className="text-center">
                <div className="bg-muted rounded-xl p-4 mb-3">
                  <div className="text-lg font-bold text-success">{service.compatibility}</div>
                  <div className="text-sm text-muted-foreground">compatibility</div>
                </div>
                <p className="font-medium text-foreground">{service.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Comparison Tool
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="mt-0">
            <VpnRecommendations />
          </TabsContent>

          <TabsContent value="comparison" className="mt-0">
            <VpnComparison />
          </TabsContent>
        </Tabs>
      </div>

      {/* Trust Indicators */}
      <div className="bg-muted py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">50+</div>
              <p className="text-muted-foreground">VPN Providers Analyzed</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-success mb-2">200+</div>
              <p className="text-muted-foreground">Streaming Services Covered</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-warning mb-2">50+</div>
              <p className="text-muted-foreground">Countries Supported</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-secondary to-primary text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Compare VPN Options-</h2>
          <p className="text-xl mb-8 text-primary-foreground">
            Answer a few questions about your devices, location needs, and budget to get a practical shortlist.
          </p>
          <Button
            onClick={() => setActiveTab('recommendations')}
            size="lg"
            className="bg-warning hover:bg-warning/90 text-black font-semibold"
          >
            Get Started Now
          </Button>
        </div>
      </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RelatedLinks sections={buildVpnGuidanceSections()} />
      </div>
    </AppLayout>
  );
};

export default VpnGuidancePage;
