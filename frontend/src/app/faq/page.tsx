import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Search, MessageCircle, BookOpen } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { JsonLd } from '@/components/seo/JsonLd';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { buildFaqSections } from '@/lib/seo/related-links';
import { SITE_URL } from '@/lib/seo/site-config';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Find answers to common questions about GeoLeap, global streaming search, VPN usage, subscriptions, and more.',
  keywords: 'faq, frequently asked questions, geoleap help, streaming questions, vpn faq',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'FAQ - Frequently Asked Questions',
    description:
      'Find answers to common questions about GeoLeap, global streaming search, VPN usage, and subscriptions.',
    url: `${SITE_URL}/faq`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ - Frequently Asked Questions',
    description:
      'Find answers to common questions about GeoLeap, global streaming search, and VPN usage.',
  },
};

export default function FAQPage() {
  const faqCategories = [
    {
      category: 'General',
      questions: [
        {
          question: 'What is GeoLeap?',
          answer:
            'GeoLeap is a global streaming search platform that helps you discover where to watch movies and TV shows across different countries and streaming services. We track 42 streaming services in 57 countries, making it easier to find content availability worldwide.',
        },
        {
          question: 'Is GeoLeap free?',
          answer:
            'Yes. GeoLeap offers a free tier with unlimited streaming searches. Premium adds an ad-free experience, an unlimited watchlist, real-time notifications, and priority support.',
        },
        {
          question: 'How does GeoLeap make money?',
          answer:
            'GeoLeap operates on a freemium model. We offer a free tier for casual users and premium subscription plans for power users who need advanced features. We also earn affiliate commissions when users sign up for streaming services through our platform.',
        },
      ],
    },
    {
      category: 'Search & Discovery',
      questions: [
        {
          question: 'How do I search for content?',
          answer:
            'Simply enter the name of any movie, TV show, or actor in the search bar. You can use advanced filters to narrow down results by genre, year, rating, country, and streaming service. Our smart search also supports typo correction and autocomplete suggestions.',
        },
        {
          question: 'How accurate is the availability data?',
          answer:
            'We update our database regularly from multiple reliable sources to ensure accuracy. However, streaming availability can change frequently due to licensing agreements. We recommend verifying on the streaming service website before subscribing or renting content.',
        },
        {
          question: 'Can I save content for later?',
          answer:
            'Yes! Premium users can create watchlists to save content they want to watch later. You\'ll also receive notifications when content on your watchlist becomes available on your preferred streaming services.',
        },
        {
          question: 'What are trending searches?',
          answer:
            'Trending searches show what content other users are searching for in real-time. This helps you discover popular movies and TV shows that are currently in demand globally or in specific regions.',
        },
      ],
    },
    {
      category: 'VPN & Access',
      questions: [
        {
          question: 'Do I need a VPN to use GeoLeap?',
          answer:
            'No, you don\'t need a VPN to use GeoLeap. Our service shows you streaming availability across different countries without requiring a VPN. However, we provide VPN recommendations to help you access content that may not be available in your region if you choose to use one.',
        },
        {
          question: 'Is using a VPN legal?',
          answer:
            'Using a VPN is legal in most countries, but the legality varies by jurisdiction. Some streaming services\' terms of service prohibit VPN use to bypass geographical restrictions. We recommend reviewing your streaming service\'s terms and your local laws before using a VPN.',
        },
        {
          question: 'Which VPN should I use?',
          answer:
            'We provide recommendations based on server locations, speed, reliability, and streaming service compatibility. The best VPN depends on your specific needs, budget, and the content you want to access. Premium users get personalized VPN recommendations.',
        },
        {
          question: 'Does GeoLeap provide VPN services?',
          answer:
            'No, GeoLeap does not provide VPN services. We are a content discovery platform that helps you find where content is available. We recommend third-party VPN services that work well for streaming, but you\'ll need to subscribe to them separately.',
        },
      ],
    },
    {
      category: 'Account & Subscription',
      questions: [
        {
          question: 'How do I create an account?',
          answer:
            'Click the "Sign Up" button in the top navigation, then enter your email, password, and basic information. You can also sign up using Google or Apple for faster registration.',
        },
        {
          question: 'What payment methods do you accept?',
          answer:
            'We accept all major credit cards (Visa, Mastercard, American Express), debit cards, and digital wallets. Payments are processed securely through Stripe.',
        },
        {
          question: 'Can I cancel my subscription?',
          answer:
            'Yes, you can cancel your subscription at any time from Settings > Billing. When you cancel, you\'ll retain access to premium features until the end of your current billing period. After that, you\'ll be downgraded to the free tier.',
        },
        {
          question: 'Do you offer refunds?',
          answer:
            'We offer a 14-day money-back guarantee for new premium subscriptions. If you\'re not satisfied within the first 14 days, contact our support team for a full refund. Refunds for renewals are evaluated on a case-by-case basis.',
        },
        {
          question: 'Can I change my plan?',
          answer:
            'Yes! You can upgrade or downgrade your plan at any time from Settings > Billing. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing period.',
        },
      ],
    },
    {
      category: 'Privacy & Security',
      questions: [
        {
          question: 'How do you protect my data?',
          answer:
            'We take privacy seriously. All data is encrypted in transit and at rest. We use industry-standard security practices, regular security audits, and comply with GDPR and other privacy regulations. We never sell your personal information.',
        },
        {
          question: 'What data do you collect?',
          answer:
            'We collect basic account information (email, name), search history, preferences, and usage analytics to improve our service. You can view, export, or delete your data at any time from Settings > Privacy.',
        },
        {
          question: 'Do you share my data with streaming services?',
          answer:
            'No, we do not share your personal data with streaming services. When you click on a streaming link, that interaction is between you and the streaming service directly.',
        },
      ],
    },
    {
      category: 'Technical',
      questions: [
        {
          question: 'Which browsers are supported?',
          answer:
            'GeoLeap works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version of your browser for the best experience.',
        },
        {
          question: 'Is there a mobile app?',
          answer:
            'We\'re currently developing native mobile apps for iOS and Android. In the meantime, our website is fully responsive and works great on mobile browsers.',
        },
        {
          question: 'Why am I getting errors?',
          answer:
            'If you\'re experiencing errors, try clearing your browser cache, disabling ad blockers, or using a different browser. If the issue persists, contact our support team with details about the error.',
        },
      ],
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqCategories.flatMap((category) =>
      category.questions.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      }))
    ),
  };

  return (
    <AppLayout>
      <JsonLd data={faqSchema} />
      <div className="py-12 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <Badge variant="secondary" className="mx-auto">
            FAQ
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Frequently Asked <span className="text-primary">Questions</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Find quick answers to common questions about GeoLeap, streaming search, and our services.
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search FAQs..."
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button size="lg" className="min-h-[44px]">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        {faqCategories.map((category, categoryIndex) => (
          <section key={categoryIndex} className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{category.category}</h2>
              <div className="h-1 w-20 bg-primary rounded"></div>
            </div>
            <div className="space-y-4">
              {category.questions.map((faq, faqIndex) => (
                <Card key={faqIndex}>
                  <CardHeader>
                    <CardTitle className="flex items-start gap-3 text-lg">
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
        ))}

        {/* Still Have Questions */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-12">
          <div className="text-center space-y-6">
            <HelpCircle className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Still Have Questions-</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Can&apos;t find the answer you&apos;re looking for- Our support team is here to help.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="min-h-[44px]">
                <Link href="/support">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Contact Support
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-[44px]">
                <Link href="/help">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Visit Help Center
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RelatedLinks sections={buildFaqSections()} />
      </div>
    </AppLayout>
  );
}
