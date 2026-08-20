/**
 * GeoLeap Mobile Design Tokens
 * Unified design system for consistent styling across React Native app
 *
 * IMPORTANT: These colors are shared with the web frontend.
 * When updating colors, also update: frontend/src/app/globals.css
 * See: docs/UNIFIED_COLOR_SYSTEM.md
 */

// Base spacing scale (4px base unit for mobile)
export const spacing = {
  0: 0,
  1: 4,   // 4px
  2: 8,   // 8px
  3: 12,  // 12px
  4: 16,  // 16px
  5: 20,  // 20px
  6: 24,  // 24px
  8: 32,  // 32px
  10: 40, // 40px
  12: 48, // 48px
  16: 64, // 64px
  20: 80, // 80px
  24: 96, // 96px
  32: 128, // 128px
  // Named aliases for legacy compatibility
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// Typography scale for React Native
export const typography = {
  fontFamily: {
    // Platform-specific font families
    ios: {
      light:'System',
      regular:'System',
      medium:'System',
      semibold:'System',
      bold:'System',
      extrabold:'System',
    },
    android: {
      light:'Roboto-Light',
      regular:'Roboto-Regular',
      medium:'Roboto-Medium',
      semibold:'Roboto-Medium',
      bold:'Roboto-Bold',
      extrabold:'Roboto-Black',
    },
  },
  fontSize: {
    xs: 12,    // 12px
    sm: 14,    // 14px
    base: 16,  // 16px
    lg: 18,    // 18px
    xl: 20,    // 20px'2xl': 24, // 24px'3xl': 30, // 30px'4xl': 36, // 36px'5xl': 48, // 48px'6xl': 60, // 60px
  },
  fontWeight: {
    light:'300' as const,
    normal:'400' as const,
    medium:'500' as const,
    semibold:'600' as const,
    bold:'700' as const,
    extrabold:'800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
  // Named text style aliases for legacy compatibility
  h1: { fontSize: 32, fontWeight:'bold' as const, lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontSize: 28, fontWeight:'bold' as const, lineHeight: 36, letterSpacing: -0.25 },
  h3: { fontSize: 24, fontWeight:'600' as const, lineHeight: 32 },
  h4: { fontSize: 20, fontWeight:'600' as const, lineHeight: 28 },
  h5: { fontSize: 18, fontWeight:'600' as const, lineHeight: 24 },
  h6: { fontSize: 16, fontWeight:'600' as const, lineHeight: 24 },
  body1: { fontSize: 16, fontWeight:'400' as const, lineHeight: 24 },
  body2: { fontSize: 14, fontWeight:'400' as const, lineHeight: 20 },
  subtitle1: { fontSize: 14, fontWeight:'500' as const, lineHeight: 20 },
  subtitle2: { fontSize: 12, fontWeight:'500' as const, lineHeight: 16 },
  caption: { fontSize: 12, fontWeight:'400' as const, lineHeight: 16 },
} as const;

// Colors -"Stream Violet" Palette for Entertainment Discovery
// Unified with web frontend - see docs/UNIFIED_COLOR_SYSTEM.md
export const colors = {
  // Primary brand colors - Stream Violet
  primary: {
    50:'#f5f3ff',
    100:'#ede9fe',
    200:'#ddd6fe',
    300:'#c4b5fd',
    400:'#a78bfa',
    500:'#7c3aed',  // Main primary color - Stream Violet
    600:'#6d28d9',
    700:'#5b21b6',
    800:'#4c1d95',
    900:'#3b0764',
    950:'#2e1065',
  },
  // Secondary brand colors
  secondary: {
    50:'#f8fafc',
    100:'#f1f5f9',
    200:'#e2e8f0',
    300:'#cbd5e1',
    400:'#94a3b8',
    500:'#64748b',
    600:'#475569',
    700:'#334155',
    800:'#1e293b',
    900:'#0f172a',
    950:'#020617',
  },
  // Success colors - Stream Green (available content)
  success: {
    50:'#ecfdf5',
    100:'#d1fae5',
    200:'#a7f3d0',
    300:'#6ee7b7',
    400:'#34d399',
    500:'#10b981',  // Stream Green - matches frontend
    600:'#059669',
    700:'#047857',
    800:'#065f46',
    900:'#064e3b',
    950:'#022c22',
  },
  // Warning colors
  warning: {
    50:'#fffbeb',
    100:'#fef3c7',
    200:'#fde68a',
    300:'#fcd34d',
    400:'#fbbf24',
    500:'#f59e0b',
    600:'#d97706',
    700:'#b45309',
    800:'#92400e',
    900:'#78350f',
    950:'#451a03',
  },
  // Error colors
  error: {
    50:'#fef2f2',
    100:'#fee2e2',
    200:'#fecaca',
    300:'#fca5a5',
    400:'#f87171',
    500:'#ef4444',
    600:'#dc2626',
    700:'#b91c1c',
    800:'#991b1b',
    900:'#7f1d1d',
    950:'#450a0a',
  },
  // Info colors
  info: {
    50:'#f0f9ff',
    100:'#e0f2fe',
    200:'#bae6fd',
    300:'#7dd3fc',
    400:'#38bdf8',
    500:'#0ea5e9',
    600:'#0284c7',
    700:'#0369a1',
    800:'#075985',
    900:'#0c4a6e',
    950:'#082f49',
  },
  // Accent colors - Golden Popcorn (entertainment feel)
  gold: {
    50:'#fffbeb',
    100:'#fef3c7',
    200:'#fde68a',
    300:'#fcd34d',
    400:'#fbbf24',
    500:'#f59e0b',
    600:'#d97706',
    700:'#b45309',
    800:'#92400e',
    900:'#78350f',
    950:'#451a03',
  },
  // Accent colors - Electric Cyan (digital discovery)
  cyan: {
    50:'#ecfeff',
    100:'#cffafe',
    200:'#a5f3fc',
    300:'#67e8f9',
    400:'#22d3ee',
    500:'#06b6d4',
    600:'#0891b2',
    700:'#0e7490',
    800:'#155e75',
    900:'#164e63',
    950:'#083344',
  },
  // Neutral colors (alias for slate)
  neutral: {
    50:'#f8fafc',
    100:'#f1f5f9',
    200:'#e2e8f0',
    300:'#cbd5e1',
    400:'#94a3b8',
    500:'#64748b',
    600:'#475569',
    700:'#334155',
    800:'#1e293b',
    900:'#0f172a',
    950:'#020617',
  },
  // Neutral colors for text and backgrounds
  gray: {
    50:'#f9fafb',
    100:'#f3f4f6',
    200:'#e5e7eb',
    300:'#d1d5db',
    400:'#9ca3af',
    500:'#6b7280',
    600:'#4b5563',
    700:'#374151',
    800:'#1f2937',
    900:'#111827',
    950:'#030712',
  },
  // System colors - UNIFIED with web frontend design tokens
  // Stream Violet palette
  system: {
    violet:'#7c3aed',  // Primary Stream Violet 500
    green:'#10b981',   // Stream Green 500 (available content)
    indigo:'#6366f1',  // Indigo 500
    orange:'#f97316',  // Orange 500
    pink:'#ec4899',    // Pink 500
    gold:'#f59e0b',    // Golden Popcorn 500
    red:'#ef4444',     // Alert Red 500 (unavailable)
    cyan:'#06b6d4',    // Electric Cyan 500
    amber:'#f59e0b',   // Caution Amber 500 (limited availability)
    yellow:'#fbbf24',  // Warning Amber 400
  },
  // Semantic color aliases - UNIFIED with web frontend
  brand:'#7c3aed',      // Primary brand color - Stream Violet (matches frontend --primary)
  accent:'#f59e0b',     // Accent color - Golden Popcorn
  accentCyan:'#06b6d4', // Secondary accent - Electric Cyan
  background:'#ffffff',  // Default background (matches frontend --background)
  surface:'#f8fafc',    // Card/section background (matches frontend --surface slate-50)
  border:'#e2e8f0',     // Default border (matches frontend --border slate-200)
  divider:'#f1f5f9',    // Section divider (slate-100)
  // Overlay colors for translucent UI elements
  overlay: {
    // Light overlays (for dark backgrounds)
    lighter:'rgba(255, 255, 255, 0.1)',  // Subtle light overlay
    light:'rgba(255, 255, 255, 0.2)',    // Light overlay
    lightMedium:'rgba(255, 255, 255, 0.3)', // Medium light overlay
    lightStrong:'rgba(255, 255, 255, 0.6)', // Strong light overlay
    lightBright:'rgba(255, 255, 255, 0.8)', // Bright light overlay
    // Overlays (for light backgrounds)
    overlayStrong:'rgba(0, 0, 0, 0.2)',
    darkMedium:'rgba(0, 0, 0, 0.5)',     // Medium dark overlay (modals)
    darker:'rgba(0, 0, 0, 0.4)',         // Strong dark overlay
    darkStrong:'rgba(0, 0, 0, 0.6)',     // Very dark overlay
    darkest:'rgba(0, 0, 0, 0.7)',        // Darkest overlay (progress bars)
  },
  // Social brand colors - official platform colors
  social: {
    whatsapp:'#25D366',
    whatsappLight:'#25D36620',
    twitter:'#1DA1F2',
    twitterLight:'#1DA1F220',
    facebook:'#1877F2',
    facebookLight:'#1877F220',
    telegram:'#0088CC',
    telegramLight:'#0088CC20',
    instagram:'#E4405F',
    instagramLight:'#E4405F20',
    linkedin:'#0A66C2',
    linkedinLight:'#0A66C220',
    google:'#4285F4',
    googleLight:'#4285F420',
    apple:'#000000',
    appleLight:'#00000020',
  },
  // Purple/Violet color scale for secondary accents
  purple: {
    50:'#faf5ff',
    100:'#f3e8ff',
    200:'#e9d5ff',
    300:'#d8b4fe',
    400:'#c084fc',
    500:'#a855f7',
    600:'#9333ea',
    700:'#7e22ce',
    800:'#6b21a8',
    900:'#581c87',
    950:'#3b0764',
  },
  // Streaming service brand colors - official platform colors
  streamingServices: {
    netflix:'#E50914',
    netflixLight:'#E5091420',
    disney:'#113CCF',
    disneyLight:'#113CCF20',
    hbo:'#000000',
    hboLight:'#00000020',
    prime:'#00A8E1',
    primeLight:'#00A8E120',
    hulu:'#1CE783',
    huluLight:'#1CE78320',
    apple:'#000000',
    appleLight:'#00000020',
    peacock:'#000000',
    peacockLight:'#00000020',
    paramount:'#0064FF',
    paramountLight:'#0064FF20',
    crunchyroll:'#F47521',
    crunchyrollLight:'#F4752120',
    youtube:'#FF0000',
    youtubeLight:'#FF000020',
    spotify:'#1DB954',
    spotifyLight:'#1DB95420',
  },
  // Opacity values for consistent transparency
  opacity: {
    high: 0.9,
    medium: 0.8,
    low: 0.6,
    subtle: 0.1,
  },
  // Flat color aliases for component compatibility
  text:'#0f172a',             // Primary text color (slate-900)
  textSecondary:'#64748b',    // Secondary text color (slate-500)
  textDisabled:'#94a3b8',     // Disabled text color (slate-400)
  white:'#ffffff',
  black:'#000000',
  transparent:'transparent',
  onSurfaceVariant:'#64748b', // On surface variant (slate-500)
  surfaceVariant:'#f1f5f9',   // Surface variant (slate-100)
  surfaceRaised:'#ffffff',    // Raised surface
  outline:'#e2e8f0',          // Outline color (slate-200)
  outlineVariant:'#cbd5e1',   // Outline variant (slate-300)
  inverseSurface:'#1e293b',   // Inverse surface (slate-800)
  inverseOnSurface:'#f8fafc', // Inverse on surface (slate-50)
  inversePrimary:'#c4b5fd',   // Inverse primary (primary-300)
  scrim:'rgba(0, 0, 0, 0.4)', // Scrim overlay
  backdrop:'rgba(0, 0, 0, 0.4)', // Backdrop overlay
  shadow:'#000000',           // Shadow color
  // Flat primary color aliases - Stream Violet
  primaryFlat:'#7c3aed',      // Primary 500 - Stream Violet
  primaryDark:'#6d28d9',      // Primary 600
  primaryLight:'#ede9fe',     // Primary 100
  primaryLighter:'#a78bfa',   // Primary 400
  secondaryFlat:'#64748b',    // Secondary 500 - Slate
  secondaryDark:'#475569',    // Secondary 600
  secondaryLight:'#94a3b8',   // Secondary 400
  // Status flat colors - UNIFIED with frontend semantic colors
  errorFlat:'#ef4444',        // Alert Red 500
  warningFlat:'#f59e0b',      // Caution Amber 500
  successFlat:'#10b981',      // Stream Green 500
  infoFlat:'#0ea5e9',         // Discovery Blue 500
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  sm: 2,    // 2px
  base: 4,  // 4px
  md: 6,    // 6px
  lg: 8,    // 8px
  xl: 12,   // 12px'2xl': 16, // 16px'3xl': 24, // 24px
  full: 9999,
} as const;

// Shadow presets for React Native
export const shadows = {
  sm: {
    shadowColor:'#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  base: {
    shadowColor:'#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor:'#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor:'#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor:'#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 12,
  },'2xl': {
    shadowColor:'#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 16,
  },
  none: {
    shadowColor:'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// Breakpoints for responsive design (using screen dimensions)
export const breakpoints = {
  sm: 375,  // iPhone SE
  md: 414,  // iPhone Pro
  lg: 768,  // iPad Mini
  xl: 1024, // iPad'2xl': 1280, // iPad Pro
} as const;

// Animation durations and easing
export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 700,
  },
  easing: {
    ease:'ease',
    easeIn:'ease-in',
    easeOut:'ease-out',
    easeInOut:'ease-in-out',
    linear:'linear',
  },
} as const;

// Z-index scale for React Native
export const zIndex = {
  background: -1,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Component-specific tokens
export const components = {
  // Button tokens
  button: {
    padding: {
      sm: { vertical: spacing[2], horizontal: spacing[3] },
      md: { vertical: spacing[3], horizontal: spacing[4] },
      lg: { vertical: spacing[4], horizontal: spacing[6] },
    },
    fontSize: {
      sm: typography.fontSize.sm,
      md: typography.fontSize.base,
      lg: typography.fontSize.lg,
    },
    borderRadius: {
      sm: borderRadius.md,
      md: borderRadius.lg,
      lg: borderRadius.xl,
    },
    shadow: shadows.sm,
    minWidth: 44, // Minimum touch target
    minHeight: 44, // Minimum touch target (default medium)
    minHeightSmall: 36, // Small button minimum height
    minHeightLarge: 52, // Large button minimum height
    minHeightAccessible: 48, // Accessible/larger touch target
    borderWidth: 1, // Default border width for outline variant
    disabledOpacity: 0.6, // Opacity for disabled state
  },
  // Card tokens
  card: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    shadow: shadows.md,
    backgroundColor: colors.surface,
  },
  // Input tokens
  input: {
    padding: { vertical: spacing[3], horizontal: spacing[4] },
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: typography.fontSize.base,
    minHeight: 44, // Minimum touch target
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  // Navigation tokens
  navigation: {
    height: {
      header: 56,  // Standard header height
      tab: 64,     // Bottom tab bar height
    },
    padding: {
      horizontal: spacing[4],
      vertical: spacing[3],
    },
  },
  // Search tokens
  search: {
    input: {
      height: 48,
      padding: { vertical: spacing[3], horizontal: spacing[4] },
      borderRadius: borderRadius.lg,
      fontSize: typography.fontSize.base,
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    results: {
      padding: spacing[4],
      borderRadius: borderRadius.lg,
      shadow: shadows.md,
      backgroundColor: colors.background,
    },
  },
  // List tokens
  list: {
    item: {
      padding: { vertical: spacing[4], horizontal: spacing[4] },
      minHeight: 60, // Minimum touch target
      separatorColor: colors.divider,
      backgroundColor: colors.background,
    },
  },
  // Icon tokens
  icon: {
    size: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 40,'2xl': 48,
    },
  },
} as const;

// Semantic tokens for common use cases - UNIFIED with web frontend themeColors
export const semantic = {
  text: {
    primary: colors.secondary[900],   // #0f172a - matches frontend light --foreground (slate-900)
    secondary: colors.secondary[500], // #64748b - matches frontend --foreground-muted (slate-500)
    tertiary: colors.secondary[400],  // #94a3b8 - matches frontend --foreground-subtle (slate-400)
    inverse: colors.secondary[50],    // #f8fafc - matches frontend dark --foreground
    muted: colors.secondary[400],     // #94a3b8 - matches frontend --foreground-subtle
    link: colors.primary[500],        // #7c3aed - Stream Violet - matches frontend --primary
    linkHover: colors.primary[600],   // #6d28d9 - matches frontend --primary-hover
    success: colors.success[500],     // #10b981 - Stream Green
    warning: colors.warning[500],     // #f59e0b - Caution Amber
    error: colors.error[500],         // #ef4444 - Alert Red
  },
  background: {
    primary: colors.background,       // #ffffff - matches frontend --background
    secondary: colors.surface,        // #f8fafc - matches frontend --background-muted (slate-50)
    tertiary: colors.neutral[100],    // #f1f5f9 - matches frontend --background-subtle (slate-100)
    inverse: colors.secondary[900],   // #0f172a - matches frontend dark --background (slate-900)
    muted: colors.neutral[50],        // #f8fafc - matches frontend --background-muted
    overlay: colors.overlay.lighter,   // Strong dark overlay for modals
    success: colors.success[50],      // #ecfdf5 - Stream Green 50
    warning: colors.warning[50],      // #fffbeb - Caution Amber 50
    error: colors.error[50],          // #fef2f2 - Alert Red 50
  },
  border: {
    primary: colors.border,           // #e2e8f0 - matches frontend --border (slate-200)
    secondary: colors.neutral[100],   // #f1f5f9 - matches frontend --border-muted (slate-100)
    tertiary: colors.neutral[300],    // #cbd5e1
    inverse: colors.secondary[700],   // #334155 - matches frontend dark --border (slate-700)
    focus: colors.primary[500],       // #7c3aed - Stream Violet - matches frontend --ring
    error: colors.error[500],         // #ef4444 - Alert Red
    success: colors.success[500],     // #10b981 - Stream Green
    warning: colors.warning[500],     // #f59e0b - Caution Amber
  },
  status: {
    online: colors.success[500],      // #10b981 - Stream Green (available)
    offline: colors.neutral[400],     // #94a3b8 (slate-400)
    busy: colors.warning[500],        // #f59e0b - Caution Amber (limited)
    error: colors.error[500],         // #ef4444 - Alert Red (unavailable)
    success: colors.success[500],     // #10b981 - Stream Green
    warning: colors.warning[500],     // #f59e0b - Caution Amber
    info: colors.info[500],           // #0ea5e9 - Discovery Blue
  },
} as const;

// Light-Only Mode tokens - UNIFIED with web frontend themeColors.light

/**
 * Streaming Service Brand Colors
 * Official brand colors for streaming service integrations
 */
export const STREAMING_BRAND_COLORS = {
  netflix:'#E50914',
  primeVideo:'#00A8E1',
  disneyPlus:'#113CCF',
  hulu:'#1CE783',
  hboMax:'#B000E8',
  appleTvPlus:'#000000',
} as const;

export type StreamingService = keyof typeof STREAMING_BRAND_COLORS;

/**
 * Social Login Provider Brand Colors
 */
export const SOCIAL_BRAND_COLORS = {
  google: {
    primary:'#4285F4',
    gradient: ['#4285F4','#357ae8'] as const,
    shadow:'#4285F4',
  },
  facebook: {
    primary:'#1877F2',
    gradient: ['#1877F2','#0e5fcd'] as const,
    shadow:'#1877F2',
  },
  apple: {
    primary:'#000000',
    gradient: ['#000000','#333333'] as const,
    shadow:'#000000',
  },
  twitter: {
    primary:'#1DA1F2',
    gradient: ['#1DA1F2','#0d8ddb'] as const,
    shadow:'#1DA1F2',
  },
} as const;

export type SocialProvider = keyof typeof SOCIAL_BRAND_COLORS;

// Export all tokens as a single object
export const designTokens = {
  spacing,
  typography,
  colors,
  borderRadius,
  shadows,
  breakpoints,
  animations,
  zIndex,
  components,
  semantic
} as const;

export default designTokens;
