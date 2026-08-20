/**
 * VPN Service - Stub Implementation
 * TODO: Implement full VPN functionality
 *
 * BUG-178 FIX: VPN credentials MUST be stored using SecureStorage
 * NEVER store credentials in AsyncStorage or plaintext
 *
 * Example secure credential storage:
 * ```
 * import secureStorage from '../storage/SecureStorage';
 *
 * // Store credentials securely (excludes from backups, uses Keychain/Keystore)
 * await secureStorage.storeVpnCredentials(
 *   serverId,
 *   username,
 *   password,
 *   serverUrl,
 *   { protocol: 'OpenVPN', port: 1194 }
 * );
 *
 * // Retrieve credentials
 * const credentials = await secureStorage.getVpnCredentials(serverId);
 *
 * // Remove credentials
 * await secureStorage.removeVpnCredentials(serverId);
 * ```
 */

import secureStorage from '../storage/SecureStorage';
import { config } from '../../config/environment';

// VPN_COMING_SOON: VPN functionality is not yet implemented.
// The enableVpn feature flag (default false) gates all VPN operations.
// When false, connect/disconnect/switchServer return a clear error so the UI
// can show a "Coming soon" state instead of silently doing nothing.
export const VPN_COMING_SOON_MESSAGE =
  'VPN functionality is coming soon. Stay tuned for updates!';

export interface VpnServer {
  id: string;
  name: string;
  country: string;
  city: string;
  load: number;
  streamingOptimized: boolean;
}

export interface VpnConnection {
  connected: boolean;
  server: VpnServer | null;
  connectionTime: number | null;
  bytesSent: number;
  bytesReceived: number;
}

export class VpnService {
  private static instance: VpnService;

  static getInstance(): VpnService {
    if (!VpnService.instance) {
      VpnService.instance = new VpnService();
    }
    return VpnService.instance;
  }

  /**
   * Returns true if VPN functionality is enabled via the feature flag.
   * When false the UI should display a "Coming soon" state.
   */
  isVpnEnabled(): boolean {
    return config.features.enableVpn;
  }

  async connect(_serverId: string): Promise<boolean> {
    if (!config.features.enableVpn) {
      throw new Error(VPN_COMING_SOON_MESSAGE);
    }
    // Real VPN connect implementation goes here once the feature is enabled.
    return false;
  }

  async disconnect(): Promise<void> {
    if (!config.features.enableVpn) {
      throw new Error(VPN_COMING_SOON_MESSAGE);
    }
    // Real VPN disconnect implementation goes here once the feature is enabled.
  }

  async switchServer(_serverId: string): Promise<boolean> {
    if (!config.features.enableVpn) {
      throw new Error(VPN_COMING_SOON_MESSAGE);
    }
    // Real server-switch implementation goes here once the feature is enabled.
    return false;
  }

  getConnectionStatus(): VpnConnection {
    return {
      connected: false,
      server: null,
      connectionTime: null,
      bytesSent: 0,
      bytesReceived: 0,
    };
  }

  async getAvailableServers(): Promise<VpnServer[]> {
    return [];
  }

  /**
   * Save VPN server credentials securely
   * BUG-178: Credentials are stored in iOS Keychain / Android Keystore
   * Excluded from device backups using WHEN_UNLOCKED_THIS_DEVICE_ONLY
   */
  async saveServerCredentials(
    serverId: string,
    username: string,
    password: string,
    serverUrl?: string,
    serverConfig?: Record<string, unknown>
  ): Promise<void> {
    await secureStorage.storeVpnCredentials(serverId, username, password, serverUrl, serverConfig);
  }

  /**
   * Remove saved credentials for a server
   */
  async removeServerCredentials(serverId: string): Promise<void> {
    await secureStorage.removeVpnCredentials(serverId);
  }

  /**
   * Check if credentials exist for a server
   */
  async hasCredentials(serverId: string): Promise<boolean> {
    return await secureStorage.hasVpnCredentials(serverId);
  }
}

export const vpnService = VpnService.getInstance();
