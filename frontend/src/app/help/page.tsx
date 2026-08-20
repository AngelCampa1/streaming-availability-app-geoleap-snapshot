import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Globe,
  Shield,
  HelpCircle,
  BookOpen,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Help Center',
  description:
    'Get help with GeoLeap. Learn how to search for content, use VPN recommendations, manage your account, and more.',
  keywords: 'help, support, faq, how to use geoleap, streaming search help',
  alternates: {
    canonical: '/help',
  },
  openGraph: {
    title: 'Help Center',
    description:
      'Get help with GeoLeap. Learn how to search for content, use VPN recommendations, and manage your account.',
    url: `${SITE_URL}/help`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Center',
    description:
      'Get help with GeoLeap. Learn how to search, use VPN recommendations, and manage your account.',
  },
};

export default function HelpPage() {
  const helpTopics = [
    {
      icon: Search,
      title: 'Getting Started',
      description: 'Learn the basics of using GeoLeap',
      articles: [
        { title: 'How to search for content', href: '/search' },
        { title: 'Understanding search results', href: '/faq#search-discovery' },
        { title: 'Creating your account', href: '/auth/register' },
        { title: 'Setting up preferences', href: '/faq#account-subscription' },
      ],
    },
    {
      icon: Globe,
      title: 'Global Search',
      description: 'Master global content discovery',
      articles: [
        { title: 'Searching across countries', href: '/countries' },
        { title: 'Using advanced filters', href: '/search' },
        { title: 'Saving search results', href: '/faq#search-discovery' },
        { title: 'Understanding availability', href: '/platforms' },
      ],
    },
    {
      icon: Shield,
      title: 'VPN & Access',
      description: 'Learn about VPN recommendations',
      articles: [
        { title: 'What is a VPN-', href: '/glossary/vpn' },
        { title: 'Choosing a VPN service', href: '/faq#vpn-access' },
        { title: 'Setting up VPN for streaming', href: '/faq#vpn-access' },
        { title: 'VPN best practices', href: '/faq#vpn-access' },
      ],
    },
  ];

  const faqs = [
    {
      question: 'How does GeoLeap work?',
      answer:
        'GeoLeap aggregates streaming availability data from 42 services across 57 countries. Search for a movie or TV show, and we show where it is available worldwide, along with VPN recommendations when a title is not available in your region.',
    },
    {
      question: 'Is GeoLeap free to use?',
      answer:
        'Yes. GeoLeap offers a free tier with unlimited streaming searches. Premium adds advanced filters, real-time notifications, an unlimited watchlist, and priority support.',
    },
    {
      question: 'Do I need a VPN to use GeoLeap?',
      answer:
        'No, you don\'t need a VPN to use GeoLeap. However, we provide VPN recommendations to help you access content that may not be available in your region. Whether you use a VPN is entirely your choice.',
    },
    {
      question: 'How accurate is the availability data?',
      answer:
        'We update our database regularly to ensure accuracy. However, streaming availability can change frequently. We recommend verifying on the streaming service before subscribing or renting.',
    },
    {
      question: 'Can I save content to watch later?',
      answer:
        'Yes! Premium users can create watchlists, save searches, and receive notifications when content becomes available on their preferred services.',
    },
    {
      question: 'How do I manage my subscription?',
      answer:
        'You can manage your subscription in Settings > Billing. You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the end of your current billing period.',
    },
  ];

  return (
    <AppLayout>
      <div className="py-12 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <Badge variant="secondary" className="mx-auto">
            Help Center
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            How can we <span className="text-primary">help you</span>-
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Find answers to common questions, learn how to use GeoLeap features, and get the most out of your
            streaming discovery experience.
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search help articles..."
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button size="lg" className="min-h-[44px]">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Help Topics */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Browse Help Topics</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Explore our comprehensive guides and tutorials
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {helpTopics.map((topic, index) => {
              const Icon = topic.icon;
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{topic.title}</CardTitle>
                    </div>
                    <CardDescription>{topic.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topic.articles.map((article, articleIndex) => (
                      <Link
                        key={articleIndex}
                        href={article.href}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors group"
                      >
                        <span className="text-sm text-foreground group-hover:text-primary">{article.title}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Quick answers to common questions
            </p>
          </div>
          <div className="space-y-4 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground pl-8">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Start Guide */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Quick Start Guide</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Get up and running with GeoLeap in minutes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold">Create Account</h3>
                <p className="text-sm text-muted-foreground">
                  Sign up for free to unlock personalized features and save your preferences.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold">Set Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Choose your region, streaming services, and content preferences.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold">Start Searching</h3>
                <p className="text-sm text-muted-foreground">
                  Use our powerful search to find movies and TV shows across global platforms.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  4
                </div>
                <h3 className="text-lg font-semibold">Save & Watch</h3>
                <p className="text-sm text-muted-foreground">
                  Create watchlists and get notified when content becomes available.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact Support */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-12">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Still Need Help-</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our support team is here to assist you with any questions or issues.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="min-h-[44px]">
                <Link href="/support">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Contact Support
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-[44px]">
                <Link href="/faq">
                  <BookOpen className="h-5 w-5 mr-2" />
                  View All FAQs
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
