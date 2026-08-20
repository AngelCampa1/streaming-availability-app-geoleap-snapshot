/**
 * MSW VPN Handlers
 *
 * Handles VPN-related API mocking:
 * - VPN connection lifecycle (connect, disconnect, status)
 * - Server listing and selection
 * - Connection statistics
 */

import { http, HttpResponse, delay } from 'msw';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.geoleap.app';

/**
 * Helper to safely get URL search params
 * Works around TypeScript not recognizing polyfilled URLSearchParams.get()
 */
const getSearchParam = (url: URL, param: string): string | null => {
  return (url.searchParams as any).get(param);
};

// Mock VPN server data
export const mockVpnServers = [
  {
    id: 'us-east-1',
    name: 'US East',
    country: 'United States',
    city: 'New York',
    load: 45,
    streamingOptimized: true,
  },
  {
    id: 'uk-london-1',
    name: 'UK London',
    country: 'United Kingdom',
    city: 'London',
    load: 62,
    streamingOptimized: true,
  },
  {
    id: 'jp-tokyo-1',
    name: 'Japan Tokyo',
    country: 'Japan',
    city: 'Tokyo',
    load: 38,
    streamingOptimized: false,
  },
];

// Track connection state (for testing state transitions)
let mockConnectionState = {
  connected: false,
  serverId: null as string | null,
  connectedAt: null as string | null,
  bytesSent: 0,
  bytesReceived: 0,
};

export const vpnHandlers = [
  // POST /vpn/connect - Connect to VPN server
  http.post(`${BASE_URL}/vpn/connect`, async ({ request }) => {
    await delay(100);

    const body = await request.json() as { serverId: string };

    // Simulate server not found error
    if (body.serverId === 'invalid-server') {
      return HttpResponse.json(
        { error: 'Server not found', code: 'SERVER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Simulate connection failure
    if (body.serverId === 'fail-connect') {
      return HttpResponse.json(
        { error: 'Failed to establish VPN connection', code: 'CONNECTION_FAILED' },
        { status: 500 }
      );
    }

    // Successful connection
    const server = mockVpnServers.find(s => s.id === body.serverId);
    mockConnectionState = {
      connected: true,
      serverId: body.serverId,
      connectedAt: new Date().toISOString(),
      bytesSent: 0,
      bytesReceived: 0,
    };

    return HttpResponse.json({
      success: true,
      server: server || { id: body.serverId, connected: true },
      connectionTime: mockConnectionState.connectedAt,
    });
  }),

  // POST /vpn/disconnect - Disconnect from VPN
  http.post(`${BASE_URL}/vpn/disconnect`, async () => {
    await delay(50);

    mockConnectionState = {
      connected: false,
      serverId: null,
      connectedAt: null,
      bytesSent: 0,
      bytesReceived: 0,
    };

    return HttpResponse.json({ success: true });
  }),

  // POST /vpn/switch - Switch to different server
  http.post(`${BASE_URL}/vpn/switch`, async ({ request }) => {
    await delay(150);

    const body = await request.json() as { serverId: string };
    const server = mockVpnServers.find(s => s.id === body.serverId);

    mockConnectionState = {
      ...mockConnectionState,
      serverId: body.serverId,
      connectedAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      success: true,
      server: server || { id: body.serverId },
    });
  }),

  // GET /vpn/servers - Get available VPN servers
  http.get(`${BASE_URL}/vpn/servers`, async ({ request }) => {
    await delay(100);

    const url = new URL(request.url);
    const streamingOnly = getSearchParam(url, 'streamingOptimized') === 'true';

    const servers = streamingOnly
      ? mockVpnServers.filter(s => s.streamingOptimized)
      : mockVpnServers;

    return HttpResponse.json({
      servers,
      total: servers.length,
    });
  }),

  // GET /vpn/status - Get current connection status
  http.get(`${BASE_URL}/vpn/status`, async () => {
    await delay(50);

    return HttpResponse.json({
      connected: mockConnectionState.connected,
      server: mockConnectionState.serverId
        ? mockVpnServers.find(s => s.id === mockConnectionState.serverId) || null
        : null,
      connectionTime: mockConnectionState.connectedAt,
      bytesSent: mockConnectionState.bytesSent,
      bytesReceived: mockConnectionState.bytesReceived,
    });
  }),

  // GET /vpn/server/:id - Get specific server details
  http.get(`${BASE_URL}/vpn/server/:serverId`, async ({ params }) => {
    await delay(50);

    const { serverId } = params;
    const server = mockVpnServers.find(s => s.id === serverId);

    if (!server) {
      return HttpResponse.json(
        { error: 'Server not found', code: 'SERVER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ server });
  }),

  // GET /api/vpnguidance/countries-for-content/:contentId - Get VPN country recommendations
  http.get('*/api/vpnguidance/countries-for-content/:contentId', async () => {
    await delay(50);

    return HttpResponse.json({
      contentId: 'tt1234567',
      contentTitle: 'Breaking Bad',
      recommendedCountries: [
        {
          countryCode: 'US',
          countryName: 'United States',
          countryFlag: '🇺🇸',
          languageMatchQuality: 'Perfect',
          streamingServices: ['netflix', 'prime'],
          audioLanguages: ['en'],
          subtitleLanguages: ['en', 'es'],
        },
        {
          countryCode: 'GB',
          countryName: 'United Kingdom',
          countryFlag: '🇬🇧',
          languageMatchQuality: 'Good',
          streamingServices: ['netflix'],
          audioLanguages: ['en'],
          subtitleLanguages: ['en'],
        },
        {
          countryCode: 'DE',
          countryName: 'Germany',
          countryFlag: '🇩🇪',
          languageMatchQuality: 'Partial',
          streamingServices: ['prime'],
          audioLanguages: ['de'],
          subtitleLanguages: ['en', 'de'],
        },
      ],
    });
  }),
];

/**
 * Reset VPN connection state (for test cleanup)
 */
export function resetVpnState() {
  mockConnectionState = {
    connected: false,
    serverId: null,
    connectedAt: null,
    bytesSent: 0,
    bytesReceived: 0,
  };
}
