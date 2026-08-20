/**
 * GeoLeap Design System - Color Tokens
 *"Stream Violet" Palette - Entertainment Discovery
 *
 * This file defines the comprehensive color palette and design tokens
 * for the GeoLeap application, supporting both light and Light Themes
 * with WCAG 2.1 AA accessibility compliance.
 */

export const designTokens = {
  // Brand Colors - Core brand identity (Stream Violet palette)
  brand: {
    primary: {
      // Stream Violet - Modern streaming/entertainment feel
      50:'#f5f3ff',
      100:'#ede9fe',
      200:'#ddd6fe',
      300:'#c4b5fd',
      400:'#a78bfa',
      500:'#7c3aed', // Primary brand color
      600:'#6d28d9',
      700:'#5b21b6',
      800:'#4c1d95',
      900:'#3b0764',
      950:'#2e1065',
    },
    secondary: {
      // Slate - Clean neutral system
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
    // Accent colors for entertainment feel
    gold: {
      // Golden Popcorn - Movie theater warmth
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
    cyan: {
      // Electric Cyan - Digital discovery
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
  },

  // Neutral Colors - Backgrounds, surfaces, borders (using hex for consistency)
  neutral: {
    0:'#ffffff', // Pure white
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
    1000:'#000000', // Pure black
  },

  // Semantic Colors - Success, warning, error, info
  semantic: {
    success: {
      // Stream Green - Available content
      50:'#ecfdf5',
      100:'#d1fae5',
      200:'#a7f3d0',
      300:'#6ee7b7',
      400:'#34d399',
      500:'#10b981',
      600:'#059669',
      700:'#047857',
      800:'#065f46',
      900:'#064e3b',
      950:'#022c22',
    },
    warning: {
      // Caution Amber - Limited availability
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
    error: {
      // Alert Red - Unavailable
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
    info: {
      // Discovery Blue - Tips
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
  },

  // Typography scale
  typography: {
    fontFamily: {
      sans:'var(--font-geist-sans)',
      mono:'var(--font-geist-mono)',
    },
    fontSize: {
      xs:'0.75rem',
      sm:'0.875rem',
      base:'1rem',
      lg:'1.125rem',
      xl:'1.25rem','2xl':'1.5rem','3xl':'1.875rem','4xl':'2.25rem','5xl':'3rem','6xl':'3.75rem',
    },
    fontWeight: {
      light:'300',
      normal:'400',
      medium:'500',
      semibold:'600',
      bold:'700',
    },
    lineHeight: {
      tight:'1.25',
      normal:'1.5',
      relaxed:'1.75',
    },
    letterSpacing: {
      tighter:'-0.05em',
      tight:'-0.025em',
      normal:'0em',
      wide:'0.025em',
      wider:'0.05em',
      widest:'0.1em',
    },
  },

  // Spacing and sizing tokens
  spacing: {
    0:'0',
    1:'0.25rem',
    2:'0.5rem',
    3:'0.75rem',
    4:'1rem',
    5:'1.25rem',
    6:'1.5rem',
    8:'2rem',
    10:'2.5rem',
    12:'3rem',
    16:'4rem',
    20:'5rem',
    24:'6rem',
    32:'8rem',
    40:'10rem',
    48:'12rem',
    56:'14rem',
    64:'16rem',
  },

  // Border radius tokens
  borderRadius: {
    none:'0',
    sm:'calc(var(--radius) - 4px)',
    md:'calc(var(--radius) - 2px)',
    lg:'var(--radius)',
    xl:'calc(var(--radius) + 4px)',
    full:'9999px',
  },

  // Shadow tokens
  shadow: {
    sm:'0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md:'0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg:'0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl:'0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Responsive breakpoints
  breakpoints: {
    sm:'640px',
    md:'768px',
    lg:'1024px',
    xl:'1280px','2xl':'1536px',
  },

  // Animation durations and easing
  animations: {
    duration: {
      75:'75ms',
      100:'100ms',
      150:'150ms',
      200:'200ms',
      300:'300ms',
      500:'500ms',
      700:'700ms',
      1000:'1000ms',
    },
    easing: {
      linear:'linear',
      ease:'ease',
      easeIn:'ease-in',
      easeOut:'ease-out',
      easeInOut:'ease-in-out',
    },
  },

  // Z-index scale
  zIndex: {
    0:'0',
    10:'10',
    20:'20',
    30:'30',
    40:'40',
    50:'50',
    auto:'auto',
    base:'0',
    docked:'10',
    dropdown:'1000',
    sticky:'1100',
    banner:'1200',
    overlay:'1300',
    modal:'1400',
    popover:'1500',
    skipLink:'1600',
    toast:'1700',
    tooltip:'1800',
  },
} as const;

// Theme-specific color mappings
export const themeColors = {
  light: {
    // Background colors
    background: designTokens.neutral[0],
    'background-muted': designTokens.neutral[50],
    'background-subtle': designTokens.neutral[100],

    // Foreground colors
    foreground: designTokens.neutral[900],
    'foreground-muted': designTokens.neutral[500],
    'foreground-subtle': designTokens.neutral[400],

    // Surface colors
    surface: designTokens.neutral[0],
    'surface-raised': designTokens.neutral[0],
    'surface-overlay': designTokens.neutral[0],

    // Border colors
    border: designTokens.neutral[200],
    'border-muted': designTokens.neutral[100],

    // Interactive colors - Stream Violet
    primary: designTokens.brand.primary[500],
    'primary-foreground': designTokens.neutral[0],
    'primary-hover': designTokens.brand.primary[600],
    'primary-active': designTokens.brand.primary[700],

    secondary: designTokens.neutral[100],
    'secondary-foreground': designTokens.neutral[900],
    'secondary-hover': designTokens.neutral[200],
    'secondary-active': designTokens.neutral[300],

    // Accent colors
    'accent-gold': designTokens.brand.gold[500],
    'accent-cyan': designTokens.brand.cyan[500],

    // Semantic colors
    success: designTokens.semantic.success[500],
    'success-foreground': designTokens.neutral[0],
    warning: designTokens.semantic.warning[500],
    'warning-foreground': designTokens.neutral[0],
    error: designTokens.semantic.error[500],
    'error-foreground': designTokens.neutral[0],
    info: designTokens.semantic.info[500],
    'info-foreground': designTokens.neutral[0],

    // Focus and ring colors
    ring: designTokens.brand.primary[500],
    'focus-visible': designTokens.brand.primary[500],
  },
} as const;

export type ThemeMode ='light';
export type ColorToken = keyof typeof themeColors.light;
