/**
 * Global type definitions for TypeScript compilation
 */

// Global references to content types
declare global {
  type CastMember = import('@/lib/api/content').CastMember;
  type CrewMember = import('@/lib/api/content').CrewMember;
  type ContentData = import('@/lib/api/content').ContentData;
  type StreamingOption = import('@/lib/api/content').StreamingOption;
}

// Template string types for SEO
export interface TemplateString {
  length: number;
  toLowerCase(): string;
  split(separator: string): string[];
  toString(): string;
}

export interface DefaultTemplateString extends TemplateString {
  // Specific implementation for default template strings
  readonly isDefault: true;
}

// Schema markup types
export interface MovieSchema {
  '@type': 'Movie';
  name: string;
  description?: string;
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    ratingCount: number;
    bestRating: number;
    worstRating: number;
  };
  actor?: Array<{
    '@type': 'Person';
    name: string;
  }>;
  director?: Array<{
    '@type': 'Person';
    name: string;
  }>;
  genre?: string[];
  datePublished?: string;
  duration?: string;
  contentRating?: string;
  image?: string;
  url?: string;
}

export interface BreadcrumbSchema {
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

// Twitter metadata types
export interface TwitterMetadata {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface Twitter extends TwitterMetadata {
  // Alias for backward compatibility
  data?: string;
}

// Mock URL search params for tests
export interface MockURLSearchParams {
  get(name: string): string | null;
  has(name: string): boolean;
  append(name: string, value: string): void;
  delete(name: string): void;
  set(name: string, value: string): void;
  sort(): void;
  toString(): string;
  forEach(callback: (value: string, key: string) => void): void;
  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  [Symbol.iterator](): IterableIterator<[string, string]>;
}

export {};
