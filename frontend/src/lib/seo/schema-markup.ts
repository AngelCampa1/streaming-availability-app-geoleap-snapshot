/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContentData } from '@/lib/api/content';
import { ContentRouteType } from '@/lib/types';
import { generateCanonicalUrl, generateCategoryUrl, generateContentSlug } from './url-generation';
import { SITE_URL, SOCIAL_LINKS, PROGRAMMATIC_PAGES_LAST_UPDATED, PLATFORM_COUNT } from './site-config';
import type { ProductFeature } from '@/data/features';
import { premiumPlan } from '@/lib/pricing';

/**
 * Generate JSON-LD schema markup for content pages
 */
export function generateContentSchema(
  content: ContentData,
  type: ContentRouteType
): Record<string, any>[] {
  const baseUrl = SITE_URL;
  const contentUrl = generateCanonicalUrl(type, generateContentSlug(content.id, content.title, content.releaseYear));

  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': getSchemaType(type),
    name: content.title,
    url: contentUrl,
    description: content.overview || `Watch ${content.title} online`,
    identifier: content.id,

    // Images
    ...(content.posterUrl && {
      image: [content.posterUrl, ...(content.backdropUrl ? [content.backdropUrl] : [])],
    }),

    // Basic properties
    ...(content.releaseYear && {
      datePublished: `${content.releaseYear}-01-01`,
    }),

    ...(content.genres &&
      content.genres.length > 0 && {
        genre: content.genres,
      }),

    // Rating
    ...(content.rating &&
      content.voteCount && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: content.rating,
          ratingCount: content.voteCount,
          bestRating: 10,
          worstRating: 1,
        },
      }),

    // Cast and crew
    ...(content.cast &&
      content.cast.length > 0 && {
        actor: content.cast.slice(0, 10).map(actor => ({
          '@type': 'Person',
          name: actor.name,
          ...(actor.character && { roleName: actor.character }),
          ...(actor.profilePath && {
            image: actor.profilePath,
          }),
        })),
      }),

    ...(content.crew && {
      director: content.crew
        .filter(member => member.job === 'Director')
        .slice(0, 5)
        .map(director => ({
          '@type': 'Person',
          name: director.name,
          ...(director.profilePath && {
            image: director.profilePath,
          }),
        })),
    }),

    // Additional properties based on content type
    ...getTypeSpecificSchema(content, type),

    // Streaming availability
    ...(content.streamingOptions &&
      content.streamingOptions.length > 0 && {
        offers: content.streamingOptions.map(option => ({
          '@type': 'Offer',
          url: option.url,
          seller: {
            '@type': 'Organization',
            name: option.serviceName,
          },
          availability: 'https://schema.org/OnlineOnly',
          ...(option.price &&
            option.currency && {
              price: option.price,
              priceCurrency: option.currency,
            }),
          ...(option.type && {
            category: option.type,
          }),
        })),
      }),

    // Organization (GeoLeap)
    provider: {
      '@type': 'Organization',
      name: 'GeoLeap',
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
    },
  };

  // Add breadcrumb schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: getTypeDisplayName(type),
        item: `${baseUrl}${generateCategoryUrl(type)}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: content.title,
        item: contentUrl,
      },
    ],
  };

  // Return as array for multiple schemas
  return [baseSchema, breadcrumbSchema];
}

/**
 * Generate FAQ schema for content pages
 */
export function generateContentFaqSchema(
  content: ContentData,
  type: ContentRouteType
): Record<string, any> | null {
  const faqs = [];

  // Where to watch FAQ
  if (content.streamingOptions && content.streamingOptions.length > 0) {
    const platformNames = content.streamingOptions
      .slice(0, 3)
      .map(option => option.serviceName)
      .join(', ');

    faqs.push({
      '@type': 'Question',
      name: `Where can I watch ${content.title}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${content.title} is available to watch on ${platformNames} and other streaming platforms. Check our page for the most up-to-date streaming options.`,
      },
    });
  }

  // Rating FAQ
  if (content.rating) {
    faqs.push({
      '@type': 'Question',
      name: `What is the rating of ${content.title}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${content.title} has a rating of ${content.rating}/10${content.voteCount ? ` based on ${content.voteCount.toLocaleString()} user votes` : ''}.`,
      },
    });
  }

  // Release year FAQ
  if (content.releaseYear) {
    faqs.push({
      '@type': 'Question',
      name: `When was ${content.title} released?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${content.title} was released in ${content.releaseYear}.`,
      },
    });
  }

  // Genre FAQ
  if (content.genres && content.genres.length > 0) {
    faqs.push({
      '@type': 'Question',
      name: `What genre is ${content.title}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${content.title} is a ${content.genres.join(', ')} ${type === 'tv-show' ? 'TV series' : type}.`,
      },
    });
  }

  // Runtime FAQ for movies
  if (type === 'movie' && content.runtime) {
    faqs.push({
      '@type': 'Question',
      name: `How long is ${content.title}?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${content.title} has a runtime of ${content.runtime} minutes.`,
      },
    });
  }

  if (faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs,
  };
}

/**
 * Generate How-to schema for streaming guidance
 */
export function generateStreamingHowToSchema(
  content: ContentData,
  _type: ContentRouteType
): Record<string, any> | null {
  if (!content.streamingOptions || content.streamingOptions.length === 0) {
    return null;
  }

  const primaryPlatform = content.streamingOptions[0];

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Watch ${content.title} Online`,
    description: `Step-by-step guide to watch ${content.title} on ${primaryPlatform.serviceName}`,
    totalTime: 'PT5M',
    supply: [
      {
        '@type': 'HowToSupply',
        name: 'Internet connection',
      },
      {
        '@type': 'HowToSupply',
        name: `${primaryPlatform.serviceName} subscription`,
      },
    ],
    tool: [
      {
        '@type': 'HowToTool',
        name: 'Device (computer, tablet, or phone)',
      },
    ],
    step: [
      {
        '@type': 'HowToStep',
        name: `Visit ${primaryPlatform.serviceName}`,
        text: `Go to ${primaryPlatform.serviceName} website or open the app`,
        url: primaryPlatform.url,
      },
      {
        '@type': 'HowToStep',
        name: 'Sign in to your account',
        text: `Sign in to your ${primaryPlatform.serviceName} account or create a new one`,
      },
      {
        '@type': 'HowToStep',
        name: `Search for ${content.title}`,
        text: `Use the search function to find ${content.title}`,
      },
      {
        '@type': 'HowToStep',
        name: 'Start watching',
        text: `Click play to start watching ${content.title}`,
      },
    ],
  };
}

/**
 * Get schema type based on content type
 */
function getSchemaType(type: ContentRouteType): string {
  switch (type) {
    case 'movie':
      return 'Movie';
    case 'tv-show':
      return 'TVSeries';
    case 'documentary':
      return 'Movie'; // Documentaries use Movie schema
    case 'anime':
      return 'TVSeries'; // Anime uses TVSeries schema, same as tv-show
    default:
      return 'Movie';
  }
}

/**
 * Get type-specific schema properties
 */
function getTypeSpecificSchema(
  content: ContentData,
  type: ContentRouteType
): Record<string, any> {
  switch (type) {
    case 'movie':
    case 'documentary':
      return {
        ...(content.runtime && {
          duration: `PT${content.runtime}M`,
        }),
        ...(content.contentRating && {
          contentRating: content.contentRating,
        }),
      };

    case 'tv-show':
    case 'anime':
      return {
        ...(content.contentRating && {
          contentRating: content.contentRating,
        }),
      };

    default:
      return {};
  }
}

/**
 * Get display name for content type
 */
function getTypeDisplayName(type: string): string {
  const typeMap: Record<string, string> = {
    movie: 'Movies',
    'tv-show': 'TV Shows',
    documentary: 'Documentaries',
    anime: 'Anime',
  };

  return typeMap[type] || 'Content';
}

/**
 * Generate WebApplication schema for GeoLeap platform
 */
export function generateWebApplicationSchema(): Record<string, unknown> {
  const baseUrl = SITE_URL;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${baseUrl}/#webapp`,
    name: 'GeoLeap',
    description: `Find where to stream movies and TV shows. Compare streaming availability across Netflix, Amazon Prime, Disney+, and ${PLATFORM_COUNT} streaming services worldwide.`,
    url: baseUrl,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Works with all modern browsers.',
    featureList: [
      'Stream availability search',
      'Global streaming comparison',
      'Country-specific availability',
      'Price comparison across platforms',
      'New release notifications',
      'Watchlist management',
      'Multi-platform search',
    ],
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description: 'Unlimited streaming searches, ad-supported, 10-item watchlist',
      },
      {
        '@type': 'Offer',
        name: 'Premium',
        price: String(premiumPlan.priceUsd),
        priceCurrency: 'USD',
        description: 'Ad-free, unlimited watchlist, content alerts, priority support. Billed annually.',
      },
    ],
    author: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'GeoLeap',
      url: baseUrl,
      sameAs: Object.values(SOCIAL_LINKS),
    },
  };
}

/**
 * Generate Organization schema for GeoLeap
 */
export function generateOrganizationSchema(): Record<string, unknown> {
  const baseUrl = SITE_URL;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'GeoLeap',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: `A practical guide to streaming availability worldwide. Find where to watch movies and TV shows across ${PLATFORM_COUNT} streaming services.`,
    sameAs: Object.values(SOCIAL_LINKS),
    foundingDate: '2025',
    areaServed: 'Worldwide',
    knowsAbout: [
      'Streaming services',
      'Content availability',
      'Geo-restrictions',
      'VPN technology',
      'Streaming platforms comparison',
    ],
    slogan: 'Search globally, stream locally',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${baseUrl}/support`,
    },
  };
}

/**
 * Generate WebSite schema for GeoLeap
 */
export function generateWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'GeoLeap',
    url: SITE_URL,
    description: 'Find where to stream movies and TV shows across 42 streaming services in 57 countries.',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate DataCatalog schema for GeoLeap streaming data
 */
export function generateDataCatalogSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: 'GeoLeap Streaming Availability Database',
    description: 'Streaming availability data for movies, TV shows, and documentaries across 42 streaming services in 57 countries.',
    url: SITE_URL,
    provider: { '@id': `${SITE_URL}/#organization` },
    dataset: [
      {
        '@type': 'Dataset',
        name: 'Streaming Platform Availability by Country',
        description: 'Which streaming platforms are available in which countries, with local pricing.',
        url: `${SITE_URL}/countries`,
        temporalCoverage: '2025/..',
        spatialCoverage: { '@type': 'Place', name: 'Global (57 countries)' },
        variableMeasured: ['platform availability', 'subscription pricing', 'content library size'],
        dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
        isAccessibleForFree: true,
      },
      {
        '@type': 'Dataset',
        name: 'Content Streaming Availability',
        description: 'Where specific movies and TV shows stream, rent, or buy across platforms and countries.',
        url: `${SITE_URL}/search`,
        variableMeasured: ['streaming availability', 'rental price', 'purchase price'],
        dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
        isAccessibleForFree: true,
      },
      {
        '@type': 'Dataset',
        name: 'Sports Streaming Pricing by Country',
        description: 'Live sports streaming prices compared across 57 countries for 25+ sports.',
        url: `${SITE_URL}/sports`,
        variableMeasured: ['subscription price', 'platform availability'],
        dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
        isAccessibleForFree: true,
      },
    ],
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
  };
}

/**
 * Generate DefinedTermSet schema for glossary index
 */
export function generateGlossaryTermSetSchema(terms: Array<{
  term: string;
  definition: string;
  slug: string;
}>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'GeoLeap Streaming Glossary',
    description: `Comprehensive glossary of ${terms.length}+ streaming industry terms.`,
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: terms.map(t => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.definition,
      url: `${SITE_URL}/glossary/${t.slug}`,
    })),
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
  };
}

// ---------------------------------------------------------------------------
// pSEO schema builders
// ---------------------------------------------------------------------------

/**
 * Generate Organization schema for a streaming platform
 */
export function generateStreamingServiceSchema(platform: {
  name: string;
  slug: string;
  description: string;
  url?: string;
  wikipediaUrl?: string;
  wikidataId?: string;
}): Record<string, unknown> {
  const baseUrl = SITE_URL;
  const sameAs: string[] = [`${baseUrl}/platforms/${platform.slug}`];
  if (platform.wikipediaUrl) sameAs.push(platform.wikipediaUrl);
  if (platform.wikidataId) sameAs.push(platform.wikidataId);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: platform.name,
    description: platform.description,
    ...(platform.url ? { url: platform.url } : {}),
    sameAs,
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
  };
}

/**
 * Generate Product schema for streaming platform pages
 */
export function generatePlatformProductSchema(platform: {
  name: string;
  slug: string;
  description: string;
  pricing: {
    startsAt: number;
    currency: string;
    billingPeriod: string;
    hasFreeTier: boolean;
    hasTrial: boolean;
  };
  availableCountries: string[];
  wikipediaUrl?: string;
  wikidataId?: string;
}): Record<string, unknown> {
  const baseUrl = SITE_URL;
  const sameAs: string[] = [];
  if (platform.wikipediaUrl) sameAs.push(platform.wikipediaUrl);
  if (platform.wikidataId) sameAs.push(platform.wikidataId);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: platform.name,
    description: platform.description,
    url: `${baseUrl}/platforms/${platform.slug}`,
    category: 'Streaming Service',
    brand: {
      '@type': 'Brand',
      name: platform.name,
    },
    offers: {
      '@type': 'Offer',
      price: platform.pricing.hasFreeTier ? '0' : String(platform.pricing.startsAt),
      priceCurrency: platform.pricing.currency,
      availability: 'https://schema.org/OnlineOnly',
      ...(platform.pricing.hasTrial ? { description: 'Free trial available' } : {}),
    },
    areaServed: platform.availableCountries.map(iso => ({
      '@type': 'Country',
      name: iso,
    })),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.bluf-summary', 'h1'],
    },
  };
}

/**
 * Generate WebPage schema for comparison pages
 */
export function generateComparisonPageSchema(opts: {
  title: string;
  description: string;
  url: string;
  platforms?: [string, string];
  comparisonPoints?: Array<{
    category: string;
    platformA: string;
    platformB: string;
    winner?: string;
  }>;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.title,
    description: opts.description,
    url: opts.url,
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.bluf-summary', 'h1'],
    },
    ...(opts.comparisonPoints
      ? {
          mainEntity: {
            '@type': 'ItemList',
            name: opts.title,
            numberOfItems: opts.comparisonPoints.length,
            itemListElement: opts.comparisonPoints.map((point, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: point.category,
              description: `${opts.platforms?.[0] ?? 'Platform A'}: ${point.platformA}. ${opts.platforms?.[1] ?? 'Platform B'}: ${point.platformB}.`,
            })),
          },
        }
      : {}),
  };
}

/**
 * Generate Article schema for blog/guides
 */
export function generateArticleSchema(article: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author?: { name: string; title: string; slug: string; twitterHandle?: string; linkedInUrl?: string };
  mentions?: Array<{ name: string; url?: string; type?: string; sameAs?: string }>;
}): Record<string, unknown> {
  const baseUrl = SITE_URL;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.url,
    datePublished: article.datePublished,
    ...(article.dateModified ? { dateModified: article.dateModified } : { dateModified: article.datePublished }),
    author: article.author
      ? {
          '@type': 'Person',
          '@id': `${baseUrl}/about/authors/${article.author.slug}`,
          name: article.author.name,
          jobTitle: article.author.title,
          url: `${baseUrl}/about/authors/${article.author.slug}`,
          ...(article.author.twitterHandle
            ? {
                sameAs: [
                  `https://x.com/${article.author.twitterHandle}`,
                  ...(article.author.linkedInUrl ? [article.author.linkedInUrl] : []),
                ],
              }
            : article.author.linkedInUrl
              ? { sameAs: [article.author.linkedInUrl] }
              : {}),
        }
      : {
          '@type': 'Organization',
          '@id': `${baseUrl}/#organization`,
          name: 'GeoLeap',
          url: baseUrl,
          sameAs: Object.values(SOCIAL_LINKS),
        },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'GeoLeap',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'article p:first-of-type'],
    },
    ...(article.mentions && article.mentions.length > 0
      ? {
          mentions: article.mentions.map((entity) => ({
            '@type': entity.type || 'Thing',
            name: entity.name,
            ...(entity.url ? { url: entity.url } : {}),
            ...(entity.sameAs ? { sameAs: entity.sameAs } : {}),
          })),
        }
      : {}),
  };
}

/**
 * Generate DefinedTerm schema for glossary terms
 */
export function generateGlossaryTermSchema(term: {
  term: string;
  definition: string;
  url: string;
  inDefinedTermSet?: { name: string; url: string };
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.term,
    description: term.definition,
    url: term.url,
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    ...(term.inDefinedTermSet
      ? {
          inDefinedTermSet: {
            '@type': 'DefinedTermSet',
            name: term.inDefinedTermSet.name,
            url: term.inDefinedTermSet.url,
          },
        }
      : {}),
  };
}

/**
 * Generate CollectionPage schema for index pages
 */
export function generateCollectionPageSchema(opts: {
  title: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.title,
    description: opts.description,
    url: opts.url,
    hasPart: opts.items.map(item => ({
      '@type': 'WebPage',
      name: item.name,
      url: item.url,
    })),
  };
}

export function generateFeatureCollectionSchema(features: ProductFeature[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'GeoLeap Features',
    description: 'Product features for finding where movies and TV shows stream across services and countries.',
    url: `${SITE_URL}/features`,
    mainEntity: {
      '@type': 'ItemList',
      name: 'GeoLeap product features',
      numberOfItems: features.length,
      itemListElement: features.map((feature, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: feature.name,
        url: `${SITE_URL}/features/${feature.slug}`,
        description: feature.summary,
      })),
    },
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
  };
}

export function generateFeatureIndexFaqSchema(
  faqs: Array<{ question: string; answer: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
  };
}

export function generateFeaturePageSchema(feature: ProductFeature): Record<string, unknown>[] {
  const featureUrl = `${SITE_URL}/features/${feature.slug}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: feature.name,
      description: feature.seoDescription,
      url: featureUrl,
      about: {
        '@type': 'SoftwareApplication',
        name: `GeoLeap ${feature.name}`,
        applicationCategory: 'EntertainmentApplication',
        operatingSystem: 'Web',
        featureList: feature.proofPoints,
      },
      mainEntity: {
        '@type': 'FAQPage',
        mainEntity: feature.faq.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
      dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Features',
          item: `${SITE_URL}/features`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: feature.name,
          item: featureUrl,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------

/**
 * Generate Country availability ItemList schema
 */
export function generateCountryAvailabilitySchema(
  countries: Array<{ name: string; code: string; slug?: string; servicesCount: number; wikipediaUrl?: string; wikidataId?: string }>
): Record<string, any> {
  const baseUrl = SITE_URL;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Streaming Availability by Country',
    description: 'List of countries with streaming service availability information',
    numberOfItems: countries.length,
    itemListElement: countries.map((country, index) => {
      const sameAs: string[] = [];
      if (country.wikipediaUrl) sameAs.push(country.wikipediaUrl);
      if (country.wikidataId) sameAs.push(country.wikidataId);
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Country',
          name: country.name,
          identifier: country.code,
          url: `${baseUrl}/countries/${country.slug ?? country.code.toLowerCase()}`,
          ...(sameAs.length > 0 ? { sameAs } : {}),
        },
      };
    }),
  };
}

/**
 * Generate Speakable schema for voice-assistant-friendly pages
 */
export function generateSpeakableSchema(url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.bluf-summary', 'h1', '.faq-answer'],
    },
  };
}

/**
 * Generate HowTo schema for platform-country pages
 */
export function generatePlatformCountryHowToSchema(opts: {
  platformName: string;
  countryName: string;
  isAvailable: boolean;
  platformUrl?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to watch ${opts.platformName} in ${opts.countryName}`,
    description: opts.isAvailable
      ? `Step-by-step guide to accessing ${opts.platformName} content in ${opts.countryName}.`
      : `How to check ${opts.platformName} availability and find alternatives in ${opts.countryName}.`,
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Check availability',
        text: `Visit GeoLeap to check if ${opts.platformName} is available in ${opts.countryName}.`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: opts.isAvailable ? 'Sign up or log in' : 'Explore alternatives',
        text: opts.isAvailable
          ? `Visit ${opts.platformName} and create an account or log in to start streaming.`
          : `Browse other streaming services available in ${opts.countryName} on GeoLeap.`,
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Start streaming',
        text: opts.isAvailable
          ? `Enjoy ${opts.platformName} content available in ${opts.countryName}.`
          : `Use GeoLeap to find where your favorite content is available.`,
      },
    ],
  };
}

/**
 * Generate HowTo schema for the homepage
 */
export function generateHomepageHowToSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Find Where to Watch Any Show Globally',
    description: 'Use GeoLeap to discover which streaming services have your favorite movies and TV shows in any country.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Search for content',
        text: 'Type the name of any movie or TV show into GeoLeap\'s search bar.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Discover availability',
        text: 'See which countries and streaming services offer your content, with pricing and audio/subtitle details.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Start streaming',
        text: 'Use legal services available to your account and region, and verify each platform\'s current terms before subscribing.',
      },
    ],
  };
}

/**
 * Generate schema for sport streaming pages
 */
export function generateSportsPageSchema(params: {
  name: string;
  slug: string;
  description: string;
  season: string;
  cheapestPrice?: number;
  cheapestCurrency?: string;
  wikipediaUrl?: string;
  wikidataId?: string;
}): Record<string, any> {
  const aboutSameAs: string[] = [];
  if (params.wikipediaUrl) aboutSameAs.push(params.wikipediaUrl);
  if (params.wikidataId) aboutSameAs.push(params.wikidataId);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Watch ${params.name} Online`,
    description: params.description,
    url: `${SITE_URL}/sports/${params.slug}`,
    about: {
      '@type': 'SportsEvent',
      name: params.name,
      sport: params.name,
      ...(params.season && { eventSchedule: { '@type': 'Schedule', description: params.season } }),
      ...(aboutSameAs.length > 0 ? { sameAs: aboutSameAs } : {}),
    },
    ...(params.cheapestPrice && {
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: params.cheapestPrice,
        priceCurrency: params.cheapestCurrency || 'USD',
        availability: 'https://schema.org/InStock',
      },
    }),
    publisher: {
      '@type': 'Organization',
      name: 'GeoLeap',
      url: SITE_URL,
    },
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.bluf-summary', 'h1'],
    },
  };
}

/**
 * Generate HowTo schema for sport streaming guides
 */
export function generateSportsHowToSchema(params: {
  sportName: string;
  countryName?: string;
  platformName?: string;
}): Record<string, any> {
  const location = params.countryName ? ` in ${params.countryName}` : '';
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Watch ${params.sportName}${location}`,
    description: `Step-by-step guide to watching ${params.sportName} online${location}.`,
    step: [
      {
        '@type': 'HowToStep',
        name: 'Choose a streaming platform',
        text: `Compare streaming platforms that carry ${params.sportName}${location}. ${params.platformName ? `${params.platformName} is a popular option.` : 'Check pricing and availability.'}`,
      },
      {
        '@type': 'HowToStep',
        name: 'Sign up for the service',
        text: 'Create an account and choose a subscription plan. Look for free trials or promotional pricing.',
      },
      {
        '@type': 'HowToStep',
        name: 'Install the app or visit the website',
        text: 'Download the streaming app on your device or navigate to the platform\'s website.',
      },
      {
        '@type': 'HowToStep',
        name: 'Find and watch live events',
        text: `Navigate to the sports section and find ${params.sportName} events. Set reminders for upcoming matches.`,
      },
    ],
    totalTime: 'PT10M',
  };
}

/**
 * Generate schema for genre guide pages
 */
export function generateGenreGuideSchema(params: {
  name: string;
  slug: string;
  description: string;
  platforms: Array<{ name: string; slug: string }>;
}): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best ${params.name} Streaming Services`,
    description: params.description,
    url: `${SITE_URL}/genres/${params.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      name: `Best Streaming Platforms for ${params.name}`,
      itemListElement: params.platforms.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.name,
        url: `${SITE_URL}/platforms/${p.slug}`,
      })),
    },
    publisher: {
      '@type': 'Organization',
      name: 'GeoLeap',
      url: SITE_URL,
    },
    dateModified: PROGRAMMATIC_PAGES_LAST_UPDATED,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.bluf-summary', 'h1'],
    },
  };
}

/**
 * Generate schema for streaming guide pages (HowTo + Article hybrid)
 */
export function generateStreamingGuideSchema(params: {
  title: string;
  slug: string;
  description: string;
  tldr: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: number;
  sections: Array<{ id: string; label: string }>;
}): Record<string, any>[] {
  const articleSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.title,
    description: params.description,
    url: `${SITE_URL}/guides/${params.slug}`,
    datePublished: params.publishedAt,
    dateModified: params.updatedAt,
    wordCount: params.readingTime * 250,
    author: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'GeoLeap',
      url: SITE_URL,
      sameAs: Object.values(SOCIAL_LINKS),
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'GeoLeap',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon/android-chrome-512x512.png`,
      },
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.tldr-summary', 'h1', '.faq-answer'],
    },
  };

  const howToSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: params.title,
    description: params.tldr,
    step: params.sections.map((section, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: section.label,
      url: `${SITE_URL}/guides/${params.slug}#${section.id}`,
    })),
  };

  return [articleSchema, howToSchema];
}

/**
 * Generate VideoObject schema for content pages with streaming options
 */
export function generateVideoObjectSchema(
  content: ContentData,
  _type: ContentRouteType
): Record<string, any> | null {
  if (!content.title || !content.releaseYear) {
    return null;
  }

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: content.title,
    description: content.overview || `Watch ${content.title} online`,
    ...(content.posterUrl ? { thumbnailUrl: content.posterUrl } : {}),
    uploadDate: `${content.releaseYear}-01-01`,
    datePublished: `${content.releaseYear}-01-01`,
    ...(content.runtime ? { duration: `PT${content.runtime}M` } : {}),
    ...(content.contentRating ? { contentRating: content.contentRating } : {}),
    ...(content.genres && content.genres.length > 0 ? { genre: content.genres } : {}),
    ...(content.rating && content.voteCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: content.rating,
            ratingCount: content.voteCount,
            bestRating: 10,
            worstRating: 1,
          },
        }
      : {}),
  };

  // Add WatchAction for streaming options
  if (content.streamingOptions && content.streamingOptions.length > 0) {
    schema.potentialAction = content.streamingOptions.map(option => ({
      '@type': 'WatchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: option.url,
        actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'],
      },
      ...(option.serviceName ? { name: `Watch on ${option.serviceName}` } : {}),
    }));
  }

  return schema;
}
