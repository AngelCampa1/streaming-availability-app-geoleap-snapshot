# Mobile Theme System Migration Guide

## Overview
This document describes the migration of mobile screen components from hardcoded colors to the unified theme system using semantic tokens and the `useTheme` hook.

## Migration Status

### ✅ Completed (2/12)
1. **ContentDetailScreen.tsx** - 27 occurrences migrated
2. **LibraryScreen.tsx** - 23 occurrences migrated

### 🔄 Pending (10/12)
3. **LandingScreen.tsx** - 22 occurrences (uses existing `theme` from Theme.tsx, needs semantic tokens)
4. **SearchScreen.tsx** - 19 occurrences
5. **BrowseScreen.tsx** - 18 occurrences
6. **search/SearchScreen.tsx** - 19 occurrences
7. **subscription/SubscriptionManagementScreen.tsx** - 5 occurrences
8. **settings/AuthenticationSettingsScreen.tsx** - 4 occurrences
9. **onboarding/BiometricSetupScreen.tsx** - 3 occurrences
10. **settings/LanguagePreferencesScreen.tsx** - 2 occurrences (already uses `useTheme` from react-native-paper)
11. **vpn/VpnProviderComparisonScreen.tsx** - 1 occurrence
12. **vpn/VpnGuidanceScreen.tsx** - minimal hardcoded colors

## Theme System Architecture

### Theme Provider Location
`mobile/src/theme/ThemeProvider.tsx`

### Available Theme Tokens

```typescript
theme.semantic.background.primary  // White in light, dark gray in dark
theme.semantic.background.secondary // Light gray (#f8f9fa)
theme.semantic.text.primary        // #333 equivalent
theme.semantic.text.secondary      // #666 equivalent
theme.semantic.text.tertiary       // #999 equivalent
theme.semantic.border.primary      // Border colors (#e9ecef, #e0e0e0)

theme.colors.primary[500]          // Blue (#007AFF)
theme.colors.warning[500]          // Yellow (#FFD700)
theme.colors.error[500]            // Red (#FF3B30, #c62828)
theme.colors.error[50]             // Light red background (#ffebee)
theme.colors.error[200]            // Error border (#ffcdd2)
theme.colors.success[500]          // Green (#4CAF50, #34C759, #28A745)
theme.colors.success[50]           // Light green background (#F0FFF4)
```

## Migration Pattern

### Step 1: Add Imports
```typescript
// Add useMemo to React imports
import React, { useState, useCallback, useMemo } from 'react';

// Add useTheme hook (adjust path based on file location)
import { useTheme } from '../theme/ThemeProvider';
// For nested directories use: '../../theme/ThemeProvider'
```

### Step 2: Get Theme in Component
```typescript
const ScreenComponent: React.FC = () => {
  const { theme } = useTheme();
  // ... rest of component
```

### Step 3: Convert StyleSheet to Dynamic Styles
```typescript
// BEFORE - Static StyleSheet at bottom of file
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
  },
  title: {
    color: '#333',
  },
});

// AFTER - Dynamic styles with useMemo inside component
const ScreenComponent: React.FC = () => {
  const { theme } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: theme.semantic.background.primary,
    },
    title: {
      color: theme.semantic.text.primary,
    },
  }), [theme]);

  return (/* JSX */);
};
```

### Step 4: Remove Old Static StyleSheet
Delete the old `const styles = StyleSheet.create({...});` at the bottom of the file.

## Color Mapping Reference

| Hardcoded Color | Theme Token |
|----------------|-------------|
| `#ffffff`, `#fff` | `theme.semantic.background.primary` |
| `#f8f9fa`, `#f0f0f0` | `theme.semantic.background.secondary` |
| `#333`, `#333333` | `theme.semantic.text.primary` |
| `#666`, `#666666` | `theme.semantic.text.secondary` |
| `#999`, `#999999` | `theme.semantic.text.tertiary` |
| `#007AFF` | `theme.colors.primary[500]` |
| `#FFD700` | `theme.colors.warning[500]` |
| `#FF3B30`, `#c62828` | `theme.colors.error[500]` |
| `#ffebee` | `theme.colors.error[50]` |
| `#ffcdd2` | `theme.colors.error[200]` |
| `#4CAF50`, `#34C759`, `#28A745` | `theme.colors.success[500]` |
| `#F0FFF4` | `theme.colors.success[50]` |
| `#e9ecef`, `#e0e0e0` | `theme.semantic.border.primary` |
| `#f5f5f5` | `theme.semantic.background.secondary` |

## Example: Complete Migration

```typescript
// ========== BEFORE ==========
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MyScreen: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 16,
  },
  title: {
    color: '#333',
    fontSize: 24,
  },
});

export default MyScreen;

// ========== AFTER ==========
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const MyScreen: React.FC = () => {
  const { theme } = useTheme();
  const [count, setCount] = useState(0);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: theme.semantic.background.primary,
      padding: 16,
    },
    title: {
      color: theme.semantic.text.primary,
      fontSize: 24,
    },
  }), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
};

export default MyScreen;
```

## Important Notes

1. **Import Path**: Adjust `useTheme` import path based on file location:
   - `screens/*.tsx`: `../theme/ThemeProvider`
   - `screens/search/*.tsx`: `../../theme/ThemeProvider`
   - `screens/settings/*.tsx`: `../../theme/ThemeProvider`
   - `screens/subscription/*.tsx`: `../../theme/ThemeProvider`
   - `screens/onboarding/*.tsx`: `../../theme/ThemeProvider`
   - `screens/vpn/*.tsx`: `../../theme/ThemeProvider`

2. **Preserve Visual Appearance**: The migration should NOT change how the app looks - only switch from hardcoded colors to theme tokens.

3. **TypeScript Types**: Keep `ViewStyle` and `TextStyle` type annotations where they exist.

4. **Component Logic**: DO NOT change component logic, state management, or functionality - only the color values.

5. **Testing**: After migration, test both light and Light-Only Modes to ensure proper theme switching.

## Files Requiring Special Attention

### LanguagePreferencesScreen.tsx
- Already imports `useTheme` from `react-native-paper`
- Needs to import from our `ThemeProvider` instead
- Uses Material Design theme structure - map carefully

### LandingScreen.tsx
- Already uses `theme` from `Theme.tsx`
- Verify it's using semantic tokens correctly
- May need minimal changes

### Subscription/Settings/Onboarding Screens
- Simpler components with fewer colors
- Quick migrations (3-5 occurrences each)
- Good starting points for practice

## Next Steps

1. Migrate remaining 10 screen files following the pattern above
2. Test light/Light-Only Mode switching in each migrated screen
3. Verify no visual regressions
4. Update this document with completion status
5. Remove temporary `migrate-theme.js` script when done

## Testing Checklist

After migrating each file:
- [ ] File compiles without TypeScript errors
- [ ] Component renders correctly in light mode
- [ ] Component renders correctly in Light-Only Mode
- [ ] Theme switching works smoothly
- [ ] No visual regressions
- [ ] Accessibility (color contrast) maintained

## Migration Priority

**High Priority (Most Impact)**:
1. SearchScreen.tsx (19 occurrences)
2. BrowseScreen.tsx (18 occurrences)
3. search/SearchScreen.tsx (19 occurrences)

**Medium Priority**:
4. LandingScreen.tsx (22 occurrences - verify existing usage)

**Low Priority (Quick Wins)**:
5-10. Settings, Subscription, Onboarding screens (2-5 occurrences each)
11-12. VPN screens (minimal changes)

## Support Resources

- **Theme Provider**: `mobile/src/theme/ThemeProvider.tsx`
- **Design Tokens**: `mobile/src/tokens/designTokens.ts`
- **Example Migrations**: See `ContentDetailScreen.tsx` and `LibraryScreen.tsx`
- **Theme Usage**: See completed files for real-world patterns

---

**Status**: 2/12 files migrated (16.7% complete)
**Last Updated**: 2025-11-25
**Estimated Remaining Effort**: 4-6 hours for all remaining files
