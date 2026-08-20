import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Search,
  Shield,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { COUNTRY_COUNT, PLATFORM_COUNT, SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'About GeoLeap - Global Streaming Search Platform',
  description:
    'Learn about GeoLeap, a global streaming search platform that helps you discover where to watch movies and TV shows across different countries and services.',
  keywords: 'about geoleap, streaming search, global content discovery, vpn recommendations',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About GeoLeap | Global Streaming Search Platform',
    description:
      'Discover how GeoLeap helps you find where to watch movies and TV shows across 57 countries and 42 streaming services.',
    url: `${SITE_URL}/about`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About GeoLeap | Global Streaming Search Platform',
    description:
      'Discover how GeoLeap helps you find where to watch movies and TV shows across 57 countries.',
  },
};

export default function AboutPage() {
  const features = [
    {
      icon: Globe,
      title: 'Global Coverage',
      description: 'Search across 57 countries and 42 streaming services worldwide.',
    },
    {
      icon: Search,
      title: 'Smart Search',
      description: 'Advanced search filters including genre, year, rating, and availability.',
    },
    {
      icon: Shield,
      title: 'VPN Integration',
      description: 'Get VPN recommendations to access content from different regions.',
    },
    {
      icon: TrendingUp,
      title: 'Trending Content',
      description: 'Discover what\'s popular globally and in specific regions.',
    },
    {
      icon: Users,
      title: 'Personalized Experience',
      description: 'Customized recommendations based on your preferences and location.',
    },
    {
      icon: Zap,
      title: 'Real-time Updates',
      description: 'Stay informed with instant notifications when content becomes available.',
    },
  ];

  const stats = [
    { label: 'Countries Covered', value: String(COUNTRY_COUNT) },
    { label: 'Streaming Services', value: String(PLATFORM_COUNT) },
  ];

  return (
    <AppLayout>
      <div className="py-12 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <Badge variant="secondary" className="mx-auto">
            About GeoLeap
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Your Gateway to Global
            <br />
            <span className="text-primary">Streaming Content</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            GeoLeap is the leading platform for discovering where to watch your favorite movies and TV shows
            across different countries and streaming services worldwide.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="min-h-[44px]">
              <Link href="/search">
                <Search className="h-5 w-5 mr-2" />
                Start Searching
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-[44px]">
              <Link href="/pricing">
                View Pricing
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Mission Section */}
        <section className="space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Our Mission</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We believe everyone should have access to the content they love, regardless of their location.
              GeoLeap breaks down geographical barriers and helps you discover streaming content from around
              the world.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">What We Offer</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Powerful features designed to enhance your streaming discovery experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Finding your favorite content across global streaming services is simple
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold">Search</h3>
                <p className="text-muted-foreground">
                  Enter the name of any movie, TV show, or actor you want to watch.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold">Discover</h3>
                <p className="text-muted-foreground">
                  See where the content is available across different countries and streaming services.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold">Watch</h3>
                <p className="text-muted-foreground">
                  Access the content through your preferred service or use VPN recommendations.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-12">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Explore Global Content-
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover and access streaming content from around the world with GeoLeap.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="min-h-[44px]">
                <Link href="/auth/register">
                  Get Started Free
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-[44px]">
                <Link href="/help">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
