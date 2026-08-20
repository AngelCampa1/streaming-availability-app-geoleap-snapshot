/**
 * Comprehensive tests for vpnGuidanceService.ts
 *
 * Coverage Target: 90%+
 * Strategy: MSW v2 network-level mocking for all 4 API functions
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '@/config/api';
import {
  getContentVpnRecommendations,
  getGeneralVpnRecommendations,
  getVpnCountryAvailability,
  getBestVpnForLanguages,
  type VpnRecommendationDto,
  type CountryRecommendationDto,
  type GeneralVpnRecommendationRequest,
} from '../vpnGuidanceService';

// MSW server setup
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock data
const mockCountries: CountryRecommendationDto[] = [
  {
    countryCode: 'us',
    countryName: 'United States',
    audioLanguages: ['en', 'es'],
    subtitleLanguages: ['en', 'es', 'fr'],
    matchQuality: 'Perfect',
    streamingServices: ['Netflix', 'Hulu', 'Disney+'],
    availabilityScore: 98,
  },
  {
    countryCode: 'gb',
    countryName: 'United Kingdom',
    audioLanguages: ['en'],
    subtitleLanguages: ['en'],
    matchQuality: 'Good',
    streamingServices: ['Netflix', 'BBC iPlayer'],
    availabilityScore: 92,
  },
];

const mockRecommendations: VpnRecommendationDto[] = [
  {
    vpnName: 'NordVPN',
    countries: mockCountries,
    overallScore: 95,
    warnings: [],
  },
  {
    vpnName: 'ExpressVPN',
    countries: [mockCountries[0]],
    overallScore: 90,
    warnings: ['Limited servers in UK'],
  },
];

describe('getContentVpnRecommendations', () => {
  it('should fetch VPN recommendations for content without language parameters', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('contentId')).toBe('movie-123');
        expect(url.searchParams.getAll('audioLanguages')).toEqual([]);
        expect(url.searchParams.getAll('subtitleLanguages')).toEqual([]);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getContentVpnRecommendations('movie-123');

    expect(result).toEqual(mockRecommendations);
    expect(result).toHaveLength(2);
    expect(result[0].vpnName).toBe('NordVPN');
    expect(result[0].overallScore).toBe(95);
  });

  it('should include audio languages as query parameters', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');

        expect(url.searchParams.get('contentId')).toBe('movie-456');
        expect(audioLanguages).toEqual(['en', 'es', 'fr']);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getContentVpnRecommendations('movie-456', ['en', 'es', 'fr']);

    expect(result).toEqual(mockRecommendations);
  });

  it('should include subtitle languages as query parameters', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(url.searchParams.get('contentId')).toBe('series-789');
        expect(subtitleLanguages).toEqual(['en', 'de']);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getContentVpnRecommendations('series-789', undefined, ['en', 'de']);

    expect(result).toEqual(mockRecommendations);
  });

  it('should include both audio and subtitle languages', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(audioLanguages).toEqual(['en', 'ja']);
        expect(subtitleLanguages).toEqual(['en', 'es', 'pt']);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getContentVpnRecommendations('anime-101', ['en', 'ja'], ['en', 'es', 'pt']);

    expect(result).toEqual(mockRecommendations);
  });

  it('should handle empty language arrays', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(audioLanguages).toEqual([]);
        expect(subtitleLanguages).toEqual([]);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getContentVpnRecommendations('movie-999', [], []);

    expect(result).toEqual(mockRecommendations);
  });

  it('should handle empty recommendations array', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, () => {
        return HttpResponse.json([]);
      })
    );

    const result = await getContentVpnRecommendations('unavailable-content');

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should handle recommendations with warnings', async () => {
    const recommendationsWithWarnings: VpnRecommendationDto[] = [
      {
        vpnName: 'NordVPN',
        countries: mockCountries,
        overallScore: 95,
        warnings: ['Geo-restrictions may apply', 'Speed may vary'],
      },
    ];

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, () => {
        return HttpResponse.json(recommendationsWithWarnings);
      })
    );

    const result = await getContentVpnRecommendations('restricted-content');

    expect(result[0].warnings).toHaveLength(2);
    expect(result[0].warnings).toContain('Geo-restrictions may apply');
  });

  it('should handle API errors', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, () => {
        return HttpResponse.json(
          { message: 'Content not found', error: 'NOT_FOUND' },
          { status: 404 }
        );
      })
    );

    await expect(getContentVpnRecommendations('invalid-id')).rejects.toThrow();
  });

  it('should handle network errors', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, () => {
        return HttpResponse.error();
      })
    );

    await expect(getContentVpnRecommendations('network-fail')).rejects.toThrow();
  });

  it('should verify correct query string construction with special characters', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/content-recommendations`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('contentId')).toBe('content-with-special-123');

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getContentVpnRecommendations('content-with-special-123');

    expect(result).toEqual(mockRecommendations);
  });
});

describe('getGeneralVpnRecommendations', () => {
  it('should fetch general VPN recommendations with minimal request', async () => {
    const request: GeneralVpnRecommendationRequest = {};

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request: req }) => {
        const url = new URL(req.url);
        expect(url.searchParams.getAll('audioLanguages')).toEqual([]);
        expect(url.searchParams.getAll('subtitleLanguages')).toEqual([]);
        expect(url.searchParams.getAll('preferredStreamingServices')).toEqual([]);
        expect(url.searchParams.get('countryCode')).toBeNull();

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getGeneralVpnRecommendations(request);

    expect(result).toEqual(mockRecommendations);
    expect(result).toHaveLength(2);
    expect(result[0].vpnName).toBe('NordVPN');
  });

  it('should include all optional fields in request', async () => {
    const request: GeneralVpnRecommendationRequest = {
      audioLanguages: ['en', 'de'],
      subtitleLanguages: ['en', 'es'],
      preferredStreamingServices: ['Netflix', 'Disney+', 'Hulu'],
      countryCode: 'de',
    };

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request: req }) => {
        const url = new URL(req.url);
        expect(url.searchParams.getAll('audioLanguages')).toEqual(['en', 'de']);
        expect(url.searchParams.getAll('subtitleLanguages')).toEqual(['en', 'es']);
        expect(url.searchParams.getAll('preferredStreamingServices')).toEqual([
          'Netflix',
          'Disney+',
          'Hulu',
        ]);
        expect(url.searchParams.get('countryCode')).toBe('de');

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getGeneralVpnRecommendations(request);

    expect(result).toEqual(mockRecommendations);
  });

  it('should handle only audio languages', async () => {
    const request: GeneralVpnRecommendationRequest = {
      audioLanguages: ['ja', 'en'],
    };

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request: req }) => {
        const url = new URL(req.url);
        expect(url.searchParams.getAll('audioLanguages')).toEqual(['ja', 'en']);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getGeneralVpnRecommendations(request);

    expect(result).toEqual(mockRecommendations);
  });

  it('should handle only subtitle languages', async () => {
    const request: GeneralVpnRecommendationRequest = {
      subtitleLanguages: ['en', 'fr', 'de'],
    };

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request: req }) => {
        const url = new URL(req.url);
        expect(url.searchParams.getAll('subtitleLanguages')).toEqual(['en', 'fr', 'de']);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getGeneralVpnRecommendations(request);

    expect(result).toEqual(mockRecommendations);
  });

  it('should handle only preferred streaming services', async () => {
    const request: GeneralVpnRecommendationRequest = {
      preferredStreamingServices: ['HBO Max', 'Prime Video'],
    };

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request: req }) => {
        const url = new URL(req.url);
        expect(url.searchParams.getAll('preferredStreamingServices')).toEqual([
          'HBO Max',
          'Prime Video',
        ]);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getGeneralVpnRecommendations(request);

    expect(result).toEqual(mockRecommendations);
  });

  it('should handle only country code', async () => {
    const request: GeneralVpnRecommendationRequest = {
      countryCode: 'us',
    };

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request: req }) => {
        const url = new URL(req.url);
        expect(url.searchParams.get('countryCode')).toBe('us');

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getGeneralVpnRecommendations(request);

    expect(result).toEqual(mockRecommendations);
  });

  it('should handle empty arrays for languages and services', async () => {
    const request: GeneralVpnRecommendationRequest = {
      audioLanguages: [],
      subtitleLanguages: [],
      preferredStreamingServices: [],
    };

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request: req }) => {
        const url = new URL(req.url);
        expect(url.searchParams.getAll('audioLanguages')).toEqual([]);
        expect(url.searchParams.getAll('subtitleLanguages')).toEqual([]);
        expect(url.searchParams.getAll('preferredStreamingServices')).toEqual([]);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getGeneralVpnRecommendations(request);

    expect(result).toEqual(mockRecommendations);
  });

  it('should handle empty recommendations', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, () => {
        return HttpResponse.json([]);
      })
    );

    const result = await getGeneralVpnRecommendations({});

    expect(result).toEqual([]);
  });

  it('should handle API validation errors', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, () => {
        return HttpResponse.json(
          { message: 'Invalid country code', error: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      })
    );

    await expect(getGeneralVpnRecommendations({ countryCode: 'invalid' })).rejects.toThrow();
  });

  it('should handle server errors', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, () => {
        return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
      })
    );

    await expect(getGeneralVpnRecommendations({})).rejects.toThrow();
  });

  it('should handle network errors', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, () => {
        return HttpResponse.error();
      })
    );

    await expect(getGeneralVpnRecommendations({})).rejects.toThrow();
  });

  it('should handle many streaming services', async () => {
    const request: GeneralVpnRecommendationRequest = {
      preferredStreamingServices: [
        'Netflix',
        'Disney+',
        'Hulu',
        'HBO Max',
        'Prime Video',
        'Apple TV+',
        'Paramount+',
      ],
    };

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request: req }) => {
        const url = new URL(req.url);
        const services = url.searchParams.getAll('preferredStreamingServices');
        expect(services).toHaveLength(7);
        expect(services).toContain('Netflix');
        expect(services).toContain('Paramount+');

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getGeneralVpnRecommendations(request);

    expect(result).toEqual(mockRecommendations);
  });
});

describe('getVpnCountryAvailability', () => {
  it('should fetch VPN country availability without language parameters', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('vpnName')).toBe('NordVPN');
        expect(url.searchParams.getAll('audioLanguages')).toEqual([]);
        expect(url.searchParams.getAll('subtitleLanguages')).toEqual([]);

        return HttpResponse.json(mockCountries);
      })
    );

    const result = await getVpnCountryAvailability('NordVPN');

    expect(result).toEqual(mockCountries);
    expect(result).toHaveLength(2);
    expect(result[0].countryCode).toBe('us');
  });

  it('should include audio languages as query parameters', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');

        expect(url.searchParams.get('vpnName')).toBe('ExpressVPN');
        expect(audioLanguages).toEqual(['en', 'es']);

        return HttpResponse.json(mockCountries);
      })
    );

    const result = await getVpnCountryAvailability('ExpressVPN', ['en', 'es']);

    expect(result).toEqual(mockCountries);
  });

  it('should include subtitle languages as query parameters', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, ({ request }) => {
        const url = new URL(request.url);
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(url.searchParams.get('vpnName')).toBe('Surfshark');
        expect(subtitleLanguages).toEqual(['en', 'fr', 'de']);

        return HttpResponse.json(mockCountries);
      })
    );

    const result = await getVpnCountryAvailability('Surfshark', undefined, ['en', 'fr', 'de']);

    expect(result).toEqual(mockCountries);
  });

  it('should include both audio and subtitle languages', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(audioLanguages).toEqual(['en']);
        expect(subtitleLanguages).toEqual(['en', 'ja']);

        return HttpResponse.json(mockCountries);
      })
    );

    const result = await getVpnCountryAvailability('CyberGhost', ['en'], ['en', 'ja']);

    expect(result).toEqual(mockCountries);
  });

  it('should handle VPN names with spaces', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('vpnName')).toBe('Private Internet Access');

        return HttpResponse.json(mockCountries);
      })
    );

    const result = await getVpnCountryAvailability('Private Internet Access');

    expect(result).toEqual(mockCountries);
  });

  it('should handle empty language arrays', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.getAll('audioLanguages')).toEqual([]);
        expect(url.searchParams.getAll('subtitleLanguages')).toEqual([]);

        return HttpResponse.json(mockCountries);
      })
    );

    const result = await getVpnCountryAvailability('NordVPN', [], []);

    expect(result).toEqual(mockCountries);
  });

  it('should handle empty availability array', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, () => {
        return HttpResponse.json([]);
      })
    );

    const result = await getVpnCountryAvailability('UnknownVPN');

    expect(result).toEqual([]);
  });

  it('should handle countries with different match qualities', async () => {
    const countriesWithMatches: CountryRecommendationDto[] = [
      { ...mockCountries[0], matchQuality: 'Perfect' },
      { ...mockCountries[1], matchQuality: 'Good' },
      { ...mockCountries[0], countryCode: 'ca', matchQuality: 'Partial' },
      { ...mockCountries[1], countryCode: 'au', matchQuality: 'None' },
    ];

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, () => {
        return HttpResponse.json(countriesWithMatches);
      })
    );

    const result = await getVpnCountryAvailability('NordVPN');

    expect(result).toHaveLength(4);
    expect(result[0].matchQuality).toBe('Perfect');
    expect(result[1].matchQuality).toBe('Good');
    expect(result[2].matchQuality).toBe('Partial');
    expect(result[3].matchQuality).toBe('None');
  });

  it('should handle API errors for invalid VPN name', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, () => {
        return HttpResponse.json(
          { message: 'VPN not found', error: 'NOT_FOUND' },
          { status: 404 }
        );
      })
    );

    await expect(getVpnCountryAvailability('InvalidVPN')).rejects.toThrow();
  });

  it('should handle network errors', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/country-availability`, () => {
        return HttpResponse.error();
      })
    );

    await expect(getVpnCountryAvailability('NordVPN')).rejects.toThrow();
  });
});

describe('getBestVpnForLanguages', () => {
  it('should fetch best VPN and return first recommendation', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(audioLanguages).toEqual(['en', 'es']);
        expect(subtitleLanguages).toEqual(['en', 'fr']);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getBestVpnForLanguages(['en', 'es'], ['en', 'fr']);

    expect(result).not.toBeNull();
    expect(result?.vpnName).toBe('NordVPN');
    expect(result?.overallScore).toBe(95);
  });

  it('should return null when no recommendations found', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, () => {
        return HttpResponse.json([]);
      })
    );

    const result = await getBestVpnForLanguages(['rare-lang'], ['another-rare']);

    expect(result).toBeNull();
  });

  it('should handle only audio languages', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(audioLanguages).toEqual(['ja', 'en']);
        expect(subtitleLanguages).toEqual([]);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getBestVpnForLanguages(['ja', 'en'], []);

    expect(result).not.toBeNull();
    expect(result?.vpnName).toBe('NordVPN');
  });

  it('should handle only subtitle languages', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(audioLanguages).toEqual([]);
        expect(subtitleLanguages).toEqual(['en', 'de', 'fr']);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getBestVpnForLanguages([], ['en', 'de', 'fr']);

    expect(result).not.toBeNull();
  });

  it('should handle empty language arrays', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(audioLanguages).toEqual([]);
        expect(subtitleLanguages).toEqual([]);

        return HttpResponse.json([]);
      })
    );

    const result = await getBestVpnForLanguages([], []);

    expect(result).toBeNull();
  });

  it('should return first recommendation even when multiple exist', async () => {
    const multipleRecommendations: VpnRecommendationDto[] = [
      mockRecommendations[0],
      mockRecommendations[1],
      { ...mockRecommendations[0], vpnName: 'Surfshark', overallScore: 88 },
    ];

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, () => {
        return HttpResponse.json(multipleRecommendations);
      })
    );

    const result = await getBestVpnForLanguages(['en'], ['en']);

    expect(result).not.toBeNull();
    expect(result?.vpnName).toBe('NordVPN'); // First one
  });

  it('should handle single language in each category', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const audioLanguages = url.searchParams.getAll('audioLanguages');
        const subtitleLanguages = url.searchParams.getAll('subtitleLanguages');

        expect(audioLanguages).toEqual(['ko']);
        expect(subtitleLanguages).toEqual(['en']);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getBestVpnForLanguages(['ko'], ['en']);

    expect(result).not.toBeNull();
    expect(result?.vpnName).toBe('NordVPN');
  });

  it('should handle many languages in each category', async () => {
    const audioLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt'];
    const subtitleLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko'];

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, ({ request }) => {
        const url = new URL(request.url);
        const audio = url.searchParams.getAll('audioLanguages');
        const subtitle = url.searchParams.getAll('subtitleLanguages');

        expect(audio).toEqual(audioLanguages);
        expect(subtitle).toEqual(subtitleLanguages);

        return HttpResponse.json(mockRecommendations);
      })
    );

    const result = await getBestVpnForLanguages(audioLanguages, subtitleLanguages);

    expect(result).not.toBeNull();
  });

  it('should handle API errors', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, () => {
        return HttpResponse.json(
          { message: 'Invalid language codes', error: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      })
    );

    await expect(getBestVpnForLanguages(['invalid'], ['invalid'])).rejects.toThrow();
  });

  it('should handle network errors', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, () => {
        return HttpResponse.error();
      })
    );

    await expect(getBestVpnForLanguages(['en'], ['en'])).rejects.toThrow();
  });

  it('should handle recommendation with warnings', async () => {
    const recommendationWithWarnings: VpnRecommendationDto[] = [
      {
        ...mockRecommendations[0],
        warnings: ['Limited availability in some regions'],
      },
    ];

    server.use(
      http.get(`${API_BASE_URL}/api/vpn-guidance/recommendations`, () => {
        return HttpResponse.json(recommendationWithWarnings);
      })
    );

    const result = await getBestVpnForLanguages(['en'], ['en']);

    expect(result).not.toBeNull();
    expect(result?.warnings).toHaveLength(1);
    expect(result?.warnings[0]).toBe('Limited availability in some regions');
  });
});
