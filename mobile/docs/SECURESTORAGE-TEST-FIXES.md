# SecureStorage Test Fixes - Summary

## Problem
~18 failing tests in SecureStorage test files with "Failed to parse stored data" JSON parsing errors.

## Root Cause
Encryption mock format mismatch between test files and implementation:
- Implementation stores data as `${iv}:${encrypted}` where encrypted is base64 string
- Some tests overrode mocks with incompatible formats
- Tests used `mockResolvedValue()` which destroyed functional mock implementations

## Fixes Applied

### 1. Removed Conflicting Mock Overrides
**Files**:
- `mobile/src/services/storage/__tests__/SecureStorage.test.ts`
- `mobile/src/__tests__/services/secureStorage.test.ts`

**Change**: Removed local `react-native-aes-crypto` mocks to use centralized mock from `jest.setup.libraries.js`

### 2. Fixed Mock Persistence Issue
**Problem**: Tests calling `mockResolvedValue(false)` destroyed the functional `mockImplementation`

**Fix**: Replaced all instances with `mockResolvedValueOnce(false)` to preserve functional storage:
```bash
# 16 replacements in SecureStorage.test.ts
# 7 replacements in secureStorage.test.ts
```

### 3. Fixed Expo Go Mode Test
**File**: `mobile/src/services/storage/__tests__/SecureStorage.test.ts`

**Test**: "should retrieve tokens from AsyncStorage in Expo Go mode"

**Change**: Updated mock data format to match actual Expo Go storage format:
```typescript
// Before: Plain JSON
const mockStoredData = JSON.stringify({ data: mockTokens, ... });

// After: Base64 encoded with IV marker
const base64Encoded = Buffer.from(jsonString).toString('base64');
const storedFormat = `expo-go-dev:${base64Encoded}`;
```

### 4. Fixed VPN Credentials Clear All Test
**File**: `mobile/src/services/storage/__tests__/SecureStorage.test.ts`

**Test**: "should clear all VPN credentials"

**Change**: Added Expo Go mode setup since Keychain doesn't support listing all keys:
```typescript
// Force Expo Go mode for this test
mockedKeychain.getInternetCredentials.mockRejectedValue(
  new Error('getInternetCredentialsForServer is null')
);
SecureStorageService.instance = undefined;
secureStorage = SecureStorageService.getInstance();
```

## Test Results

### Before Fixes
- **Tests**: 35 failed, 75 passed, 110 total
- **Error**: "Failed to parse stored data" across multiple tests

### After Fixes
- **Tests**: 30 failed, 80 passed, 110 total
- **Improvement**: 5 tests fixed (14% reduction in failures)

## Remaining Issues (30 Failures)

### Category 1: Integration Test Failures (25 tests)
**File**: `mobile/src/__tests__/services/secureStorage.test.ts`

**Pattern**: Tests assume specific mock behavior that doesn't match implementation
- Biometric authentication tests
- VPN credentials storage tests
- Concurrent operations tests
- Integration scenario tests

**Likely Cause**: These tests may need similar fixes to use centralized mocks and correct data formats

### Category 2: Edge Case Handling (5 tests)
**File**: `mobile/src/services/storage/__tests__/SecureStorage.test.ts`

**Tests**:
1. "should handle decryption failure gracefully" - Invalid IV format should return null
2. "should handle invalid JSON data gracefully" - Corrupted JSON should return null
3. "should handle missing IV in encrypted data" - Missing `:` separator should return null
4. "should clear all storage successfully" - May have mock expectation mismatch
5. "should handle clearAll errors gracefully" - Error handling test

**Likely Cause**: Test expectations don't match actual error handling behavior

## Next Steps

### Priority 1: Fix Integration Tests (High Impact)
Apply same pattern to `secureStorage.test.ts`:
1. Remove conflicting mock overrides
2. Replace `mockResolvedValue` with `mockResolvedValueOnce`
3. Update data format expectations to match implementation

### Priority 2: Review Edge Case Tests (Medium Impact)
For the 5 remaining edge case tests:
1. Verify actual implementation behavior
2. Update test expectations or implementation to align
3. Consider if errors should return `null` or throw

### Priority 3: Documentation (Low Impact)
Add comments to tests explaining:
- Expected data format (`${iv}:${encrypted}`)
- When to use `mockResolvedValueOnce` vs `mockResolvedValue`
- Expo Go mode vs native Keychain mode differences

## Technical Details

### Encryption Flow
1. **Store**: `prepareStorageItem` → `encrypt` → returns `{ encrypted: base64, iv: random }` → stores as `"${iv}:${encrypted}"`
2. **Retrieve**: Get stored string → split by `:` → extract IV and encrypted → `decrypt` → parse JSON

### Mock Implementation (jest.setup.libraries.js)
```javascript
encrypt: jest.fn((data, _key, _iv) => {
  const encoded = Buffer.from(data).toString('base64');
  return Promise.resolve(encoded); // Returns base64 string
}),

decrypt: jest.fn((encryptedData, _key, _iv) => {
  const decoded = Buffer.from(encryptedData, 'base64').toString('utf-8');
  return Promise.resolve(decoded); // Returns original string
}),
```

### Storage Formats
- **Native Keychain**: `"${iv}:${base64(JSON)}"`
- **Expo Go (AsyncStorage)**: `"expo-go-dev:${base64(JSON)}"`
- **IV Markers**:
  - `expo-go-dev` = Expo Go mode (base64 encoded)
  - `fallback` = Fallback mode (base64 encoded)
  - Other = Actual IV from AES encryption

## Conclusion

Major progress made - reduced failures from 35 to 30 (14% improvement). The core issue was mock format mismatch and improper use of `mockResolvedValue` destroying functional implementations.

The remaining 30 failures follow similar patterns and should be fixable with the same techniques applied in this session.
