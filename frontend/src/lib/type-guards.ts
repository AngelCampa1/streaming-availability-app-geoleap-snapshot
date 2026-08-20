/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type guard utilities for null/undefined checks and type safety
 */

/**
 * Check if value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a valid number (not NaN)
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if value is a plain object
 */
export function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Check if value is a valid Date
 */
export function isValidDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a valid email
 */
export function isValidEmail(value: any): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if value is a valid URL
 */
export function isValidUrl(value: any): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid UUID
 */
export function isValidUuid(value: any): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Filter out null and undefined values from array
 */
export function filterDefined<T>(array: (T | null | undefined)[]): T[] {
  return array.filter(isDefined);
}

/**
 * Safe JSON parse with type validation
 */
export function safeParse<T>(json: string, validator: (data: any) => data is T): T | null {
  try {
    const parsed = JSON.parse(json);
    return validator(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Assert value is defined (throws if not)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value is null or undefined'
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message);
  }
}

/**
 * Get defined value or throw
 */
export function requireDefined<T>(value: T | null | undefined, message: string = 'Required value is missing'): T {
  assertDefined(value, message);
  return value;
}

/**
 * Get defined value or default
 */
export function getOrDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return isDefined(value) ? value : defaultValue;
}

/**
 * Null-safe property access
 */
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return isDefined(obj) ? obj[key] : undefined;
}

/**
 * Deep null-safe property access
 */
export function safeDeepGet<T>(obj: any, path: string, defaultValue?: T): T | undefined {
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (!isDefined(current) || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }

  return current ?? defaultValue;
}

/**
 * Check if all values in object are defined
 */
export function areAllDefined<T extends Record<string, any>>(obj: T): boolean {
  return Object.values(obj).every(isDefined);
}

/**
 * Filter object to only include defined values
 */
export function filterDefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => isDefined(value))) as Partial<T>;
}

/**
 * Validate array has minimum length
 */
export function hasMinLength<T>(array: T[], minLength: number): boolean {
  return array.length >= minLength;
}

/**
 * Validate string has minimum length
 */
export function hasMinStringLength(str: string, minLength: number): boolean {
  return str.trim().length >= minLength;
}

/**
 * Type guard for checking if error is an Error instance
 */
export function isError(error: any): error is Error {
  return error instanceof Error;
}

/**
 * Type guard for checking if value has a specific property
 */
export function hasProperty<K extends string>(obj: any, key: K): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

/**
 * Type guard for checking if value matches a specific type structure
 */
export function matchesStructure<T extends Record<string, any>>(
  value: any,
  structure: Record<keyof T, (val: any) => boolean>
): value is T {
  if (!isPlainObject(value)) return false;

  return Object.entries(structure).every(([key, validator]) => {
    if (typeof validator !== 'function') return false;
    return key in value && validator((value as Record<string, any>)[key]);
  });
}

/**
 * Coerce value to boolean
 */
export function toBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof value === 'number') return value !== 0;
  return Boolean(value);
}

/**
 * Coerce value to number
 */
export function toNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number' && isValidNumber(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isValidNumber(parsed) ? parsed : defaultValue;
  }
  return defaultValue;
}

/**
 * Coerce value to string
 */
export function toString(value: any, defaultValue: string = ''): string {
  if (typeof value === 'string') return value;
  if (isNullish(value)) return defaultValue;
  return String(value);
}

/**
 * Ensure value is an array
 */
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (isNullish(value)) return [];
  return Array.isArray(value) ? value : [value];
}
