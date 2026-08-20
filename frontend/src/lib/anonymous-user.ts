/**
 * Anonymous user ID management for 2-step conversion funnel
 *
 * Tracks anonymous users via localStorage UUID that gets sent to backend
 * with each search request. This allows:
 * 1. Anonymous users to have 1 free search
 * 2. Backend to track searches across page refreshes
 * 3. Migration to registered user on signup
 */

const ANON_ID_KEY = 'geoleap_anon_id';

/**
 * Get or create an anonymous user ID
 * Uses crypto.randomUUID() for secure UUID generation
 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') {
    return ''; // Server-side rendering
  }

  let anonId = localStorage.getItem(ANON_ID_KEY);

  if (!anonId) {
    // Generate a new UUID using Web Crypto API
    anonId = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, anonId);
  }

  return anonId;
}

/**
 * Get the current anonymous ID without creating a new one
 * Returns null if no ID exists
 */
export function getAnonymousId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(ANON_ID_KEY);
}

/**
 * Clear the anonymous user ID
 * Should be called when user signs up to start fresh
 */
export function clearAnonymousId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(ANON_ID_KEY);
}

/**
 * Check if user has an anonymous ID
 */
export function hasAnonymousId(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(ANON_ID_KEY) !== null;
}

/**
 * Search blocked response from the API
 */
export interface SearchBlockedResponse {
  blockReason: 'signup_required' | 'upgrade_required';
  searchesUsed: number;
  searchLimit: number;
  resetsAt: string | null;
  upgradeUrl: string;
  message: string;
}

/**
 * Check if an error is a search blocked response
 */
export function isSearchBlockedError(error: unknown): error is { status: number; data: SearchBlockedResponse } {
  if (!error || typeof error !== 'object') return false;
  const err = error as { status?: number; data?: unknown };
  return err.status === 403 &&
         typeof err.data === 'object' &&
         err.data !== null &&
         'blockReason' in err.data;
}
