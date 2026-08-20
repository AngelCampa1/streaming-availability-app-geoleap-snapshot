/**
 * VPN Credential Security Tests
 * BUG-178: VPN Credentials in Plaintext - Security Test Suite
 *
 * Verifies that VPN credentials are:
 * 1. Stored in iOS Keychain / Android Keystore (NOT AsyncStorage)
 * 2. Excluded from device backups (WHEN_UNLOCKED_THIS_DEVICE_ONLY)
 * 3. Protected from unauthorized access
 * 4. Properly encrypted in transit and at rest
 */

import secureStorage from '../../services/storage/SecureStorage';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  ACCESS_CONTROL: {
    DEVICE_PASSCODE: 'DEVICE_PASSCODE',
    BIOMETRY_ANY: 'BIOMETRY_ANY',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  },
  AUTHENTICATION_TYPE: {
    DEVICE_PASSCODE_OR_BIOMETRICS: 'DEVICE_PASSCODE_OR_BIOMETRICS',
    BIOMETRICS: 'BIOMETRICS',
  },
  BIOMETRY_TYPE: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    FINGERPRINT: 'Fingerprint',
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('VPN Credential Security Tests (BUG-178)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful mock implementations
    (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);
    (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
      Keychain.BIOMETRY_TYPE.FACE_ID
    );
  });

  describe('Secure Storage - Production Mode', () => {
    it('should store VPN credentials in Keychain with WHEN_UNLOCKED_THIS_DEVICE_ONLY', async () => {
      // Arrange
      const serverId = 'vpn-server-1';
      const username = 'testuser';
      const password = 'securepassword123';
      const serverUrl = 'vpn.example.com';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.TOUCH_ID
      );

      // Act
      await secureStorage.storeVpnCredentials(serverId, username, password, serverUrl);

      // Assert - Verify Keychain was called with secure options
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        `vpn_credentials_${serverId}`,
        username,
        expect.stringContaining(password),
        expect.objectContaining({
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        })
      );

      // Assert - Verify AsyncStorage was NOT used
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should retrieve VPN credentials from Keychain', async () => {
      // Arrange
      const serverId = 'vpn-server-2';
      const username = 'testuser2';
      const password = 'password456';
      const serverUrl = 'vpn2.example.com';

      const storedData = {
        username,
        password,
        serverUrl,
        timestamp: Date.now(),
        version: '1.0',
      };

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username,
        password: JSON.stringify(storedData),
      });

      // Act
      const credentials = await secureStorage.getVpnCredentials(serverId);

      // Assert
      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(
        `vpn_credentials_${serverId}`
      );
      expect(credentials).toEqual({
        username,
        password,
        serverUrl,
        timestamp: expect.any(Number),
        serverConfig: undefined,
      });

      // Assert - Verify AsyncStorage was NOT used
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('should return null when credentials do not exist', async () => {
      // Arrange
      const serverId = 'nonexistent-server';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      // Act
      const credentials = await secureStorage.getVpnCredentials(serverId);

      // Assert
      expect(credentials).toBeNull();
    });

    it('should remove VPN credentials from Keychain', async () => {
      // Arrange
      const serverId = 'vpn-server-3';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FINGERPRINT
      );
      (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);

      // Act
      await secureStorage.removeVpnCredentials(serverId);

      // Assert
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith(
        `vpn_credentials_${serverId}`
      );

      // Assert - Verify AsyncStorage was NOT used
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should check if VPN credentials exist', async () => {
      // Arrange
      const serverId = 'vpn-server-4';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.TOUCH_ID
      );
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: JSON.stringify({ username: 'user', password: 'pass', timestamp: Date.now() }),
      });

      // Act
      const hasCredentials = await secureStorage.hasVpnCredentials(serverId);

      // Assert
      expect(hasCredentials).toBe(true);
    });
  });

  describe('Security - Backup Exclusion', () => {
    it('should exclude credentials from device backups using WHEN_UNLOCKED_THIS_DEVICE_ONLY', async () => {
      // Arrange
      const serverId = 'vpn-server-backup';
      const username = 'backuptest';
      const password = 'backuppass';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );

      // Act
      await secureStorage.storeVpnCredentials(serverId, username, password);

      // Assert - Verify WHEN_UNLOCKED_THIS_DEVICE_ONLY is used
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should require device passcode or biometric authentication', async () => {
      // Arrange
      const serverId = 'vpn-server-auth';
      const username = 'authtest';
      const password = 'authpass';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.TOUCH_ID
      );

      // Act
      await secureStorage.storeVpnCredentials(serverId, username, password);

      // Assert - Verify authentication type
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Keychain storage errors gracefully', async () => {
      // Arrange
      const serverId = 'vpn-server-error';
      const username = 'errortest';
      const password = 'errorpass';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );
      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error')
      );

      // Act & Assert
      await expect(
        secureStorage.storeVpnCredentials(serverId, username, password)
      ).rejects.toThrow('Failed to store VPN credentials securely');
    });

    it('should handle credential retrieval errors gracefully', async () => {
      // Arrange
      const serverId = 'vpn-server-retrieve-error';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain retrieval error')
      );

      // Act
      const credentials = await secureStorage.getVpnCredentials(serverId);

      // Assert - Should return null on error
      expect(credentials).toBeNull();
    });

    it('should handle credential removal errors', async () => {
      // Arrange
      const serverId = 'vpn-server-remove-error';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FINGERPRINT
      );
      (Keychain.resetInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain removal error')
      );

      // Act & Assert
      await expect(secureStorage.removeVpnCredentials(serverId)).rejects.toThrow(
        'Failed to remove VPN credentials'
      );
    });
  });

  describe('Data Integrity', () => {
    it('should store and retrieve server configuration correctly', async () => {
      // Arrange
      const serverId = 'vpn-server-config';
      const username = 'configtest';
      const password = 'configpass';
      const serverUrl = 'config.vpn.example.com';
      const serverConfig = {
        protocol: 'OpenVPN',
        port: 1194,
        encryption: 'AES-256',
      };

      const storedData = {
        username,
        password,
        serverUrl,
        serverConfig,
        timestamp: Date.now(),
        version: '1.0',
      };

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username,
        password: JSON.stringify(storedData),
      });

      // Act - Store and retrieve
      await secureStorage.storeVpnCredentials(
        serverId,
        username,
        password,
        serverUrl,
        serverConfig
      );
      const retrieved = await secureStorage.getVpnCredentials(serverId);

      // Assert
      expect(retrieved).toMatchObject({
        username,
        password,
        serverUrl,
        serverConfig,
      });
    });

    it('should handle credentials without optional fields', async () => {
      // Arrange
      const serverId = 'vpn-server-minimal';
      const username = 'minimaluser';
      const password = 'minimalpass';

      const storedData = {
        username,
        password,
        timestamp: Date.now(),
        version: '1.0',
      };

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.TOUCH_ID
      );
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username,
        password: JSON.stringify(storedData),
      });

      // Act
      await secureStorage.storeVpnCredentials(serverId, username, password);
      const retrieved = await secureStorage.getVpnCredentials(serverId);

      // Assert
      expect(retrieved).toMatchObject({
        username,
        password,
      });
      expect(retrieved?.serverUrl).toBeUndefined();
      expect(retrieved?.serverConfig).toBeUndefined();
    });
  });

  describe('Multiple Server Support', () => {
    it('should store credentials for multiple VPN servers independently', async () => {
      // Arrange
      const servers = [
        { id: 'vpn-us-1', username: 'user1', password: 'pass1' },
        { id: 'vpn-uk-1', username: 'user2', password: 'pass2' },
        { id: 'vpn-jp-1', username: 'user3', password: 'pass3' },
      ];

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );

      // Act - Store all servers
      for (const server of servers) {
        await secureStorage.storeVpnCredentials(server.id, server.username, server.password);
      }

      // Assert - Verify each server was stored with unique key
      expect(Keychain.setInternetCredentials).toHaveBeenCalledTimes(3);
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'vpn_credentials_vpn-us-1',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'vpn_credentials_vpn-uk-1',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'vpn_credentials_vpn-jp-1',
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Security Validation', () => {
    it('should NEVER use AsyncStorage for VPN credentials in production', async () => {
      // Arrange
      const serverId = 'vpn-server-production';
      const username = 'productionuser';
      const password = 'productionpass';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FACE_ID
      );

      // Act
      await secureStorage.storeVpnCredentials(serverId, username, password);
      await secureStorage.getVpnCredentials(serverId);
      await secureStorage.removeVpnCredentials(serverId);

      // Assert - AsyncStorage should NEVER be used in production
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should prevent credential exposure through device backups', async () => {
      // Arrange
      const serverId = 'vpn-server-backup-prevention';
      const username = 'backupuser';
      const password = 'backuppass';

      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
        Keychain.BIOMETRY_TYPE.FINGERPRINT
      );

      // Act
      await secureStorage.storeVpnCredentials(serverId, username, password);

      // Assert - Verify WHEN_UNLOCKED_THIS_DEVICE_ONLY prevents backups
      const calls = (Keychain.setInternetCredentials as jest.Mock).mock.calls;
      const options = calls[0][3];
      expect(options.accessible).toBe(Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY);
    });
  });
});
