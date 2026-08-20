/**
 * Session fingerprinting for additional security
 * Generates a unique fingerprint based on browser characteristics
 */

interface FingerprintData {
  userAgent: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
}

/**
 * Generate a browser fingerprint for session security
 */
export function generateSessionFingerprint(): string {
  if (typeof window === 'undefined') {
    return 'server-side';
  }

  const data: FingerprintData = {
    userAgent: navigator.userAgent || '',
    language: navigator.language || '',
    platform: navigator.platform || '',
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
  };

  // Create a hash of the fingerprint data
  const fingerprint = btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return fingerprint.substring(0, 32); // Use first 32 characters
}

/**
 * Store the current session fingerprint
 */
export function storeSessionFingerprint(): void {
  const fingerprint = generateSessionFingerprint();
  localStorage.setItem('sessionFingerprint', fingerprint);
}

/**
 * Verify the stored session fingerprint matches current browser
 */
export function verifySessionFingerprint(): boolean {
  const storedFingerprint = localStorage.getItem('sessionFingerprint');
  if (!storedFingerprint) {
    return false;
  }

  const currentFingerprint = generateSessionFingerprint();
  return storedFingerprint === currentFingerprint;
}

/**
 * Clear the stored session fingerprint
 */
export function clearSessionFingerprint(): void {
  localStorage.removeItem('sessionFingerprint');
}

/**
 * Detect if the session might be compromised based on fingerprint changes
 */
export function detectSessionCompromise(): { compromised: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { compromised: false };
  }

  const storedFingerprint = localStorage.getItem('sessionFingerprint');
  if (!storedFingerprint) {
    return { compromised: false, reason: 'No stored fingerprint' };
  }

  const currentFingerprint = generateSessionFingerprint();
  if (storedFingerprint !== currentFingerprint) {
    return {
      compromised: true,
      reason: 'Browser fingerprint mismatch - possible session hijacking',
    };
  }

  return { compromised: false };
}
