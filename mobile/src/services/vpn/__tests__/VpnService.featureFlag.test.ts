/**
 * VPN feature flag tests (M3)
 * Verifies that VPN operations throw a clear "Coming soon" error when the
 * feature flag is disabled (default), preventing silent no-ops.
 */

import { VpnService, VPN_COMING_SOON_MESSAGE } from '../VpnService';

// Mock SecureStorage
jest.mock('../../storage/SecureStorage', () => ({
  __esModule: true,
  default: {
    storeVpnCredentials: jest.fn().mockResolvedValue(undefined),
    getVpnCredentials: jest.fn().mockResolvedValue(null),
    removeVpnCredentials: jest.fn().mockResolvedValue(undefined),
    hasVpnCredentials: jest.fn().mockResolvedValue(false),
  },
}));

// Mock environment config with VPN disabled (default state)
jest.mock('../../../config/environment', () => ({
  config: {
    features: {
      enableVpn: false,
    },
  },
}));

describe('VpnService - Feature Flag (M3)', () => {
  let service: VpnService;

  beforeEach(() => {
    (VpnService as any).instance = null;
    service = VpnService.getInstance();
  });

  describe('when enableVpn is false (default)', () => {
    it('isVpnEnabled returns false', () => {
      expect(service.isVpnEnabled()).toBe(false);
    });

    it('connect throws a Coming soon error instead of silently returning true', async () => {
      await expect(service.connect('server-1')).rejects.toThrow(VPN_COMING_SOON_MESSAGE);
    });

    it('disconnect throws a Coming soon error', async () => {
      await expect(service.disconnect()).rejects.toThrow(VPN_COMING_SOON_MESSAGE);
    });

    it('switchServer throws a Coming soon error', async () => {
      await expect(service.switchServer('server-2')).rejects.toThrow(VPN_COMING_SOON_MESSAGE);
    });

    it('getConnectionStatus returns a disconnected status (safe to call)', () => {
      const status = service.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.server).toBeNull();
    });

    it('getAvailableServers returns an empty list (safe to call)', async () => {
      const servers = await service.getAvailableServers();
      expect(servers).toHaveLength(0);
    });
  });

  describe('credential storage helpers are always available regardless of flag', () => {
    it('saveServerCredentials delegates to secureStorage', async () => {
      const secureStorage = require('../../storage/SecureStorage').default;
      await service.saveServerCredentials('s1', 'user', 'pass');
      expect(secureStorage.storeVpnCredentials).toHaveBeenCalledWith('s1', 'user', 'pass', undefined, undefined);
    });

    it('hasCredentials delegates to secureStorage', async () => {
      const secureStorage = require('../../storage/SecureStorage').default;
      const result = await service.hasCredentials('s1');
      expect(secureStorage.hasVpnCredentials).toHaveBeenCalledWith('s1');
      expect(result).toBe(false);
    });
  });
});
