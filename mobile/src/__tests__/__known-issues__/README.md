# Known Testing Issues

This directory contains test files that have known issues preventing them from running successfully.

## VpnRecommendationModal.test.tsx.skip

**Issue**: Component rendering fails with "Element type is invalid... but got: undefined"

**Symptoms**:
- Component imports correctly as a function
- Error occurs when React tries to render the component
- Tried multiple mock strategies (string mocks, React.createElement, different paths)
- useTheme mock tested with both hooks/useTheme and theme/ThemeProvider paths

**Potential Causes**:
1. Missing or incorrectly mocked dependency within the component
2. Circular dependency issue
3. Component may have runtime issue that only manifests in tests
4. Theme provider context may need different mock structure

**Next Steps**:
- Investigate component in running app to verify it works
- Add more detailed debug logging to identify which child element is undefined
- Try testing with actual ThemeProvider wrapper instead of mocking
- Consider simplifying component to isolate the issue

**Date**: 2025-12-16
**Time Spent**: ~90 minutes
