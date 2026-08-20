/**
 * Tests for anonymous user ID management
 * @jest-environment jsdom
 */

import {
  getOrCreateAnonymousId,
  getAnonymousId,
  clearAnonymousId,
  hasAnonymousId,
  isSearchBlockedError,
  type SearchBlockedResponse,
} from '../anonymous-user';

// UUID regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('anonymous-user', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getOrCreateAnonymousId', () => {
    it('should create a new UUID if none exists', () => {
      const id = getOrCreateAnonymousId();

      expect(id).toBeTruthy();
      expect(id).toMatch(UUID_REGEX);
      expect(localStorage.getItem('geoleap_anon_id')).toBe(id);
    });

    it('should return existing UUID if one exists', () => {
      const existingId = '12345678-1234-4123-8123-123456789012';
      localStorage.setItem('geoleap_anon_id', existingId);

      const id = getOrCreateAnonymousId();

      expect(id).toBe(existingId);
    });

    it('should generate different UUIDs on different calls when none exists', () => {
      const id1 = getOrCreateAnonymousId();
      localStorage.clear();
      const id2 = getOrCreateAnonymousId();

      expect(id1).not.toBe(id2);
    });

    it('should return same UUID on multiple calls', () => {
      const id1 = getOrCreateAnonymousId();
      const id2 = getOrCreateAnonymousId();
      const id3 = getOrCreateAnonymousId();

      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    });
  });

  describe('getAnonymousId', () => {
    it('should return null if no ID exists', () => {
      const id = getAnonymousId();

      expect(id).toBeNull();
    });

    it('should return existing ID without creating one', () => {
      const existingId = '12345678-1234-4123-8123-123456789012';
      localStorage.setItem('geoleap_anon_id', existingId);

      const id = getAnonymousId();

      expect(id).toBe(existingId);
    });

    it('should not create ID when getting', () => {
      getAnonymousId();

      expect(localStorage.getItem('geoleap_anon_id')).toBeNull();
    });
  });

  describe('clearAnonymousId', () => {
    it('should remove the anonymous ID', () => {
      localStorage.setItem('geoleap_anon_id', 'test-id');

      clearAnonymousId();

      expect(localStorage.getItem('geoleap_anon_id')).toBeNull();
    });

    it('should not throw if no ID exists', () => {
      expect(() => clearAnonymousId()).not.toThrow();
    });
  });

  describe('hasAnonymousId', () => {
    it('should return false if no ID exists', () => {
      expect(hasAnonymousId()).toBe(false);
    });

    it('should return true if ID exists', () => {
      localStorage.setItem('geoleap_anon_id', 'test-id');

      expect(hasAnonymousId()).toBe(true);
    });
  });

  describe('isSearchBlockedError', () => {
    it('should return true for valid signup_required error', () => {
      const error = {
        status: 403,
        data: {
          blockReason: 'signup_required',
          searchesUsed: 1,
          searchLimit: 1,
          resetsAt: null,
          upgradeUrl: '/pricing',
          message: 'Create a free account',
        } as SearchBlockedResponse,
      };

      expect(isSearchBlockedError(error)).toBe(true);
    });

    it('should return true for valid upgrade_required error', () => {
      const error = {
        status: 403,
        data: {
          blockReason: 'upgrade_required',
          searchesUsed: 5,
          searchLimit: 5,
          resetsAt: '2026-01-29T00:00:00Z',
          upgradeUrl: '/pricing',
          message: 'Upgrade to Premium',
        } as SearchBlockedResponse,
      };

      expect(isSearchBlockedError(error)).toBe(true);
    });

    it('should return false for non-403 errors', () => {
      const error = {
        status: 401,
        data: {
          blockReason: 'signup_required',
        },
      };

      expect(isSearchBlockedError(error)).toBe(false);
    });

    it('should return false for 403 without blockReason', () => {
      const error = {
        status: 403,
        data: {
          message: 'Access denied',
        },
      };

      expect(isSearchBlockedError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSearchBlockedError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSearchBlockedError(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isSearchBlockedError('error')).toBe(false);
      expect(isSearchBlockedError(123)).toBe(false);
    });
  });
});
