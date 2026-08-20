/**
 * ContactIntegrationService Tests
 *
 * Tests contact integration with permission handling, caching, and search functionality.
 */

import contactIntegrationService, { Contact, ContactSearchOptions } from '../../services/contactIntegrationService';
import { logger } from '../../utils/logger';

// Mock dependencies
const mockCheck = jest.fn();
const mockRequest = jest.fn();
let mockPlatformOS = 'android';

jest.mock('react-native', () => {
  const mockPlatform = {
    get OS() {
      return mockPlatformOS;
    },
  };
  const mockPermissionsAndroid = {
    PERMISSIONS: {
      READ_CONTACTS: 'android.permission.READ_CONTACTS',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    check: mockCheck,
    request: mockRequest,
  };

  return {
    Platform: mockPlatform,
    PermissionsAndroid: mockPermissionsAndroid,
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ContactIntegrationService', () => {
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset service state
    (contactIntegrationService as any).contacts = [];
    (contactIntegrationService as any).hasPermission = false;
    (contactIntegrationService as any).lastCacheTime = 0;

    // Default Platform.OS to android
    mockPlatformOS = 'android';

    // Spy on Date.now for cache testing
    dateNowSpy = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await contactIntegrationService.initialize();

      expect(logger.info).toHaveBeenCalledWith(
        '[ContactIntegrationService] ContactIntegrationService initialized (simplified version)'
      );
    });
  });

  describe('Check Permission', () => {
    it('should check permission and return result', async () => {
      const result = await contactIntegrationService.checkPermission();
      // Result depends on platform implementation, but should return boolean
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Request Permissions', () => {
    it('should request permission and return result', async () => {
      const result = await contactIntegrationService.requestPermissions();
      // Result depends on platform implementation, but should return boolean
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Get All Contacts', () => {
    it('should throw error when permission not granted', async () => {
      (contactIntegrationService as any).hasPermission = false;

      await expect(contactIntegrationService.getAllContacts()).rejects.toThrow(
        'Contacts permission not granted'
      );
    });

    it('should return mock contacts when permission granted', async () => {
      (contactIntegrationService as any).hasPermission = true;
      dateNowSpy.mockReturnValue(1000);

      const contacts = await contactIntegrationService.getAllContacts();

      expect(contacts).toHaveLength(2);
      expect(contacts[0].displayName).toBe('John Doe');
      expect(contacts[1].displayName).toBe('Jane Smith');
      expect((contactIntegrationService as any).lastCacheTime).toBe(1000);
    });

    it('should return cached contacts when cache is valid', async () => {
      (contactIntegrationService as any).hasPermission = true;

      // First call to populate cache
      dateNowSpy.mockReturnValue(1000);
      const contacts1 = await contactIntegrationService.getAllContacts();

      // Second call within cache expiration (5 minutes)
      dateNowSpy.mockReturnValue(1000 + 4 * 60 * 1000); // 4 minutes later
      const contacts2 = await contactIntegrationService.getAllContacts();

      expect(contacts1).toBe(contacts2); // Should return same cached instance
      expect((contactIntegrationService as any).lastCacheTime).toBe(1000); // Cache time unchanged
    });

    it('should refresh contacts when cache is expired', async () => {
      (contactIntegrationService as any).hasPermission = true;

      // First call to populate cache
      dateNowSpy.mockReturnValue(1000);
      await contactIntegrationService.getAllContacts();

      // Second call after cache expiration (5 minutes)
      dateNowSpy.mockReturnValue(1000 + 6 * 60 * 1000); // 6 minutes later
      const contacts = await contactIntegrationService.getAllContacts();

      expect(contacts).toHaveLength(2);
      expect((contactIntegrationService as any).lastCacheTime).toBe(1000 + 6 * 60 * 1000); // Cache time updated
    });

    it('should handle errors when getting contacts', async () => {
      (contactIntegrationService as any).hasPermission = true;

      // Mock Date.now to throw an error (simulate unexpected error)
      dateNowSpy.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(contactIntegrationService.getAllContacts()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        '[ContactIntegrationService] Failed to get all contacts',
        expect.any(Error)
      );
    });
  });

  describe('Search Contacts', () => {
    beforeEach(async () => {
      (contactIntegrationService as any).hasPermission = true;
      dateNowSpy.mockReturnValue(1000);
      await contactIntegrationService.getAllContacts(); // Populate cache
    });

    it('should throw error when permission not granted', async () => {
      (contactIntegrationService as any).hasPermission = false;

      await expect(contactIntegrationService.searchContacts('John')).rejects.toThrow(
        'Contacts permission not granted'
      );
    });

    it('should search contacts by display name', async () => {
      const results = await contactIntegrationService.searchContacts('John');

      expect(results).toHaveLength(1);
      expect(results[0].displayName).toBe('John Doe');
    });

    it('should search contacts by given name', async () => {
      const results = await contactIntegrationService.searchContacts('Jane');

      expect(results).toHaveLength(1);
      expect(results[0].displayName).toBe('Jane Smith');
    });

    it('should search contacts by family name', async () => {
      const results = await contactIntegrationService.searchContacts('Smith');

      expect(results).toHaveLength(1);
      expect(results[0].familyName).toBe('Smith');
    });

    it('should search contacts case-insensitively', async () => {
      const results = await contactIntegrationService.searchContacts('JOHN');

      expect(results).toHaveLength(1);
      expect(results[0].displayName).toBe('John Doe');
    });

    it('should return empty array when no matches found', async () => {
      const results = await contactIntegrationService.searchContacts('NonExistent');

      expect(results).toHaveLength(0);
    });

    it('should limit results based on maxResults option', async () => {
      const results = await contactIntegrationService.searchContacts('', { maxResults: 1 });

      expect(results).toHaveLength(1);
    });

    it('should default to maxResults of 50 when not specified', async () => {
      // Since we only have 2 contacts, both should be returned
      const results = await contactIntegrationService.searchContacts('');

      expect(results).toHaveLength(2);
    });

    it('should handle search errors', async () => {
      // Force an error by making getAllContacts fail
      (contactIntegrationService as any).contacts = [];
      (contactIntegrationService as any).lastCacheTime = 0;
      dateNowSpy.mockImplementation(() => {
        throw new Error('Search error');
      });

      await expect(contactIntegrationService.searchContacts('John')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        '[ContactIntegrationService] Failed to search contacts',
        expect.any(Error)
      );
    });
  });

  describe('Select Contacts for Sharing', () => {
    it('should return contacts when permission already granted', async () => {
      (contactIntegrationService as any).hasPermission = true;
      dateNowSpy.mockReturnValue(1000);

      const contacts = await contactIntegrationService.selectContactsForSharing(10);

      expect(contacts).toHaveLength(2);
    });

    it('should limit contacts based on maxContacts parameter', async () => {
      (contactIntegrationService as any).hasPermission = true;
      dateNowSpy.mockReturnValue(1000);

      const contacts = await contactIntegrationService.selectContactsForSharing(1);

      expect(contacts).toHaveLength(1);
      expect(contacts[0].displayName).toBe('John Doe');
    });

    it('should default to maxContacts of 10 when not specified', async () => {
      (contactIntegrationService as any).hasPermission = true;
      dateNowSpy.mockReturnValue(1000);

      const contacts = await contactIntegrationService.selectContactsForSharing();

      expect(contacts).toHaveLength(2); // Only 2 mock contacts available
    });

    it('should handle errors when selecting contacts for sharing', async () => {
      (contactIntegrationService as any).hasPermission = true;
      dateNowSpy.mockImplementation(() => {
        throw new Error('Selection error');
      });

      await expect(contactIntegrationService.selectContactsForSharing(5)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        '[ContactIntegrationService] Failed to select contacts for sharing',
        expect.any(Error)
      );
    });
  });

  describe('Clear Cache', () => {
    it('should clear contacts cache', async () => {
      // Populate cache
      (contactIntegrationService as any).hasPermission = true;
      dateNowSpy.mockReturnValue(1000);
      await contactIntegrationService.getAllContacts();

      expect((contactIntegrationService as any).contacts).toHaveLength(2);
      expect((contactIntegrationService as any).lastCacheTime).toBe(1000);

      // Clear cache
      contactIntegrationService.clearCache();

      expect((contactIntegrationService as any).contacts).toHaveLength(0);
      expect((contactIntegrationService as any).lastCacheTime).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search query', async () => {
      (contactIntegrationService as any).hasPermission = true;
      dateNowSpy.mockReturnValue(1000);
      await contactIntegrationService.getAllContacts();

      const results = await contactIntegrationService.searchContacts('');

      expect(results).toHaveLength(2); // All contacts match empty query
    });

    it('should handle cache expiration at exact boundary', async () => {
      (contactIntegrationService as any).hasPermission = true;

      // First call to populate cache
      dateNowSpy.mockReturnValue(1000);
      await contactIntegrationService.getAllContacts();

      // Second call at exactly 5 minutes (cache expiration time)
      dateNowSpy.mockReturnValue(1000 + 5 * 60 * 1000);
      await contactIntegrationService.getAllContacts();

      // At exactly 5 minutes (300,000ms), cache should expire and refresh
      expect((contactIntegrationService as any).lastCacheTime).toBe(1000 + 5 * 60 * 1000);
    });
  });
});
