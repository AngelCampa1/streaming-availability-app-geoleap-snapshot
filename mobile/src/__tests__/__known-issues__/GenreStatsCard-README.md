# Known Issue: GenreStatsCard Component Testing

## Issue Summary
GenreStatsCard component cannot be tested due to ThemeProvider import pattern causing rendering failures in Jest environment.

## File Affected
- `GenreStatsCard.test.tsx` (5 tests planned)

## Problem Description

**Symptoms**:
- Component fails to render in tests with error: "Element type is invalid: expected a string... but got: undefined"
- Same rendering issue as VpnRecommendationModal and SubscriptionSelector

**Root Cause**:
GenreStatsCard imports theme from ThemeProvider directly:
```typescript
import { useTheme } from '../../theme/ThemeProvider';
```

This import pattern fails in the Jest test environment, while the alternative pattern works:
```typescript
import { useTheme } from '../../hooks/useTheme'; // ✓ Works in tests
```

## Comparison with Working Components

**✅ Working Components** (use `hooks/useTheme`):
- CurrentlyWatching
- RecommendationsSection
- ViewingHistory

**❌ Blocked Components** (use `theme/ThemeProvider`):
- VpnRecommendationModal
- SubscriptionSelector
- GenreStatsCard

## Impact

- **5 planned tests** moved to known-issues
- **Component test coverage** for genre statistics postponed
- **Dashboard component testing** completed for 3 of 4 components

## Alternative Testing Approach

1. Test the component manually on device
2. Focus on testing the parent Dashboard component that uses GenreStatsCard
3. Return to this test after resolving ThemeProvider mock infrastructure
4. Consider refactoring GenreStatsCard to use `hooks/useTheme` import pattern

## Date
2025-12-16

## Time Investment
Minimal - issue already known from VpnRecommendationModal and SubscriptionSelector

## Related Issues
- VpnRecommendationModal (Day 4) - Same ThemeProvider import issue
- SubscriptionSelector (Day 4) - Same ThemeProvider import issue
- See `__known-issues__/README.md` for ThemeProvider testing challenges
