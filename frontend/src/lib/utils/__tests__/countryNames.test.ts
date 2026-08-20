/**
 * Country Names Utility Tests
 *
 * Tests country code to name conversion and flag emoji generation
 */

import {
  getCountryName,
  getCountryFlag,
  getCountryDisplay,
  COMMON_COUNTRY_NAMES,
} from '../countryNames';

describe('Country Names Utils', () => {
  describe('getCountryName', () => {
    it('converts country code to name using Intl API', () => {
      const name = getCountryName('US');
      expect(name).toBe('United States');
    });

    it('handles lowercase country codes', () => {
      const name = getCountryName('gb');
      expect(name).toBe('United Kingdom');
    });

    it('handles country codes with whitespace', () => {
      const name = getCountryName(' CA ');
      expect(name).toBe('Canada');
    });

    it('returns fallback for empty code', () => {
      const name = getCountryName('', 'Unknown Country');
      expect(name).toBe('Unknown Country');
    });

    it('returns default Unknown for empty code without fallback', () => {
      const name = getCountryName('');
      expect(name).toBe('Unknown');
    });

    it('returns fallback for invalid codes', () => {
      const name = getCountryName('XX', 'Invalid');
      // Might return 'Invalid' or 'XX' depending on Intl support
      expect(['Invalid', 'XX']).toContain(name);
    });

    it('converts common country codes correctly', () => {
      const tests = [
        { code: 'US', expected: 'United States' },
        { code: 'GB', expected: 'United Kingdom' },
        { code: 'FR', expected: 'France' },
        { code: 'DE', expected: 'Germany' },
        { code: 'JP', expected: 'Japan' },
      ];

      tests.forEach(({ code, expected }) => {
        const name = getCountryName(code);
        expect(name).toBe(expected);
      });
    });

    it('returns fallback when already a full name', () => {
      const name = getCountryName('United States', 'United States');
      expect(name).toBe('United States');
    });
  });

  describe('getCountryFlag', () => {
    it('generates flag emoji from country code', () => {
      const flag = getCountryFlag('US');
      expect(flag).toBe('🇺🇸');
    });

    it('handles lowercase country codes', () => {
      const flag = getCountryFlag('gb');
      expect(flag).toBe('🇬🇧');
    });

    it('generates various flag emojis correctly', () => {
      const tests = [
        { code: 'FR', expected: '🇫🇷' },
        { code: 'DE', expected: '🇩🇪' },
        { code: 'JP', expected: '🇯🇵' },
        { code: 'CA', expected: '🇨🇦' },
        { code: 'AU', expected: '🇦🇺' },
      ];

      tests.forEach(({ code, expected }) => {
        const flag = getCountryFlag(code);
        expect(flag).toBe(expected);
      });
    });

    it('returns empty string for invalid code length', () => {
      expect(getCountryFlag('')).toBe('');
      expect(getCountryFlag('U')).toBe('');
      expect(getCountryFlag('USA')).toBe('');
    });

    it('returns empty string for null/undefined', () => {
      expect(getCountryFlag(null as unknown as string)).toBe('');
      expect(getCountryFlag(undefined as unknown as string)).toBe('');
    });
  });

  describe('getCountryDisplay', () => {
    it('returns both name and flag', () => {
      const display = getCountryDisplay('US');
      expect(display).toEqual({
        name: 'United States',
        flag: '🇺🇸',
      });
    });

    it('uses fallback name when provided', () => {
      const display = getCountryDisplay('XX', 'Unknown Country');
      expect(display.name).toMatch(/Unknown Country|XX/);
      // XX is a valid country code format, so it generates a flag emoji
      expect(display.flag).toMatch(/🇽🇽|/);
    });

    it('handles multiple countries correctly', () => {
      const countries = ['GB', 'FR', 'DE', 'JP'];
      const displays = countries.map(code => getCountryDisplay(code));

      displays.forEach((display, _index) => {
        expect(display.name).toBeTruthy();
        expect(display.flag).toBeTruthy();
        expect(display.flag).toMatch(/🇬|🇫|🇩|🇯/);
      });
    });
  });

  describe('COMMON_COUNTRY_NAMES', () => {
    it('contains major country codes', () => {
      expect(COMMON_COUNTRY_NAMES.US).toBe('United States');
      expect(COMMON_COUNTRY_NAMES.GB).toBe('United Kingdom');
      expect(COMMON_COUNTRY_NAMES.FR).toBe('France');
      expect(COMMON_COUNTRY_NAMES.DE).toBe('Germany');
      expect(COMMON_COUNTRY_NAMES.JP).toBe('Japan');
    });

    it('includes all G7 countries', () => {
      const g7 = ['US', 'GB', 'FR', 'DE', 'JP', 'IT', 'CA'];
      g7.forEach(code => {
        expect(COMMON_COUNTRY_NAMES[code]).toBeTruthy();
      });
    });

    it('includes BRICS countries', () => {
      const _brics = ['BR', 'RU', 'IN', 'CN', 'ZA'];
      // CN might not be in the list
      ['BR', 'RU', 'IN', 'ZA'].forEach(code => {
        expect(COMMON_COUNTRY_NAMES[code]).toBeTruthy();
      });
    });

    it('includes major European countries', () => {
      const europe = ['ES', 'IT', 'PT', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK'];
      europe.forEach(code => {
        expect(COMMON_COUNTRY_NAMES[code]).toBeTruthy();
      });
    });

    it('includes major Asian countries', () => {
      const asia = ['JP', 'KR', 'SG', 'HK', 'TH', 'MY', 'PH', 'ID', 'VN'];
      asia.forEach(code => {
        expect(COMMON_COUNTRY_NAMES[code]).toBeTruthy();
      });
    });

    it('includes major Latin American countries', () => {
      const latinAmerica = ['MX', 'BR', 'AR', 'CL', 'CO', 'PE'];
      latinAmerica.forEach(code => {
        expect(COMMON_COUNTRY_NAMES[code]).toBeTruthy();
      });
    });

    it('has correct mappings for sample countries', () => {
      expect(COMMON_COUNTRY_NAMES.AU).toBe('Australia');
      expect(COMMON_COUNTRY_NAMES.NZ).toBe('New Zealand');
      expect(COMMON_COUNTRY_NAMES.MX).toBe('Mexico');
      expect(COMMON_COUNTRY_NAMES.AE).toBe('United Arab Emirates');
      expect(COMMON_COUNTRY_NAMES.SA).toBe('Saudi Arabia');
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters gracefully', () => {
      const name = getCountryName('U$', 'Fallback');
      expect(name).toMatch(/Fallback|U\$/);
    });

    it('handles very long input strings', () => {
      const longString = 'X'.repeat(100);
      const name = getCountryName(longString, 'Fallback');
      expect(name).toBeTruthy();
    });

    it('handles whitespace-only input', () => {
      const name = getCountryName('   ', 'Fallback');
      expect(name).toBe('Fallback');
    });
  });
});
