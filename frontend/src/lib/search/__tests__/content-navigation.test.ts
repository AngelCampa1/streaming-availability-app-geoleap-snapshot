import { buildContentPath, buildContentPathFromResult } from '../content-navigation';
import { ContentType, PaywalledSearchResult } from '@/lib/types/paywall';

const makeResult = (overrides: Partial<PaywalledSearchResult> = {}): PaywalledSearchResult => ({
  id: '550',
  title: 'Fight Club',
  type: ContentType.Movie,
  availableCountries: 0,
  relevanceScore: 0,
  isPaywalled: false,
  ...overrides,
});

describe('buildContentPathFromResult', () => {
  it('routes a movie to /content/movie/{id}-{slug}', () => {
    const path = buildContentPathFromResult(makeResult({ type: ContentType.Movie }));
    expect(path).toBe('/content/movie/550-fight-club');
  });

  it('routes a TV show to the /content/tv-show segment', () => {
    const path = buildContentPathFromResult(
      makeResult({ id: '1399', title: 'Game of Thrones', type: ContentType.Show })
    );
    expect(path).toBe('/content/tv-show/1399-game-of-thrones');
  });

  it('routes a documentary to the /content/documentary segment', () => {
    const path = buildContentPathFromResult(
      makeResult({ id: '700', title: 'Planet Earth', type: ContentType.Documentary })
    );
    expect(path).toBe('/content/documentary/700-planet-earth');
  });

  it('routes anime to the /content/anime segment', () => {
    const path = buildContentPathFromResult(
      makeResult({ id: '900', title: 'Cowboy Bebop', type: ContentType.Anime })
    );
    expect(path).toBe('/content/anime/900-cowboy-bebop');
  });

  it('falls back to the movie segment for the All / unknown type', () => {
    const path = buildContentPathFromResult(makeResult({ type: ContentType.All }));
    expect(path).toBe('/content/movie/550-fight-club');
  });

  it('includes the release year in the slug when present', () => {
    const path = buildContentPathFromResult(makeResult({ year: 1999 }));
    expect(path).toBe('/content/movie/550-fight-club-1999');
  });

  it('produces a route segment the backend accepts (no 404 from id-only paths)', () => {
    const path = buildContentPathFromResult(makeResult({ type: ContentType.Show }));
    // Must be /content/{type}/{slug}, never /content/{id}
    expect(path).toMatch(/^\/content\/(movie|tv-show|documentary|anime)\/.+/);
  });
});

describe('buildContentPath', () => {
  it('builds /content/{segment}/{id}-{slug} from an explicit segment', () => {
    expect(buildContentPath('tv-show', '1399', 'Game of Thrones')).toBe(
      '/content/tv-show/1399-game-of-thrones'
    );
  });

  it('appends the year to the slug when provided', () => {
    expect(buildContentPath('movie', '550', 'Fight Club', 1999)).toBe(
      '/content/movie/550-fight-club-1999'
    );
  });
});
