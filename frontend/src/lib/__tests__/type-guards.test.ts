import {
  isDefined,
  isNullish,
  isNonEmptyString,
  isValidNumber,
  isNonEmptyArray,
  isPlainObject,
  isValidDate,
  isValidEmail,
  isValidUrl,
  isValidUuid,
  filterDefined,
  safeParse,
  assertDefined,
  requireDefined,
  getOrDefault,
  safeGet,
  safeDeepGet,
  areAllDefined,
  filterDefinedValues,
  hasMinLength,
  hasMinStringLength,
  isError,
  hasProperty,
  matchesStructure,
  toBoolean,
  toNumber,
  toString,
  ensureArray,
} from '../type-guards';

describe('type-guards', () => {
  describe('isDefined', () => {
    it('returns true for defined values', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined([])).toBe(true);
      expect(isDefined({})).toBe(true);
    });

    it('returns false for null', () => {
      expect(isDefined(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });
  });

  describe('isNullish', () => {
    it('returns true for null', () => {
      expect(isNullish(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(isNullish(undefined)).toBe(true);
    });

    it('returns false for defined values', () => {
      expect(isNullish(0)).toBe(false);
      expect(isNullish('')).toBe(false);
      expect(isNullish(false)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' a ')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString('\n\t ')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    it('returns true for valid numbers', () => {
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(-456)).toBe(true);
      expect(isValidNumber(3.14)).toBe(true);
    });

    it('returns false for NaN', () => {
      expect(isValidNumber(NaN)).toBe(false);
    });

    it('returns false for Infinity', () => {
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
    });

    it('returns false for non-numbers', () => {
      expect(isValidNumber('123')).toBe(false);
      expect(isValidNumber(null)).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    it('returns true for non-empty arrays', () => {
      expect(isNonEmptyArray([1])).toBe(true);
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    });

    it('returns false for empty array', () => {
      expect(isNonEmptyArray([])).toBe(false);
    });

    it('returns false for non-arrays', () => {
      expect(isNonEmptyArray('array')).toBe(false);
      expect(isNonEmptyArray(null)).toBe(false);
      expect(isNonEmptyArray({})).toBe(false);
    });
  });

  describe('isPlainObject', () => {
    it('returns true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ key: 'value' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isPlainObject(null)).toBe(false);
    });

    it('returns false for arrays', () => {
      expect(isPlainObject([])).toBe(false);
    });

    it('returns false for class instances', () => {
      class TestClass {}
      expect(isPlainObject(new TestClass())).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('returns true for valid Date objects', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2024-01-01'))).toBe(true);
    });

    it('returns false for invalid Date objects', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });

    it('returns false for non-Date values', () => {
      expect(isValidDate('2024-01-01')).toBe(false);
      expect(isValidDate(1234567890)).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('returns true for valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('test123@test-domain.com')).toBe(true);
    });

    it('returns false for invalid email addresses', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isValidEmail(123)).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('returns true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
    });

    it('returns false for invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('/path/only')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isValidUrl(123)).toBe(false);
      expect(isValidUrl(null)).toBe(false);
    });
  });

  describe('isValidUuid', () => {
    it('returns true for valid UUIDs', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('returns false for invalid UUIDs', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false); // Too short
      expect(isValidUuid('550e8400-e29b-61d4-a716-446655440000')).toBe(false); // Invalid version
    });

    it('returns false for non-string values', () => {
      expect(isValidUuid(123)).toBe(false);
      expect(isValidUuid(null)).toBe(false);
    });
  });

  describe('filterDefined', () => {
    it('filters out null and undefined values', () => {
      const input = [1, null, 2, undefined, 3];
      expect(filterDefined(input)).toEqual([1, 2, 3]);
    });

    it('preserves falsy values that are defined', () => {
      const input = [0, false, '', null, undefined];
      expect(filterDefined(input)).toEqual([0, false, '']);
    });

    it('returns empty array for all nullish values', () => {
      expect(filterDefined([null, undefined])).toEqual([]);
    });
  });

  describe('safeParse', () => {
    it('parses valid JSON and validates', () => {
      const validator = (data: any): data is { name: string } =>
        typeof data === 'object' && typeof data.name === 'string';

      const result = safeParse('{"name":"John"}', validator);
      expect(result).toEqual({ name: 'John' });
    });

    it('returns null for invalid JSON', () => {
      const validator = (data: any): data is any => true;
      expect(safeParse('not json', validator)).toBeNull();
    });

    it('returns null when validation fails', () => {
      const validator = (data: any): data is { name: string } =>
        typeof data === 'object' && typeof data.name === 'string';

      expect(safeParse('{"age":30}', validator)).toBeNull();
    });
  });

  describe('assertDefined', () => {
    it('does not throw for defined values', () => {
      expect(() => assertDefined(0)).not.toThrow();
      expect(() => assertDefined('')).not.toThrow();
      expect(() => assertDefined(false)).not.toThrow();
    });

    it('throws for null', () => {
      expect(() => assertDefined(null)).toThrow('Value is null or undefined');
    });

    it('throws for undefined', () => {
      expect(() => assertDefined(undefined)).toThrow('Value is null or undefined');
    });

    it('uses custom error message', () => {
      expect(() => assertDefined(null, 'Custom error')).toThrow('Custom error');
    });
  });

  describe('requireDefined', () => {
    it('returns defined values', () => {
      expect(requireDefined(123)).toBe(123);
      expect(requireDefined('test')).toBe('test');
    });

    it('throws for null with default message', () => {
      expect(() => requireDefined(null)).toThrow('Required value is missing');
    });

    it('throws for undefined with custom message', () => {
      expect(() => requireDefined(undefined, 'Need value')).toThrow('Need value');
    });
  });

  describe('getOrDefault', () => {
    it('returns value when defined', () => {
      expect(getOrDefault(123, 0)).toBe(123);
      expect(getOrDefault('test', 'default')).toBe('test');
      expect(getOrDefault(false, true)).toBe(false);
    });

    it('returns default when null', () => {
      expect(getOrDefault(null, 'default')).toBe('default');
    });

    it('returns default when undefined', () => {
      expect(getOrDefault(undefined, 'default')).toBe('default');
    });
  });

  describe('safeGet', () => {
    it('returns property value for defined objects', () => {
      const obj = { name: 'John', age: 30 };
      expect(safeGet(obj, 'name')).toBe('John');
      expect(safeGet(obj, 'age')).toBe(30);
    });

    it('returns undefined for null', () => {
      expect(safeGet(null as { name: string } | null, 'name')).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(safeGet(undefined as { name: string } | undefined, 'name')).toBeUndefined();
    });
  });

  describe('safeDeepGet', () => {
    const obj = {
      user: {
        profile: {
          name: 'John',
          age: 30,
        },
      },
    };

    it('returns deep property value', () => {
      expect(safeDeepGet(obj, 'user.profile.name')).toBe('John');
      expect(safeDeepGet(obj, 'user.profile.age')).toBe(30);
    });

    it('returns default for missing path', () => {
      expect(safeDeepGet(obj, 'user.missing.path', 'default')).toBe('default');
    });

    it('returns undefined for missing path without default', () => {
      expect(safeDeepGet(obj, 'user.missing.path')).toBeUndefined();
    });

    it('handles null in path', () => {
      expect(safeDeepGet(null, 'user.name', 'default')).toBe('default');
    });
  });

  describe('areAllDefined', () => {
    it('returns true when all values are defined', () => {
      expect(areAllDefined({ a: 1, b: 'test', c: false })).toBe(true);
    });

    it('returns false when any value is null', () => {
      expect(areAllDefined({ a: 1, b: null })).toBe(false);
    });

    it('returns false when any value is undefined', () => {
      expect(areAllDefined({ a: 1, b: undefined })).toBe(false);
    });

    it('returns true for empty object', () => {
      expect(areAllDefined({})).toBe(true);
    });
  });

  describe('filterDefinedValues', () => {
    it('filters out null and undefined values', () => {
      const obj = { a: 1, b: null, c: 'test', d: undefined, e: false };
      expect(filterDefinedValues(obj)).toEqual({ a: 1, c: 'test', e: false });
    });

    it('returns empty object when all values are nullish', () => {
      expect(filterDefinedValues({ a: null, b: undefined })).toEqual({});
    });
  });

  describe('hasMinLength', () => {
    it('returns true when array meets minimum length', () => {
      expect(hasMinLength([1, 2, 3], 2)).toBe(true);
      expect(hasMinLength([1, 2, 3], 3)).toBe(true);
    });

    it('returns false when array is shorter', () => {
      expect(hasMinLength([1, 2], 3)).toBe(false);
    });

    it('returns true for zero minimum', () => {
      expect(hasMinLength([], 0)).toBe(true);
    });
  });

  describe('hasMinStringLength', () => {
    it('returns true when string meets minimum length', () => {
      expect(hasMinStringLength('hello', 3)).toBe(true);
      expect(hasMinStringLength('hello', 5)).toBe(true);
    });

    it('returns false when string is shorter', () => {
      expect(hasMinStringLength('hi', 3)).toBe(false);
    });

    it('trims whitespace before checking', () => {
      expect(hasMinStringLength('  hello  ', 5)).toBe(true);
      expect(hasMinStringLength('  hi  ', 3)).toBe(false);
    });
  });

  describe('isError', () => {
    it('returns true for Error instances', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('test'))).toBe(true);
    });

    it('returns false for non-Error values', () => {
      expect(isError({ message: 'error' })).toBe(false);
      expect(isError('error')).toBe(false);
      expect(isError(null)).toBe(false);
    });
  });

  describe('hasProperty', () => {
    it('returns true when object has property', () => {
      expect(hasProperty({ name: 'John' }, 'name')).toBe(true);
    });

    it('returns false when object lacks property', () => {
      expect(hasProperty({ age: 30 }, 'name')).toBe(false);
    });

    it('returns false for null', () => {
      expect(hasProperty(null, 'name')).toBe(false);
    });

    it('returns false for primitives', () => {
      expect(hasProperty('string', 'length')).toBe(false);
    });
  });

  describe('matchesStructure', () => {
    it('returns true when structure matches', () => {
      const structure = {
        name: (v: any) => typeof v === 'string',
        age: (v: any) => typeof v === 'number',
      };

      expect(matchesStructure({ name: 'John', age: 30 }, structure)).toBe(true);
    });

    it('returns false when structure does not match', () => {
      const structure = {
        name: (v: any) => typeof v === 'string',
        age: (v: any) => typeof v === 'number',
      };

      expect(matchesStructure({ name: 'John', age: '30' }, structure)).toBe(false);
    });

    it('returns false for non-objects', () => {
      const structure = { name: (v: any) => typeof v === 'string' };
      expect(matchesStructure('string', structure)).toBe(false);
    });

    it('returns false when property is missing', () => {
      const structure = {
        name: (v: any) => typeof v === 'string',
        age: (v: any) => typeof v === 'number',
      };

      expect(matchesStructure({ name: 'John' }, structure)).toBe(false);
    });
  });

  describe('toBoolean', () => {
    it('returns boolean values as-is', () => {
      expect(toBoolean(true)).toBe(true);
      expect(toBoolean(false)).toBe(false);
    });

    it('converts string "true" to true', () => {
      expect(toBoolean('true')).toBe(true);
      expect(toBoolean('TRUE')).toBe(true);
      expect(toBoolean('True')).toBe(true);
    });

    it('converts string "1" to true', () => {
      expect(toBoolean('1')).toBe(true);
    });

    it('converts string "yes" to true', () => {
      expect(toBoolean('yes')).toBe(true);
      expect(toBoolean('YES')).toBe(true);
    });

    it('converts other strings to false', () => {
      expect(toBoolean('false')).toBe(false);
      expect(toBoolean('0')).toBe(false);
      expect(toBoolean('no')).toBe(false);
    });

    it('converts numbers to boolean', () => {
      expect(toBoolean(1)).toBe(true);
      expect(toBoolean(0)).toBe(false);
      expect(toBoolean(-1)).toBe(true);
    });

    it('uses JavaScript truthiness for other types', () => {
      expect(toBoolean({})).toBe(true);
      expect(toBoolean([])).toBe(true);
      expect(toBoolean(null)).toBe(false);
      expect(toBoolean(undefined)).toBe(false);
    });
  });

  describe('toNumber', () => {
    it('returns valid numbers as-is', () => {
      expect(toNumber(123)).toBe(123);
      expect(toNumber(0)).toBe(0);
      expect(toNumber(-456)).toBe(-456);
    });

    it('parses numeric strings', () => {
      expect(toNumber('123')).toBe(123);
      expect(toNumber('3.14')).toBe(3.14);
      expect(toNumber('-456')).toBe(-456);
    });

    it('returns default for invalid strings', () => {
      expect(toNumber('abc', 0)).toBe(0);
      expect(toNumber('', 0)).toBe(0);
    });

    it('returns default for NaN', () => {
      expect(toNumber(NaN, 0)).toBe(0);
    });

    it('returns default for Infinity', () => {
      expect(toNumber(Infinity, 0)).toBe(0);
    });

    it('returns custom default value', () => {
      expect(toNumber('abc', 99)).toBe(99);
    });
  });

  describe('toString', () => {
    it('returns strings as-is', () => {
      expect(toString('hello')).toBe('hello');
    });

    it('converts numbers to strings', () => {
      expect(toString(123)).toBe('123');
    });

    it('converts booleans to strings', () => {
      expect(toString(true)).toBe('true');
      expect(toString(false)).toBe('false');
    });

    it('returns default for null', () => {
      expect(toString(null, 'default')).toBe('default');
    });

    it('returns default for undefined', () => {
      expect(toString(undefined, 'default')).toBe('default');
    });

    it('converts objects to strings', () => {
      expect(toString({ key: 'value' })).toBe('[object Object]');
    });
  });

  describe('ensureArray', () => {
    it('returns arrays as-is', () => {
      expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('wraps single values in array', () => {
      expect(ensureArray(123)).toEqual([123]);
      expect(ensureArray('test')).toEqual(['test']);
    });

    it('returns empty array for null', () => {
      expect(ensureArray(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(ensureArray(undefined)).toEqual([]);
    });
  });

  describe('integration tests - real-world scenarios', () => {
    it('safely extracts user data with defaults', () => {
      const apiResponse: any = {
        user: {
          profile: {
            name: 'John',
            email: null,
          },
        },
      };

      const name = safeDeepGet(apiResponse, 'user.profile.name', 'Anonymous');
      const email = safeDeepGet(apiResponse, 'user.profile.email', 'no-email@example.com');
      const age = safeDeepGet(apiResponse, 'user.profile.age', 0);

      expect(name).toBe('John');
      expect(email).toBe('no-email@example.com'); // null → default
      expect(age).toBe(0); // missing → default
    });

    it('validates and filters API data', () => {
      const apiData = {
        users: [
          { id: 1, name: 'John', email: 'john@example.com' },
          { id: 2, name: null, email: 'invalid-email' },
          { id: 3, name: 'Jane', email: 'jane@example.com' },
        ],
      };

      const validUsers = apiData.users.filter(user =>
        isDefined(user.name) && isValidEmail(user.email)
      );

      expect(validUsers).toHaveLength(2);
      expect(validUsers[0].name).toBe('John');
      expect(validUsers[1].name).toBe('Jane');
    });

    it('safely parses and validates JSON configuration', () => {
      const configJson = '{"apiUrl":"https://api.example.com","timeout":5000}';

      const validator = (data: any): data is { apiUrl: string; timeout: number } =>
        isPlainObject(data) &&
        isValidUrl(data.apiUrl) &&
        isValidNumber(data.timeout);

      const config = safeParse(configJson, validator);
      expect(config).toBeTruthy();
      expect(config?.apiUrl).toBe('https://api.example.com');
      expect(config?.timeout).toBe(5000);
    });
  });
});
