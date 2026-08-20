import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SeoHead } from '../SeoHead';
import { ContentData } from '@/lib/api/content';

// Track calls to Head component
let headContent: React.ReactNode[] = [];

// Mock Next.js Head component to capture content
jest.mock('next/head', () => {
  return function Head({ children }: { children: React.ReactNode }) {
    // Store the children for testing
    headContent = React.Children.toArray(children);
    return null; // Head doesn't render to DOM in real Next.js
  };
});

// Mock SEO functions
jest.mock('@/lib/seo/url-generation', () => ({
  generateCanonicalUrl: (type: string, slug: string) => `https://geoleap.app/content/${type}/${slug}`,
  generateOgImageUrl: (id: string, title: string, type: string) => `https://geoleap.app/og/${type}/${id}.jpg`,
}));

const mockContent: ContentData = {
  id: '123',
  title: 'Test Movie',
  originalTitle: 'Original Test Movie',
  overview: 'This is a test movie for SEO testing purposes. It has a longer description to test truncation.',
  tagline: 'The ultimate test',
  releaseYear: 2023,
  rating: 8.5,
  voteCount: 1000,
  runtime: 120,
  contentRating: 'PG-13',
  genres: ['Action', 'Adventure', 'Thriller'],
  primaryGenre: 'Action',
  posterUrl: 'https://example.com/poster.jpg',
  backdropUrl: 'https://example.com/backdrop.jpg',
  cast: [
    { id: 1, name: 'John Doe', character: 'Hero', profilePath: '/actor1.jpg', order: 1 },
    { id: 2, name: 'Jane Smith', character: 'Villain', profilePath: '/actor2.jpg', order: 2 },
  ],
  crew: [
    { id: 1, name: 'Jane Director', job: 'Director', department: 'Directing', profilePath: '/director.jpg' },
    { id: 2, name: 'Bob Producer', job: 'Producer', department: 'Production', profilePath: '/producer.jpg' },
  ],
  streamingOptions: [
    { serviceId: 'netflix', serviceName: 'Netflix', type: 'subscription', url: 'https://netflix.com/123' },
    { serviceId: 'hulu', serviceName: 'Hulu', type: 'subscription', url: 'https://hulu.com/123' },
  ],
};

// Helper function to get element by type and props
function getMetaElement(type: string, props: any) {
  return headContent.find((element: any) => {
    if (!React.isValidElement(element) || element.type !== type) return false;
    return Object.keys(props).every(key => (element.props as any)[key] === props[key]);
  });
}

// Helper function to get title content
function getTitleContent() {
  const titleElement = headContent.find((element: any) => React.isValidElement(element) && element.type === 'title');
  return titleElement && React.isValidElement(titleElement) ? (titleElement.props as any).children : null;
}

describe('SeoHead', () => {
  beforeEach(() => {
    headContent = [];
  });

  it('renders basic SEO meta tags', () => {
    render(
      <SeoHead
        title="Test Page"
        description="Test description"
        keywords="test, seo, meta"
        url="https://example.com/test"
      />
    );

    // Check title
    expect(getTitleContent()).toBe('Test Page');

    // Check meta tags
    expect(getMetaElement('meta', { name: 'description' })).toBeTruthy();
    expect(getMetaElement('meta', { name: 'keywords' })).toBeTruthy();
    expect(getMetaElement('link', { rel: 'canonical' })).toBeTruthy();
  });

  it('generates content-specific SEO metadata', () => {
    render(<SeoHead content={mockContent} type="movie" />);

    // Check title contains content title
    const title = getTitleContent();
    expect(title).toContain('Test Movie');
    expect(title).toContain('GeoLeap');

    // Check meta elements exist
    expect(getMetaElement('meta', { name: 'description' })).toBeTruthy();
    expect(getMetaElement('meta', { name: 'keywords' })).toBeTruthy();
  });

  it('renders Open Graph meta tags', () => {
    render(<SeoHead content={mockContent} type="movie" />);

    // Check Open Graph tags
    expect(getMetaElement('meta', { property: 'og:type' })).toBeTruthy();
    expect(getMetaElement('meta', { property: 'og:title' })).toBeTruthy();
    expect(getMetaElement('meta', { property: 'og:description' })).toBeTruthy();
    expect(getMetaElement('meta', { property: 'og:image' })).toBeTruthy();
  });

  it('renders Twitter Card meta tags', () => {
    render(<SeoHead content={mockContent} type="movie" />);

    // Check Twitter Card tags
    expect(getMetaElement('meta', { name: 'twitter:card' })).toBeTruthy();
    expect(getMetaElement('meta', { name: 'twitter:title' })).toBeTruthy();
    expect(getMetaElement('meta', { name: 'twitter:description' })).toBeTruthy();
    expect(getMetaElement('meta', { name: 'twitter:image' })).toBeTruthy();
  });

  it('renders content-specific meta tags for movies', () => {
    render(<SeoHead content={mockContent} type="movie" />);

    // Check that essential meta tags exist
    expect(getMetaElement('meta', { property: 'og:type' })).toBeTruthy();
    expect(getMetaElement('meta', { property: 'og:title' })).toBeTruthy();
    expect(getMetaElement('meta', { property: 'og:description' })).toBeTruthy();

    // Check that the component renders without errors
    expect(headContent.length).toBeGreaterThan(10); // Should have many meta tags

    // Verify movie-specific Open Graph type
    const ogTypeElement = getMetaElement('meta', { property: 'og:type' }) as any;
    expect(ogTypeElement?.props?.content).toBe('video.movie');
  });

  it('handles TV shows correctly', () => {
    render(<SeoHead content={mockContent} type="tv-show" />);

    // Should have TV show Open Graph type
    const ogTypeElement = getMetaElement('meta', { property: 'og:type' }) as any;
    expect(ogTypeElement?.props?.content).toBe('video.tv_show');
  });

  it('handles missing content gracefully', () => {
    const minimalContent: Partial<ContentData> = {
      id: '123',
      title: 'Minimal Movie',
      genres: [],
    };

    expect(() => render(<SeoHead content={minimalContent as ContentData} type="movie" />)).not.toThrow();

    // Should still have basic structure
    expect(getTitleContent()).toContain('Minimal Movie');
    expect(getMetaElement('meta', { name: 'description' })).toBeTruthy();
  });

  it('includes required SEO meta tags', () => {
    render(<SeoHead title="Test" description="Test" />);

    // Check for essential meta tags
    expect(getMetaElement('meta', { name: 'viewport' })).toBeTruthy();
    expect(getMetaElement('meta', { name: 'robots' })).toBeTruthy();
    expect(getMetaElement('meta', { name: 'theme-color' })).toBeTruthy();
    expect(getMetaElement('link', { rel: 'manifest' })).toBeTruthy();
  });
});
