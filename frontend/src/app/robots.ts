import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site-config';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

  const privateDisallow = [
    '/api/',
    '/admin/',
    '/auth/',
    '/payment/',
    '/account/',
    '/settings/',
    '/onboarding/',
    '/dashboard/',
    '/watchlist',
    '/preferences',
    '/seo-dashboard',
    '/api-test',
    '/logo-test',
  ];

  const pseoAllow = [
    '/platforms/',
    '/countries/',
    '/compare/',
    '/glossary/',
    '/blog/',
    '/sports/',
    '/genres/',
    '/guides/',
    '/how-to-watch/',
    '/llms.txt',
    '/llms-full.txt',
    '/md/',
    '/feed.xml',
    '/feed.json',
    '/.well-known/ai.txt',
  ];

  const contentAllow = [
    '/',
    '/about',
    '/pricing',
    '/faq',
    '/vpn-guidance',
    '/support',
    '/search',
    ...pseoAllow,
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          ...privateDisallow,
          '*/search?*',
          '/search?q=',
        ],
      },
      // Google
      {
        userAgent: 'Googlebot',
        allow: ['/', ...pseoAllow],
        disallow: privateDisallow,
      },
      // Bing
      {
        userAgent: 'Bingbot',
        allow: ['/', ...pseoAllow],
        disallow: privateDisallow,
        crawlDelay: 2,
      },
      // AI bots - expanded access to content pages
      {
        userAgent: 'GPTBot',
        allow: contentAllow,
        disallow: privateDisallow,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: contentAllow,
        disallow: privateDisallow,
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: contentAllow,
        disallow: privateDisallow,
      },
      {
        userAgent: 'ClaudeBot',
        allow: contentAllow,
        disallow: privateDisallow,
      },
      {
        userAgent: 'anthropic-ai',
        allow: contentAllow,
        disallow: privateDisallow,
      },
      {
        userAgent: 'PerplexityBot',
        allow: contentAllow,
        disallow: privateDisallow,
      },
      {
        userAgent: 'Applebot',
        allow: contentAllow,
        disallow: privateDisallow,
      },
      // Block training-only crawlers
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'TikTokSpider',
        disallow: ['/'],
      },
      {
        userAgent: 'Bytespider',
        disallow: ['/'],
      },
      {
        userAgent: 'SemrushBot',
        disallow: ['/'],
      },
      {
        userAgent: 'AhrefsBot',
        disallow: ['/'],
      },
      {
        userAgent: 'SERankingBacklinksBot',
        disallow: ['/'],
      },
      // Social media crawlers - allow content for rich previews
      {
        userAgent: [
          'facebookexternalhit',
          'Twitterbot',
          'LinkedInBot',
          'WhatsApp',
          'TelegramBot',
          'SkypeUriPreview',
          'SlackBot',
          'DiscordBot',
        ],
        allow: [
          '/',
          '/content/',
          '/search',
          '/about',
          '/pricing',
          '/platforms/',
          '/countries/',
          '/compare/',
          '/glossary/',
          '/blog/',
          '/sports/',
          '/genres/',
          '/guides/',
          '/how-to-watch/',
        ],
        disallow: privateDisallow,
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/image-sitemap.xml`,
      `${baseUrl}/news-sitemap.xml`,
    ],
    host: baseUrl,
  };
}
