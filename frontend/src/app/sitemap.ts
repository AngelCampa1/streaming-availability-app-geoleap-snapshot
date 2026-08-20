import type { MetadataRoute } from 'next';
import { getPopularContent } from '@/lib/api/content';
import { generateContentSlug, generateSitemapUrls } from '@/lib/seo/url-generation';
import { PROGRAMMATIC_PAGES_LAST_UPDATED, SITE_URL } from '@/lib/seo/site-config';
import { platforms } from '@/data/platforms';
import { countries } from '@/data/countries';
import { comparisons } from '@/data/comparisons';
import { blogPosts } from '@/data/blog-posts';
import { sports } from '@/data/sports';
import { streamingGuides } from '@/data/guides';
import { genreGuides } from '@/data/genres';
import { glossaryTerms } from '@/data/glossary';
import { productFeatures } from '@/data/features';
import { authors } from '@/data/authors';
import {
  getComparisonGovernance,
  getCountryGovernance,
  getPlatformGovernance,
  isIndexable,
} from '@/lib/seo/page-governance';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const currentDate = new Date().toISOString();
  const pseoDate = PROGRAMMATIC_PAGES_LAST_UPDATED;

  return [
    ...generateStaticAndPlatformAndCountryPages(baseUrl, currentDate, pseoDate),
    ...generateBlogGuidesGlossaryPages(baseUrl, pseoDate),
    ...generateComparisonPages(baseUrl, pseoDate),
    ...generateSportsAndGenrePages(baseUrl, pseoDate),
    ...generateUnblockPages(baseUrl, pseoDate),
    ...(await generateDynamicContentPages(baseUrl, currentDate, pseoDate)),
  ];
}

/**
 * ID 0: Static pages + platform pages + country pages
 */
function generateStaticAndPlatformAndCountryPages(
  baseUrl: string,
  currentDate: string,
  pseoDate: string,
): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: pseoDate,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about/authors`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  productFeatures.forEach(feature => {
    pages.push({
      url: `${baseUrl}/features/${feature.slug}`,
      lastModified: pseoDate,
      changeFrequency: 'monthly',
      priority: 0.75,
    });
  });

  authors.forEach(author => {
    pages.push({
      url: `${baseUrl}/about/authors/${author.slug}`,
      lastModified: pseoDate,
      changeFrequency: 'monthly',
      priority: 0.65,
    });
  });

  // Platforms index
  pages.push({
    url: `${baseUrl}/platforms`,
    lastModified: pseoDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  });

  // Individual platform pages
  platforms
    .filter(platform => isIndexable(getPlatformGovernance(platform)))
    .forEach(platform => {
    pages.push({
      url: `${baseUrl}/platforms/${platform.slug}`,
      lastModified: pseoDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  // Countries index
  pages.push({
    url: `${baseUrl}/countries`,
    lastModified: pseoDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  });

  // Individual country pages
  countries
    .filter(country => isIndexable(getCountryGovernance(country)))
    .forEach(country => {
    pages.push({
      url: `${baseUrl}/countries/${country.slug}`,
      lastModified: pseoDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
    });

  return pages;
}

/**
 * ID 1: Blog + guides + glossary pages
 */
function generateBlogGuidesGlossaryPages(
  baseUrl: string,
  pseoDate: string,
): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];

  // Blog index
  pages.push({
    url: `${baseUrl}/blog`,
    lastModified: pseoDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  });

  // Individual blog post pages (exclude noindexed posts)
  blogPosts
    .filter(post => !post.noIndex)
    .forEach(post => {
      pages.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    });

  // Guides index
  pages.push({
    url: `${baseUrl}/guides`,
    lastModified: pseoDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  });

  // Individual guide pages (use per-entry dates)
  streamingGuides.forEach(guide => {
    pages.push({
      url: `${baseUrl}/guides/${guide.slug}`,
      lastModified: guide.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  // Glossary index
  pages.push({
    url: `${baseUrl}/glossary`,
    lastModified: pseoDate,
    changeFrequency: 'monthly',
    priority: 0.6,
  });

  glossaryTerms.forEach(term => {
    pages.push({
      url: `${baseUrl}/glossary/${term.slug}`,
      lastModified: pseoDate,
      changeFrequency: 'monthly',
      priority: 0.55,
    });
  });

  return pages;
}

/**
 * ID 2: Comparisons + compare ? country pages
 */
function generateComparisonPages(
  baseUrl: string,
  pseoDate: string,
): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];

  pages.push({
    url: `${baseUrl}/compare`,
    lastModified: pseoDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  });

  comparisons
    .filter(comparison => isIndexable(getComparisonGovernance(comparison)))
    .forEach(comparison => {
      pages.push({
        url: `${baseUrl}/compare/${comparison.slug}`,
        lastModified: pseoDate,
        changeFrequency: 'monthly',
        priority: 0.75,
      });

      countries.forEach(country => {
        pages.push({
          url: `${baseUrl}/compare/${comparison.slug}/in/${country.slug}`,
          lastModified: pseoDate,
          changeFrequency: 'monthly',
          priority: 0.55,
        });
      });
    });

  return pages;
}

/**
 * ID 3: Sports + genre pages + genre ? country
 */
function generateSportsAndGenrePages(
  baseUrl: string,
  pseoDate: string,
): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];

  pages.push({
    url: `${baseUrl}/sports`,
    lastModified: pseoDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  });

  pages.push({
    url: `${baseUrl}/genres`,
    lastModified: pseoDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  });

  sports.forEach(sport => {
    pages.push({
      url: `${baseUrl}/sports/${sport.slug}`,
      lastModified: pseoDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    });

    const seenSportCountries = new Set<string>();
    sport.regionalPricing.forEach(pricing => {
      const country = countries.find(item => item.iso === pricing.countryIso);
      if (!country) return;
      if (seenSportCountries.has(country.slug)) return;
      seenSportCountries.add(country.slug);
      pages.push({
        url: `${baseUrl}/sports/${sport.slug}/${country.slug}`,
        lastModified: pseoDate,
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    });
  });

  genreGuides.forEach(genre => {
    pages.push({
      url: `${baseUrl}/genres/${genre.slug}`,
      lastModified: pseoDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    });

    countries.forEach(country => {
      pages.push({
        url: `${baseUrl}/genres/${genre.slug}/${country.slug}`,
        lastModified: pseoDate,
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    });
  });

  platforms.forEach(platform => {
    countries.forEach(country => {
      pages.push({
        url: `${baseUrl}/platforms/${platform.slug}/countries/${country.slug}`,
        lastModified: pseoDate,
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    });

    genreGuides.forEach(genre => {
      pages.push({
        url: `${baseUrl}/platforms/${platform.slug}/genres/${genre.slug}`,
        lastModified: pseoDate,
        changeFrequency: 'monthly',
        priority: 0.55,
      });
    });
  });

  return pages;
}

/**
 * ID 5: Unblock pages
 */
function generateUnblockPages(
  baseUrl: string,
  pseoDate: string,
): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];

  // Unblock index
  pages.push({
    url: `${baseUrl}/unblock`,
    lastModified: pseoDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  });

  // Unblock platform and country pages (only where platform is NOT available)
  let unblockCountryCount = 0;
  platforms
    .filter(platform => isIndexable(getPlatformGovernance(platform)))
    .forEach(platform => {
    pages.push({
      url: `${baseUrl}/unblock/${platform.slug}`,
      lastModified: pseoDate,
      changeFrequency: 'monthly',
      priority: 0.75,
    });

    countries.forEach(country => {
      if (unblockCountryCount >= 2000) return;
      if (platform.availableCountries.includes(country.iso)) return;
      pages.push({
        url: `${baseUrl}/unblock/${platform.slug}/${country.slug}`,
        lastModified: pseoDate,
        changeFrequency: 'monthly',
        priority: 0.55,
      });
      unblockCountryCount += 1;
    });
  });

  return pages;
}

/**
 * ID 5: Dynamic content pages (movies, TV shows, documentaries) + how-to-watch pages
 */
async function generateDynamicContentPages(
  baseUrl: string,
  currentDate: string,
  pseoDate: string,
): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [];

  // How to Watch index
  pages.push({
    url: `${baseUrl}/how-to-watch`,
    lastModified: pseoDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  });

  try {
    // Fetch popular content for each type
    const [popularMovies, popularTvShows, popularDocumentaries] = await Promise.allSettled([
      getPopularContent('movie', 100),
      getPopularContent('tv-show', 100),
      getPopularContent('documentary', 50),
    ]);

    // Add movie pages
    if (popularMovies.status === 'fulfilled') {
      const movieUrls = generateSitemapUrls(popularMovies.value, 'movie');
      pages.push(
        ...movieUrls.map(item => ({
          url: item.url,
          lastModified: item.lastmod,
          changeFrequency: 'weekly' as const,
          priority: item.priority,
        }))
      );
      pages.push(...generateCountryHowToWatchUrls(baseUrl, popularMovies.value, 'movie', pseoDate));
    }

    // Add TV show pages
    if (popularTvShows.status === 'fulfilled') {
      const tvUrls = generateSitemapUrls(popularTvShows.value, 'tv-show');
      pages.push(
        ...tvUrls.map(item => ({
          url: item.url,
          lastModified: item.lastmod,
          changeFrequency: 'weekly' as const,
          priority: item.priority,
        }))
      );
      pages.push(...generateCountryHowToWatchUrls(baseUrl, popularTvShows.value, 'tv-show', pseoDate));
    }

    // Add documentary pages
    if (popularDocumentaries.status === 'fulfilled') {
      const docUrls = generateSitemapUrls(popularDocumentaries.value, 'documentary');
      pages.push(
        ...docUrls.map(item => ({
          url: item.url,
          lastModified: item.lastmod,
          changeFrequency: 'monthly' as const,
          priority: item.priority,
        }))
      );
      pages.push(...generateCountryHowToWatchUrls(baseUrl, popularDocumentaries.value, 'documentary', pseoDate));
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error generating dynamic content sitemap:', error);
    }
  }

  return pages;
}

function generateCountryHowToWatchUrls(
  baseUrl: string,
  items: { id: string; title: string; releaseYear?: number }[],
  type: 'movie' | 'tv-show' | 'documentary',
  pseoDate: string,
): MetadataRoute.Sitemap {
  const topCountries = countries.slice(0, 15);

  return items.flatMap(item => {
    const slug = generateContentSlug(item.id, item.title, item.releaseYear);
    return topCountries.map(country => ({
      url: `${baseUrl}/how-to-watch/${type}/${slug}/in/${country.slug}`,
      lastModified: pseoDate,
      changeFrequency: 'monthly' as const,
      priority: 0.55,
    }));
  });
}
