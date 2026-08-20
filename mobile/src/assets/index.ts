/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Asset Constants and Exports
 *
 * Centralized asset management for the mobile app.
 * All assets are loaded from the /assets directory at project root.
 *
 * Usage:
 * import { LOGOS } from '@/assets';
 * <Image source={LOGOS.main} />
 */

/**
 * Logo Assets
 * Located in /assets/ at project root (mobile/assets/)
 */
export const LOGOS = {
  // Main logo - simplified version
  main: require('@assets/logo.png'),
  // Transparent background version
  transparent: require('@assets/logo-transparent.png'),
  // Full original logo
  full: require('@assets/logo-full.png'),
} as const;

/**
 * Asset Types
 */
export type LogoAsset = (typeof LOGOS)[keyof typeof LOGOS];

/**
 * Re-export streaming logos
 */
export { STREAMING_LOGOS, getStreamingLogo, hasStreamingLogo, getStreamingLogoSvg } from './streaming-logos';
export type { StreamingLogoId } from './streaming-logos';

/**
 * Default export for convenience
 */
export default {
  LOGOS,
};
