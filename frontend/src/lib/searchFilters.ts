/**
 * Shared search filter option lists.
 *
 * Single source of truth for the genres, countries, and services options
 * shown in both the desktop FilterSidebar and the mobile MobileFilterDrawer.
 */

import type { FilterSidebarProps } from '@/components/search/FilterSidebar';

/** Required shape — matches the `availableFilters` prop on FilterSidebarProps. */
type AvailableFilters = Required<NonNullable<FilterSidebarProps['availableFilters']>>;

export const AVAILABLE_SEARCH_FILTERS: AvailableFilters = {
  genres: [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Horror',
    'Romance',
    'Sci-Fi',
    'Thriller',
    'Mystery',
    'Fantasy',
    'Animation',
    'Documentary',
    'Crime',
    'Family',
    'Biography',
    'History',
    'Music',
    'Sport',
    'War',
    'Western',
  ],
  countries: [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Japan',
    'South Korea',
    'Italy',
    'Spain',
    'India',
    'China',
    'Brazil',
    'Mexico',
    'Netherlands',
    'Sweden',
  ],
  services: [
    'Netflix',
    'Amazon Prime',
    'Disney Plus',
    'Hulu',
    'HBO Max',
    'Apple TV+',
    'Paramount+',
    'Peacock',
    'Discovery+',
    'Starz',
    'Showtime',
    'Crunchyroll',
    'YouTube Premium',
    'Pluto TV',
  ],
};
