import { genreGuides, getGenreBySlug, type GenreGuide, type GenrePlatformEntry } from '@/data/genres';
import { countries, getCountryBySlug, type StreamingCountry } from '@/data/countries';
import { platforms } from '@/data/platforms';

export interface GenreCountryData {
  genre: GenreGuide;
  country: StreamingCountry;
  availablePlatforms: GenrePlatformEntry[];
  unavailablePlatforms: GenrePlatformEntry[];
  isTopCountry: boolean;
  topCountryReason: string | null;
}

/**
 * Cross-references genre and country data to determine which genre platforms
 * are available in a given country.
 *
 * @returns null if genre or country not found
 */
export function getGenreCountryData(
  genreSlug: string,
  countrySlug: string,
): GenreCountryData | null {
  const genre = getGenreBySlug(genreSlug);
  const country = getCountryBySlug(countrySlug);

  if (!genre || !country) return null;

  const availablePlatforms = genre.bestPlatforms.filter((bp) =>
    country.availablePlatforms.includes(bp.platformSlug),
  );

  const unavailablePlatforms = genre.bestPlatforms.filter(
    (bp) => !country.availablePlatforms.includes(bp.platformSlug),
  );

  const topCountryEntry = genre.bestCountriesFor.find(
    (tc) => tc.countrySlug === countrySlug,
  );

  return {
    genre,
    country,
    availablePlatforms,
    unavailablePlatforms,
    isTopCountry: !!topCountryEntry,
    topCountryReason: topCountryEntry?.reason ?? null,
  };
}

export { genreGuides, countries, platforms };
