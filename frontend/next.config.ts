import type { NextConfig } from "next";
import os from "os";
import path from "path";

// Bundle analyzer configuration
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Resource-aware configuration
const isResourceConstrained = () => {
  const totalMemory = os.totalmem() / (1024 * 1024 * 1024); // GB
  const freeMemory = os.freemem() / (1024 * 1024 * 1024); // GB
  
  // Consider resource constrained if:
  // - Less than 8GB total memory OR
  // - Less than 2GB free memory OR
  // - Running in CI/container environment
  return totalMemory < 8 || freeMemory < 2 || Boolean(process.env.CI) || Boolean(process.env.CONTAINER);
};

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd()),
  poweredByHeader: false,
  trailingSlash: false,
  
  // Strip console statements in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn for monitoring
    } : false,
  },
  
  // Disable TypeScript build errors in resource-constrained environments  
  typescript: {
    ignoreBuildErrors: isResourceConstrained(),
  },
  
  // Performance optimizations - scaled based on available resources
  experimental: {
    // Reduce package optimizations in resource-constrained environments
    optimizePackageImports: isResourceConstrained() ? [
      'lucide-react'
    ] : [
      'lucide-react',
      'lodash',
      '@tanstack/react-query'
    ],
  },
  
  // Webpack fallback configuration for resource-constrained environments
  webpack: (config, { dev }) => {
    if (isResourceConstrained()) {
      // Reduce memory usage
      config.optimization = {
        ...config.optimization,
        concatenateModules: false,
        minimize: !dev,
        // Limit parallel processing
        splitChunks: {
          ...config.optimization?.splitChunks,
          maxAsyncRequests: 5,
          maxInitialRequests: 3,
        },
      };
      
      // Reduce worker threads
      if (config.optimization?.splitChunks) {
        config.optimization.splitChunks.maxAsyncRequests = 5;
      }
    }
    
    return config;
  },
  
  // Logging for debugging SSR issues
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Image optimization for mobile
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [320, 420, 768, 1024, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },
  
  async headers() {
    return [
      {
        // Immutable cache for hashed Next.js static assets (JS/CSS bundles)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // CDN cache for marketing/pSEO pages - 24h TTL with 12h stale-while-revalidate
        source: '/(platforms|countries|compare|unblock|sports|genres|glossary|guides|blog|how-to-watch|faq|features)(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=86400, stale-while-revalidate=43200',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com"), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: Allow self, inline (for Next.js), eval (ONLY for dev), Stripe
              `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''} https://js.stripe.com https://*.google.com https://*.googlesyndication.com https://pagead2.googlesyndication.com https://*.googletagservices.com https://*.doubleclick.net https://*.facebook.com https://*.twitter.com https://*.github.com https://*.linkedin.com https://*.discord.com https://appleid.cdn-apple.com https://static.cloudflareinsights.com https://challenges.cloudflare.com`,
              // Styles: Allow self and inline for CSS-in-JS and Tailwind
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: Allow self, data URIs, HTTPS images (for external content/CDNs)
              "img-src 'self' data: https: blob:",
              // Fonts: Allow self and Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
              // API connections: Local dev servers, production API, Stripe, OAuth providers, WebSockets
              `connect-src 'self' http://localhost:8020 http://localhost:5000 http://localhost:5001 https://localhost:5001 https://localhost:5115 ${process.env.NODE_ENV === 'production' ? 'https://api.geoleap.com https://api.geoleap.app' : ''} https://js.stripe.com https://api.stripe.com https://*.google.com https://*.googlesyndication.com https://*.googletagservices.com https://*.doubleclick.net https://*.google-analytics.com https://*.facebook.com https://*.twitter.com https://*.github.com https://*.linkedin.com https://*.discord.com https://*.ingest.sentry.io https://cloudflareinsights.com https://challenges.cloudflare.com ws: wss:`,
              // Frames: Stripe payment forms, OAuth popups
              "frame-src https://js.stripe.com https://*.google.com https://*.googlesyndication.com https://*.googletagservices.com https://*.doubleclick.net https://googleads.g.doubleclick.net https://*.facebook.com https://*.twitter.com https://*.github.com https://*.linkedin.com https://*.discord.com https://challenges.cloudflare.com",
              // Prevent embedding in iframes
              "frame-ancestors 'none'",
              // Media: Allow self and HTTPS
              "media-src 'self' https: blob:",
              // Object/embed: Block Flash and other plugins
              "object-src 'none'",
              // Base URI: Restrict to self
              "base-uri 'self'",
              // Form actions: Only allow same-origin forms
              "form-action 'self'",
              // Upgrade insecure requests in production
              ...(process.env.NODE_ENV === 'production' ? ["upgrade-insecure-requests"] : [])
            ].filter(Boolean).join('; ')
          }
        ]
      }
    ];
  },

  async redirects() {
    return [
      {
        source: '/health',
        destination: '/api/health',
        permanent: false
      }
    ];
  },

  // Proxy API requests to backend to avoid third-party cookie issues
  // This makes cookies first-party since they go through the same origin
  //
  // NOTE: /api/auth/* and /api/payment/* are handled by Next.js route handlers
  // in /app/api/auth/[...path]/route.ts and /app/api/payment/[...path]/route.ts
  // because Next.js rewrites DON'T forward Set-Cookie headers properly.
  // Route handlers DO forward cookies correctly via getSetCookie() API.
  async rewrites() {
    // INTERNAL_API_URL is for container-to-container communication (e.g., http://geoleap-api:8080)
    // Falls back to NEXT_PUBLIC_API_URL or localhost for development
    const apiUrl = process.env.INTERNAL_API_URL
      || process.env.NEXT_PUBLIC_API_URL
      || 'http://localhost:8020';
    return [
      // NOTE: /api/auth/*, /api/payment/*, and /api/dashboard/* are NOT included here
      // They use route handlers for proper cookie forwarding
      {
        source: '/api/content/:path*',
        destination: `${apiUrl}/api/content/:path*`,
      },
      {
        source: '/api/streaming/:path*',
        destination: `${apiUrl}/api/streaming/:path*`,
      },
      {
        source: '/api/search/:path*',
        destination: `${apiUrl}/api/search/:path*`,
      },
      {
        source: '/api/watchlist/:path*',
        destination: `${apiUrl}/api/watchlist/:path*`,
      },
      {
        source: '/api/subscription/:path*',
        destination: `${apiUrl}/api/subscription/:path*`,
      },
      {
        source: '/api/user/:path*',
        destination: `${apiUrl}/api/user/:path*`,
      },
      {
        source: '/api/user-profile/:path*',
        destination: `${apiUrl}/api/user-profile/:path*`,
      },
      {
        source: '/api/feedback/:path*',
        destination: `${apiUrl}/api/feedback/:path*`,
      },
      {
        source: '/api/usersubscriptions/:path*',
        destination: `${apiUrl}/api/usersubscriptions/:path*`,
      },
      {
        source: '/api/vpn/:path*',
        destination: `${apiUrl}/api/vpn/:path*`,
      },
      {
        source: '/api/notifications/:path*',
        destination: `${apiUrl}/api/notifications/:path*`,
      },
      {
        source: '/api/analytics/:path*',
        destination: `${apiUrl}/api/analytics/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${apiUrl}/api/admin/:path*`,
      },
      {
        source: '/api/webhooks/:path*',
        destination: `${apiUrl}/api/webhooks/:path*`,
      },
      {
        source: '/api/security/:path*',
        destination: `${apiUrl}/api/security/:path*`,
      },
      // BUG FIX: Added missing API rewrites discovered during bug hunting
      {
        source: '/api/business/:path*',
        destination: `${apiUrl}/api/business/:path*`,
      },
      {
        source: '/api/customersupportanalytics/:path*',
        destination: `${apiUrl}/api/customersupportanalytics/:path*`,
      },
      {
        source: '/api/friends/:path*',
        destination: `${apiUrl}/api/friends/:path*`,
      },
      {
        source: '/api/growth-analytics/:path*',
        destination: `${apiUrl}/api/growth-analytics/:path*`,
      },
      {
        source: '/api/monitoring/:path*',
        destination: `${apiUrl}/api/monitoring/:path*`,
      },
      {
        source: '/api/oauth/:path*',
        destination: `${apiUrl}/api/oauth/:path*`,
      },
      {
        source: '/api/social-auth/:path*',
        destination: `${apiUrl}/api/social-auth/:path*`,
      },
      {
        source: '/api/social-feed/:path*',
        destination: `${apiUrl}/api/social-feed/:path*`,
      },
      {
        source: '/api/social-notifications/:path*',
        destination: `${apiUrl}/api/social-notifications/:path*`,
      },
      {
        source: '/api/social-recommendations/:path*',
        destination: `${apiUrl}/api/social-recommendations/:path*`,
      },
      {
        source: '/api/social-sharing/:path*',
        destination: `${apiUrl}/api/social-sharing/:path*`,
      },
      {
        source: '/api/support/:path*',
        destination: `${apiUrl}/api/support/:path*`,
      },
      {
        source: '/api/vpnguidance/:path*',
        destination: `${apiUrl}/api/vpnguidance/:path*`,
      },
      {
        source: '/api/recommendations/:path*',
        destination: `${apiUrl}/api/recommendations/:path*`,
      },
      {
        source: '/api/preferences/:path*',
        destination: `${apiUrl}/api/preferences/:path*`,
      },
      {
        source: '/api/filters/:path*',
        destination: `${apiUrl}/api/filters/:path*`,
      },
      {
        source: '/api/streaming-services/:path*',
        destination: `${apiUrl}/api/streaming-services/:path*`,
      },
      {
        source: '/api/paymentrecovery/:path*',
        destination: `${apiUrl}/api/paymentrecovery/:path*`,
      },
      {
        source: '/api/streaming-availability/:path*',
        destination: `${apiUrl}/api/streaming-availability/:path*`,
      },
      {
        source: '/api/leads/:path*',
        destination: `${apiUrl}/api/leads/:path*`,
      },
    ];
  }
};

// Sentry disabled for Cloudflare Workers - @sentry/nextjs causes
// "Cannot redefine property: name" in Workers runtime.
// To re-enable: import { withSentryConfig } from '@sentry/nextjs'
// and wrap with withSentryConfig() conditionally on NEXT_PUBLIC_SENTRY_DSN.
export default withBundleAnalyzer(nextConfig);
