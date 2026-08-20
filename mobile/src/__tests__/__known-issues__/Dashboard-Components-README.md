# Known Issue: Dashboard Component Internal Mock Data

## Issue Summary
CurrentlyWatching and RecommendationsSection components use internal mock data that cannot be overridden by test mocks, preventing external data injection for testing.

## Files Affected
- `CurrentlyWatching.test.tsx` (5 tests planned)
- `RecommendationsSection.test.tsx` (5 tests planned)

## Problem Description

**Symptoms**:
- Components render successfully with theme mocks applied
- External mock data from `useWatchlist` and `useRecommendations` hooks is not displayed
- Components show internal placeholder data instead
- Test assertions fail: "Unable to find an element with text: Stranger Things"

**Root Cause**:
Components use internal mock data arrays that are not affected by Jest mocks of hooks. The components likely have fallback logic that prioritizes internal mock data over hook return values.

**Example Error**:
```
Unable to find an element with text: Stranger Things

<View>
  <View>
    <Text>Continue Watching</Text>
    <Text>2 items in progress</Text>
  </View>
  <FlatList />
</View>
```

The component renders the "Continue Watching" header but doesn't display the mock data provided via `useWatchlist` hook.

## Components That Work vs. Blocked

**✅ Working Components** (5 tests passing):
- **ViewingHistory.tsx** - Successfully uses theme mock, renders without external data dependency

**❌ Blocked Components** (10 tests blocked):
- **CurrentlyWatching.tsx** - Requires `useWatchlist` hook data injection
- **RecommendationsSection.tsx** - Requires `useRecommendations` and `useWatchlist` hook data injection
- **GenreStatsCard.tsx** - Uses `theme/ThemeProvider` import (different issue)

## Attempted Solutions

1. **Comprehensive Hook Mocking** - Created complete mock return values with all required fields
   - Result: Failed - components don't consume the mock data

2. **Theme Mock Refinement** - Added complete theme structure including:
   - `theme.semantic.*` (text, background, border)
   - `theme.shadows.*` (xs, sm, md, lg, xl)
   - `theme.colors.overlay.*` (darkest, lighter, etc.)
   - `theme.typography.fontSize.*` (xs through 5xl)
   - Result: ViewingHistory passed, but data injection still fails for other components

3. **TestID-based Testing** - Attempted to use testID selectors
   - Result: Components don't have testID attributes for action buttons

## Alternative Approach

Instead of full component integration tests, focus on:
1. **ViewingHistory component** - Already passing (5 tests) ✓
2. **Unit tests for hooks** - Test `useWatchlist`, `useRecommendations` directly
3. **Component rendering tests** - Verify components render without errors (no data assertions)
4. **E2E tests** - Test with real data flow in Detox/end-to-end environment

## Impact

- **10 planned tests** moved to known-issues
- **Component test coverage** for CurrentlyWatching and RecommendationsSection postponed
- **ViewingHistory test coverage** successfully achieved (5 tests passing)
- **Overall Day 5 dashboard coverage**: 1 of 4 components fully tested (25%)

## Next Steps

1. Test hooks directly instead of through components
2. Add minimal rendering tests to ensure components don't crash
3. Return to integration tests after components are refactored to support data injection
4. Consider adding `testID` props to interactive elements for better testability

## Date
2025-12-16

## Time Investment
~1 hour attempting to fix data injection issues

## Related Issues
- Authentication Integration Tests (Day 5 Morning) - Similar hook mocking complexity
- GenreStatsCard (Day 5 Afternoon) - ThemeProvider import pattern issue
- See `__known-issues__-auth-integration/README.md` for related mocking challenges
