# GeoLeap Unified Color System

## "Stream Violet" Palette - Entertainment Discovery

This document defines the unified color palette used across all GeoLeap platforms (web frontend and mobile app). The palette is designed to evoke entertainment, discovery, and modern streaming aesthetics.

## Brand Philosophy

| Concept | Color Direction | Emotion |
|---------|-----------------|---------|
| **Entertainment** | Stream Violet | Premium, modern streaming |
| **Discovery** | Electric Cyan | Digital exploration |
| **Warmth** | Golden Popcorn | Movie theater nostalgia |
| **Availability** | Stream Green | Content accessible |

---

## Core Brand Colors

### Primary - Stream Violet
The main brand color representing entertainment and streaming discovery.

| Shade | Hex | RGB | Usage |
|-------|-----|-----|-------|
| 50 | `#f5f3ff` | rgb(245, 243, 255) | Light backgrounds |
| 100 | `#ede9fe` | rgb(237, 233, 254) | Hover backgrounds |
| 200 | `#ddd6fe` | rgb(221, 214, 254) | Subtle highlights |
| 300 | `#c4b5fd` | rgb(196, 181, 253) | Light accents |
| 400 | `#a78bfa` | rgb(167, 139, 250) | Light-Only Mode primary |
| **500** | **`#7c3aed`** | rgb(124, 58, 237) | **Main Primary** |
| 600 | `#6d28d9` | rgb(109, 40, 217) | Hover on primary |
| 700 | `#5b21b6` | rgb(91, 33, 182) | Active/pressed |
| 800 | `#4c1d95` | rgb(76, 29, 149) | Dark variant |
| 900 | `#3b0764` | rgb(59, 7, 100) | Darkest variant |
| 950 | `#2e1065` | rgb(46, 16, 101) | Near black |

### Secondary - Slate
Used for secondary actions, muted text, and neutral UI elements.

| Shade | Hex | RGB | Usage |
|-------|-----|-----|-------|
| 50 | `#f8fafc` | rgb(248, 250, 252) | Light backgrounds |
| 100 | `#f1f5f9` | rgb(241, 245, 249) | Card backgrounds |
| 200 | `#e2e8f0` | rgb(226, 232, 240) | Borders |
| 300 | `#cbd5e1` | rgb(203, 213, 225) | Muted borders |
| 400 | `#94a3b8` | rgb(148, 163, 184) | Placeholder text |
| **500** | **`#64748b`** | rgb(100, 116, 139) | **Main Secondary** |
| 600 | `#475569` | rgb(71, 85, 105) | Secondary text |
| 700 | `#334155` | rgb(51, 65, 85) | Dark text |
| 800 | `#1e293b` | rgb(30, 41, 59) | Dark backgrounds |
| 900 | `#0f172a` | rgb(15, 23, 42) | Darkest |
| 950 | `#020617` | rgb(2, 6, 23) | Near black |

---

## Accent Colors

### Golden Popcorn
Entertainment warmth, movie theater nostalgia, highlights.

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#fffbeb` | Light background |
| 400 | `#fbbf24` | Light-Only Mode accent |
| **500** | **`#f59e0b`** | **Main Accent** |
| 600 | `#d97706` | Hover state |

### Electric Cyan
Digital discovery, modern tech feel.

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#ecfeff` | Light background |
| 400 | `#22d3ee` | Light-Only Mode accent |
| **500** | **`#06b6d4`** | **Main Accent** |
| 600 | `#0891b2` | Hover state |

---

## Status Colors

### Success - Stream Green (Available Content)
| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#ecfdf5` | Success background |
| 400 | `#34d399` | Light-Only Mode success |
| **500** | **`#10b981`** | **Main Success** |
| 600 | `#059669` | Success text |

### Warning - Caution Amber (Limited Availability)
| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#fffbeb` | Warning background |
| 400 | `#fbbf24` | Light-Only Mode warning |
| **500** | **`#f59e0b`** | **Main Warning** |
| 600 | `#d97706` | Warning text |

### Error - Alert Red (Unavailable Content)
| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#fef2f2` | Error background |
| 400 | `#f87171` | Light-Only Mode error |
| **500** | **`#ef4444`** | **Main Error** |
| 600 | `#dc2626` | Error text |

### Info - Discovery Blue (Tips & Suggestions)
| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#f0f9ff` | Info background |
| 400 | `#38bdf8` | Light-Only Mode info |
| **500** | **`#0ea5e9`** | **Main Info** |
| 600 | `#0284c7` | Info text |

---

## Semantic Color Mappings

### Light Mode
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#ffffff` | Page background |
| `foreground` | `#0f172a` | Primary text |
| `primary` | `#7c3aed` | Stream Violet |
| `primary-hover` | `#6d28d9` | Hover state |
| `surface` | `#f8fafc` | Card background |
| `border` | `#e2e8f0` | Default border |
| `muted` | `#64748b` | Muted text |
| `ring` | `#7c3aed` | Focus ring |

### Light-Only Mode
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#0f172a` | Page background |
| `foreground` | `#f8fafc` | Primary text |
| `primary` | `#a78bfa` | Lighter violet |
| `primary-hover` | `#c4b5fd` | Hover state |
| `surface` | `#1e293b` | Card background |
| `border` | `#334155` | Default border |
| `muted` | `#94a3b8` | Muted text |
| `ring` | `#a78bfa` | Focus ring |

---

## Platform Implementation

### Frontend (Next.js/Tailwind)
Colors are defined in `frontend/src/app/globals.css` using CSS custom properties.

```css
:root {
  --primary: #7c3aed;
  --primary-foreground: #ffffff;
  --primary-hover: #6d28d9;
  --primary-active: #5b21b6;
  --accent-gold: #f59e0b;
  --accent-cyan: #06b6d4;
  /* ... */
}

.light {
  --primary: #a78bfa;
  --primary-foreground: #0f172a;
  --primary-hover: #c4b5fd;
  /* ... */
}
```

### Design Tokens (TypeScript)
```typescript
// frontend/src/lib/design-tokens.ts (single source of truth)
export const colors = {
  primary: {
    500: '#7c3aed', // Stream Violet
    // ...
  },
  gold: {
    500: '#f59e0b', // Golden Popcorn
  },
  cyan: {
    500: '#06b6d4', // Electric Cyan
  }
};
```

### Mobile (React Native)
Colors are fully synchronized in `mobile/src/tokens/designTokens.ts` and `mobile/src/theme/Theme.ts`.

```typescript
// mobile/src/tokens/designTokens.ts
export const colors = {
  primary: {
    500: '#7c3aed', // Stream Violet
    400: '#a78bfa', // Light-Only Mode primary
  },
  success: {
    500: '#10b981', // Stream Green (available content)
  },
  warning: {
    500: '#f59e0b', // Caution Amber (limited availability)
  },
  error: {
    500: '#ef4444', // Alert Red (unavailable)
  },
  gold: {
    500: '#f59e0b', // Golden Popcorn
  },
  cyan: {
    500: '#06b6d4', // Electric Cyan
  },
  secondary: {
    // Slate palette for neutrals
    50: '#f8fafc',
    200: '#e2e8f0', // border
    500: '#64748b', // muted text
    700: '#334155', // dark border
    900: '#0f172a', // foreground
  }
};

// Light mode semantic mappings
export const semantic = {
  text: {
    primary: colors.secondary[900],   // #0f172a
    secondary: colors.secondary[500], // #64748b
    link: colors.primary[500],        // #7c3aed
  },
  background: {
    primary: '#ffffff',
    secondary: colors.secondary[50],  // #f8fafc
  },
  border: {
    primary: colors.secondary[200],   // #e2e8f0
    focus: colors.primary[500],       // #7c3aed
  }
};

// Light-Only Mode mappings
export const lightOnlyMode = {
  text: {
    primary: colors.secondary[50],    // #f8fafc
    secondary: colors.secondary[400], // #94a3b8
    link: colors.primary[400],        // #a78bfa
  },
  background: {
    primary: colors.secondary[900],   // #0f172a
    secondary: colors.secondary[800], // #1e293b
  },
  border: {
    primary: colors.secondary[700],   // #334155
    focus: colors.primary[400],       // #a78bfa
  }
};
```

---

## Usage Guidelines

### Primary Actions
Use **Stream Violet** (`#7c3aed`) for:
- Primary buttons and CTAs
- Active navigation states
- Links and interactive elements
- Focus rings

### Entertainment Highlights
Use **Golden Popcorn** (`#f59e0b`) for:
- Featured content badges
- Premium features
- Promotional elements
- Rating stars

### Discovery Elements
Use **Electric Cyan** (`#06b6d4`) for:
- New content indicators
- Discovery features
- Secondary highlights
- Chart accents

### Content Availability
- **Available**: Stream Green (`#10b981`)
- **Limited/Leaving Soon**: Caution Amber (`#f59e0b`)
- **Unavailable**: Alert Red (`#ef4444`)

---

## Migration Notes

When updating colors:
1. Update `frontend/src/app/globals.css` (CSS variables)
2. Update `frontend/tailwind.config.js` (Tailwind scales)
3. Update `frontend/src/lib/design-tokens.ts` (single source of truth for web tokens)
4. Update mobile token files if applicable
6. Test in both light and Light-Only Modes
7. Verify accessibility contrast ratios (WCAG AA minimum)

---

## Accessibility

All color combinations meet WCAG 2.1 AA standards:
- Primary on white: 4.5:1+ contrast ratio
- Primary text on backgrounds: Verified for readability
- Focus states: Clearly visible ring colors
- Status colors: Sufficient contrast for colorblind users
