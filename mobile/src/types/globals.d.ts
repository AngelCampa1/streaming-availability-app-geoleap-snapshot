/**
 * Global type declarations for React Native environment
 *
 * These functions are not natively available in React Native but are
 * wrapped in try/catch blocks in the code for compatibility.
 */

/**
 * Base64 encoding function
 * Note: Not natively available in React Native - code has fallbacks
 */
declare function btoa(str: string): string;

/**
 * Base64 decoding function
 * Note: Not natively available in React Native - code has fallbacks
 */
declare function atob(str: string): string;
