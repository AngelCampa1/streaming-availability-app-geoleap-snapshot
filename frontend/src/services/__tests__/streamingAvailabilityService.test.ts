import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { streamingAvailabilityService } from '../streamingAvailabilityService';
import type {
  StreamingServiceInfo,
} from '../streamingAvailabilityService';
import {
  StreamingOptionType,
  StreamingOptionQualityEnum,
  type Service as OfficialService,
  type ServiceInfo as OfficialServiceInfo,
  type StreamingOption as OfficialStreamingOption,
} from 'streaming-availability';
import { StreamingServiceType } from '@/lib/api';

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const API_URL = 'http://localhost:8020';
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock official library ServiceInfo (used in StreamingOption.service)
const mockOfficialServiceInfo: OfficialServiceInfo = {
  id: 'netflix',
  name: 'Netflix',
  homePage: 'https://netflix.com',
  themeColorCode: '#e50914',
  imageSet: {
    lightThemeImage: 'https://example.com/netflix-logo-light.png',
    darkThemeImage: 'https://example.com/netflix-logo-dark.png',
    whiteImage: 'https://example.com/netflix-logo-white.png',
  },
};

// Mock official library streaming option
const mockOfficialStreamingOption: OfficialStreamingOption = {
  service: mockOfficialServiceInfo,
  type: StreamingOptionType.Subscription,
  link: 'https://www.netflix.com/watch/12345',
  videoLink: 'https://www.netflix.com/embed/12345',
  quality: StreamingOptionQualityEnum.Uhd,
  audios: [{ language: 'eng' }, { language: 'jpn' }],
  subtitles: [
    { locale: { language: 'eng' }, closedCaptions: false },
    { locale: { language: 'spa' }, closedCaptions: false },
  ],
  price: {
    amount: '15.99',
    currency: 'USD',
    formatted: '$15.99',
  },
  expiresOn: Math.floor(Date.now() / 1000) + 86400 * 30,
  availableSince: Math.floor(Date.now() / 1000) - 86400 * 2,
  expiresSoon: true,
};

// Mock official library Service (full service with addons)
const mockOfficialService: OfficialService = {
  id: 'hulu',
  name: 'Hulu',
  homePage: 'https://hulu.com',
  themeColorCode: '#1ce783',
  imageSet: {
    lightThemeImage: 'https://example.com/hulu-logo-light.png',
    darkThemeImage: 'https://example.com/hulu-logo-dark.png',
    whiteImage: 'https://example.com/hulu-logo-white.png',
  },
  streamingOptionTypes: {
    subscription: true,
    free: false,
    rent: false,
    buy: false,
    addon: false,
  },
  addons: [],
};

const mockServiceInfo: StreamingServiceInfo[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    displayName: 'Netflix',
    description: 'Streaming service',
    logoUrl: 'https://example.com/netflix-logo.png',
    websiteUrl: 'https://netflix.com',
    type: StreamingServiceType.Subscription,
    category: 'streaming',
    isGlobal: true,
    isActive: true,
    sortOrder: 1,
    availableRegions: ['us', 'gb', 'ca'],
    popularRegions: ['us', 'gb'],
    themeColorCode: '#e50914',
    homePage: 'https://netflix.com',
  },
];

describe.skip('StreamingAvailabilityService - Converter Functions', () => {
  describe.skip('convertStreamingOption', () => {
    it('should convert official streaming option to enhanced format', () => {
      const result = streamingAvailabilityService.convertStreamingOption(mockOfficialStreamingOption);

      expect(result.serviceId).toBe('netflix');
      expect(result.serviceName).toBe('Netflix');
      expect(result.type).toBe('subscription');
      expect(result.price).toBe(15.99);
      expect(result.currency).toBe('USD');
      expect(result.quality).toEqual(['uhd']);
      expect(result.audioLanguages).toEqual(['eng', 'jpn']);
      expect(result.subtitleLanguages).toEqual(['eng', 'spa']);
    });

    it('should map all streaming option types correctly', () => {
      const testCases = [
        { type: StreamingOptionType.Subscription, expected: 'subscription' },
        { type: StreamingOptionType.Rent, expected: 'rental' },
        { type: StreamingOptionType.Buy, expected: 'purchase' },
        { type: StreamingOptionType.Free, expected: 'free' },
        { type: StreamingOptionType.Addon, expected: 'ads' },
      ];

      testCases.forEach(({ type, expected }) => {
        const option: OfficialStreamingOption = { ...mockOfficialStreamingOption, type };
        const result = streamingAvailabilityService.convertStreamingOption(option);
        expect(result.type).toBe(expected);
      });
    });
  });

  describe.skip('convertServiceToCatalog', () => {
    it('should convert official service to catalog format', () => {
      const result = streamingAvailabilityService.convertServiceToCatalog(mockOfficialService);

      expect(result.id).toBe('hulu');
      expect(result.name).toBe('Hulu');
      expect(result.type).toBe(StreamingServiceType.Subscription);
      expect(result.category).toBe('streaming');
      expect(result.isGlobal).toBe(true);
    });
  });
});

describe.skip('StreamingAvailabilityService - API Methods', () => {
  describe.skip('getStreamingOptionsByTitle', () => {
    it('should fetch streaming options by title', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-availability/search/by-title`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('title')).toBe('Inception');
          return HttpResponse.json({ streamingOptions: [mockOfficialStreamingOption] });
        })
      );

      const result = await streamingAvailabilityService.getStreamingOptionsByTitle({ title: 'Inception' });
      expect(result).toHaveLength(1);
      expect(result[0].serviceId).toBe('netflix');
    });

    it('should return empty array on API error', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-availability/search/by-title`, () => {
          return new Response(null, { status: 500 });
        })
      );

      const result = await streamingAvailabilityService.getStreamingOptionsByTitle({ title: 'Test' });
      expect(result).toEqual([]);
    });
  });

  describe.skip('getStreamingOptionsById', () => {
    it('should fetch streaming options by content ID', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-availability/by-id`, () => {
          return HttpResponse.json({ streamingOptions: [mockOfficialStreamingOption] });
        })
      );

      const result = await streamingAvailabilityService.getStreamingOptionsById('tt1375666', 'movie');
      expect(result).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-availability/by-id`, () => {
          return new Response(null, { status: 500 });
        })
      );

      const result = await streamingAvailabilityService.getStreamingOptionsById('test', 'movie');
      expect(result).toEqual([]);
    });
  });

  describe.skip('getPopularStreamingServices', () => {
    it('should fetch popular streaming services', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-services/popular`, () => {
          return HttpResponse.json(mockServiceInfo);
        })
      );

      const result = await streamingAvailabilityService.getPopularStreamingServices();
      expect(result).toHaveLength(1);
    });

    it('should include country and limit parameters', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-services/popular`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('countryCode')).toBe('gb');
          expect(url.searchParams.get('limit')).toBe('5');
          return HttpResponse.json([]);
        })
      );

      await streamingAvailabilityService.getPopularStreamingServices('gb', 5);
    });

    it('should return empty array on error', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-services/popular`, () => {
          return new Response(null, { status: 500 });
        })
      );

      const result = await streamingAvailabilityService.getPopularStreamingServices();
      expect(result).toEqual([]);
    });
  });

  describe.skip('getStreamingOptionsByCountry', () => {
    it('should fetch options for multiple countries', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-availability/by-id`, ({ request }) => {
          const url = new URL(request.url);
          const country = url.searchParams.get('country');
          if (country === 'us') {
            return HttpResponse.json({ streamingOptions: [mockOfficialStreamingOption] });
          }
          return HttpResponse.json({ streamingOptions: [] });
        })
      );

      const result = await streamingAvailabilityService.getStreamingOptionsByCountry('test', 'movie', ['us', 'gb']);
      expect(result).toHaveLength(2);
      expect(result[0].country).toBe('us');
      expect(result[0].services).toHaveLength(1);
      expect(result[1].country).toBe('gb');
      expect(result[1].services).toHaveLength(0);
    });
  });

  describe.skip('searchContentWithAvailability', () => {
    it('should search content with streaming options', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-availability/search`, () => {
          return HttpResponse.json({
            results: [
              {
                id: 'test',
                title: 'Test Movie',
                year: 2020,
                type: 'movie',
                streamingOptions: [],
              },
            ],
            total: 1,
          });
        })
      );

      const result = await streamingAvailabilityService.searchContentWithAvailability({ query: 'Test' });
      expect(result.total).toBe(1);
      expect(result.results).toHaveLength(1);
    });

    it('should return empty results on error', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-availability/search`, () => {
          return new Response(null, { status: 500 });
        })
      );

      const result = await streamingAvailabilityService.searchContentWithAvailability({ query: 'Test' });
      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe.skip('getStreamingServicesCatalog', () => {
    it('should fetch streaming services catalog', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-services`, () => {
          return HttpResponse.json(mockServiceInfo);
        })
      );

      const result = await streamingAvailabilityService.getStreamingServicesCatalog();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('netflix');
    });
  });

  describe.skip('getAvailabilityChanges', () => {
    it('should identify expiring soon content', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-availability/by-id`, () => {
          return HttpResponse.json({ streamingOptions: [{ ...mockOfficialStreamingOption, expiresSoon: true }] });
        })
      );

      const result = await streamingAvailabilityService.getAvailabilityChanges('test-id', 'movie');
      expect(result.expiringSoon).toHaveLength(1);
    });

    it('should identify newly available content within last 7 days', async () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 86400 * 3; // 3 days ago
      const recentOption = {
        ...mockOfficialStreamingOption,
        availableSince: recentTimestamp,
        expiresSoon: false,
      };

      server.use(
        http.get(`${API_URL}/api/streaming-availability/by-id`, () => {
          return HttpResponse.json({ streamingOptions: [recentOption] });
        })
      );

      const result = await streamingAvailabilityService.getAvailabilityChanges('test-id', 'movie');
      expect(result.newlyAvailable).toHaveLength(1);
    });

    it('should not include content available more than 7 days ago', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 86400 * 10; // 10 days ago
      const oldOption = {
        ...mockOfficialStreamingOption,
        availableSince: oldTimestamp,
        expiresSoon: false,
      };

      server.use(
        http.get(`${API_URL}/api/streaming-availability/by-id`, () => {
          return HttpResponse.json({ streamingOptions: [oldOption] });
        })
      );

      const result = await streamingAvailabilityService.getAvailabilityChanges('test-id', 'movie');
      expect(result.newlyAvailable).toEqual([]);
    });

    it('should return empty arrays on error', async () => {
      server.use(
        http.get(`${API_URL}/api/streaming-availability/by-id`, () => {
          return new Response(null, { status: 500 });
        })
      );

      const result = await streamingAvailabilityService.getAvailabilityChanges('test-id', 'movie');
      expect(result.expiringSoon).toEqual([]);
      expect(result.newlyAvailable).toEqual([]);
    });
  });
});
