/* eslint-disable @typescript-eslint/no-explicit-any */
// Type definitions for metadata interfaces used in tests and SEO
import { Metadata as NextMetadata } from 'next';

// Extend the Next.js Metadata type to include our specific requirements
export interface Metadata extends NextMetadata {
  [key: string]: any;
  title?: string | { template?: string; default: string; absolute?: string };
  description?: string;
  keywords?: string | string[];
  canonical?: string;
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    siteName?: string;
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
      alt?: string;
      type?: string;
    }>;
    locale?: string;
    type?: string;
    [key: string]: any;
  };
  twitter?: {
    card?: string;
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    images?:
      | string
      | Array<{
          url: string;
          alt?: string;
        }>;
    [key: string]: any;
  };
  robots?: {
    index?: boolean;
    follow?: boolean;
    noarchive?: boolean;
    nosnippet?: boolean;
    noimageindex?: boolean;
    nocache?: boolean;
    [key: string]: any;
  };
  alternates?: {
    canonical?: string;
    languages?: Record<string, string>;
    media?: Record<string, string>;
    types?: Record<string, string>;
    [key: string]: any;
  };
  icons?: {
    icon?: string | Array<{ url: string; sizes?: string; type?: string }>;
    shortcut?: string | Array<{ url: string; sizes?: string; type?: string }>;
    apple?: string | Array<{ url: string; sizes?: string; type?: string }>;
    other?: Array<{
      rel: string;
      url: string;
      sizes?: string;
      type?: string;
    }>;
    [key: string]: any;
  };
  verification?: {
    google?: string;
    yandex?: string;
    yahoo?: string;
    other?: Record<string, string | string[]>;
    [key: string]: any;
  };
  category?: string;
  classification?: string;
  other?: Record<string, string | number | boolean | undefined | null>;
}

// Schema.org structured data types
export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface MovieSchema extends StructuredData {
  '@type': 'Movie';
  name: string;
  description?: string;
  image?: string | string[];
  director?: { '@type': 'Person'; name: string } | Array<{ '@type': 'Person'; name: string }>;
  actor?: Array<{ '@type': 'Person'; name: string; characterName?: string }>;
  genre?: string | string[];
  datePublished?: string;
  duration?: string;
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    bestRating?: number;
    worstRating?: number;
    ratingCount?: number;
  };
  offers?:
    | {
        '@type': 'Offer';
        availability: string;
        price?: number;
        priceCurrency?: string;
        url?: string;
      }
    | Array<{
        '@type': 'Offer';
        availability: string;
        price?: number;
        priceCurrency?: string;
        url?: string;
      }>;
  [key: string]: any;
}

export interface HowToSchema extends StructuredData {
  '@type': 'HowTo';
  name: string;
  description?: string;
  image?: string | string[];
  totalTime?: string;
  estimatedCost?: {
    '@type': 'MonetaryAmount';
    currency: string;
    value: number;
  };
  supply?:
    | Array<{
        '@type': 'HowToSupply';
        name: string;
      }>
    | {
        '@type': 'HowToSupply';
        name: string;
      };
  tool?:
    | Array<{
        '@type': 'HowToTool';
        name: string;
      }>
    | {
        '@type': 'HowToTool';
        name: string;
      };
  step?: Array<{
    '@type': 'HowToStep';
    name: string;
    text: string;
    url?: string;
    image?: string | string[];
  }>;
  [key: string]: any;
}

export interface BreadcrumbSchema extends StructuredData {
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

export interface WebsiteSchema extends StructuredData {
  '@type': 'WebSite';
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: {
      '@type': 'EntryPoint';
      urlTemplate: string;
    };
    'query-input': string;
  };
}

export interface OrganizationSchema extends StructuredData {
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  description?: string;
  contactPoint?: Array<{
    '@type': 'ContactPoint';
    telephone?: string;
    contactType: string;
    email?: string;
  }>;
  sameAs?: string[];
}

export {};
