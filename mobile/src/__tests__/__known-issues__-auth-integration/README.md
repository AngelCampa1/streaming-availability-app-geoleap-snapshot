# Known Issue: Authentication Integration Tests

## Issue Summary
Complex authentication integration tests requiring full AuthContext mocking are blocked due to Jest module resolution and dependency injection complexity.

## Files Affected
- `AuthenticationFlow.test.tsx` (10 tests planned)
- `RaceConditions.test.tsx` (8 tests planned)

## Problem Description

**Symptoms**:
- Cannot properly mock `authService` from `@/services/api/AuthService`
- TypeErrorexecution: "Cannot read properties of undefined (reading 'login')"
- Manual mocks in `__mocks__` directories not being picked up
- Inline jest.mock() declarations not properly hoisting before module imports

**Root Cause**:
AuthContext has deep dependency chain:
```
AuthContext
  ├── authService (from ../services/api/AuthService)
  ├── tokenManager (from ../services/auth/TokenManager)
  ├── _secureStorage (from ../services/storage/SecureStorage)
  ├── biometricAuth (from ../services/biometricAuth)
  └── OAuthService (from ../services/oauthService)
```

Each of these services has their own dependencies, creating a complex mocking scenario.

## Attempted Solutions

1. **Inline jest.mock()** - Mocks not properly hoisted
2. **Manual mock files in __tests__/__mocks__** - Not picked up by Jest
3. **Manual mock files adjacent to services** - Would require restructuring entire service directory
4. **Deep mock setup** - Incomplete service method coverage causes undefined errors

## Alternative Approach

Instead of full integration tests, focus on:
1. **Unit tests for individual authentication methods** in AuthService
2. **Component tests** for LoginScreen, RegisterScreen with mocked useAuth hook
3. **Hook tests** for simpler hooks that don't depend on AuthContext

## Impact

- **18 planned tests** moved to known-issues
- **Integration test coverage** for authentication flows postponed
- **Unit and component test coverage** still achievable with focused tests

## Next Steps

1. Create focused unit tests for AuthService methods directly
2. Create component tests with mocked `useAuth` hook
3. Return to integration tests after establishing better mocking infrastructure
4. Consider using dependency injection pattern for easier testing

## Date
2025-12-16

## Time Investment
~2 hours attempting to resolve mocking issues

## Related Issues
- Similar to VpnRecommendationModal ThemeProvider issue (#__known-issues__)
- Complex context/service dependencies make testing difficult
