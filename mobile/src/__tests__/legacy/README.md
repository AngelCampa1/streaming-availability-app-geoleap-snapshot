# Legacy Tests

This folder contains test files that have been moved here because they are incomplete, broken, or have unresolved dependencies.

## Files in this folder:

### AccessibilityTestSuite.test.txt (34 tests)
- **Status**: Incomplete - Missing all imports
- **Issue**: Test file was created without import statements for:
  - `render` from `@testing-library/react-native`
  - `Button`, `Input`, `ResultCard`, `SearchBar` components
  - `AccessibilityInfo` from `react-native`
- **To fix**: Add all necessary imports and component dependencies
- **Original location**: `src/__tests__/accessibility/AccessibilityTestSuite.test.tsx`

### SearchBar.enhanced.test.txt (29 tests)
- **Status**: Incomplete - Missing all imports
- **Issue**: Test file expects advanced SearchBar features that don't exist in the actual component:
  - Autocomplete functionality
  - Voice search integration
  - Barcode scanner integration
  - Search history management
  - Theme provider integration
- **To fix**: Either:
  1. Implement missing features in SearchBar component, OR
  2. Rewrite tests to match current simple SearchBar interface
- **Original location**: `src/__tests__/components/SearchBar.enhanced.test.tsx`

## Total skipped tests: 63

These tests were previously marked with `describe.skip()` and have been moved here to:
1. Remove them from the active test suite count
2. Preserve them for future reference
3. Document what needs to be done to make them work

## To re-enable these tests:

1. Rename `.txt` back to `.test.tsx`
2. Add all necessary imports
3. Fix component dependencies or implement missing features
4. Move back to original location
5. Run tests to verify they pass
