# Phase 2 Service Tests: Fake Timer Hanging Pattern

## Summary

**Status**: 4 of 10 Phase 2 services have test suites that hang due to fake timer handling issues.

**Affected Services**:
1. **TokenManager.test.ts** (14.2% coverage) - Mock initialization fixed, tests hang
2. **ApiService.test.ts** (6.28% coverage) - Constructor fixed, retry/timeout tests hang
3. **NetworkService.test.ts** (11.61% coverage) - Tests hang on initialization delays
4. **Potentially others** - Not yet tested

**Completed Service**:
- **AnalyticsService.test.ts** (98.26% coverage) - ✅ Fully working, no timer issues

## Root Cause

### The Pattern

All affected services use:
1. `jest.useFakeTimers()` in `beforeEach()`
2. `setTimeout()` or `setInterval()` in service implementation for:
   - Retry logic with exponential backoff
   - Request timeouts with AbortController
   - Periodic monitoring/quality checks
   - Session expiration timers
3. Tests that don't properly advance fake timers or await promises

### Example from ApiService (lines 414-416, 498-502):

```typescript
// Timeout implementation
const timeoutId = setTimeout(() => {
  controller.abort();
}, timeout);

// Retry with exponential backoff
if (attempt <= retryAttempts) {
  const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  await new Promise<void>(resolve => setTimeout(resolve, delay));
}
```

### Example Test that Hangs:

```typescript
it('BUG: Retries with exponential backoff on network error', async () => {
  (global.fetch as jest.Mock)
    .mockRejectedValueOnce(new Error('Network error'))
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce({ ok: true, /* ... */ });

  const promise = apiService.get('/test', { retryAttempts: 2 });

  // ❌ PROBLEM: Timer advancement doesn't resume promise execution
  await jest.runAllTimersAsync();

  const result = await promise; // ⏱️ HANGS HERE - promise never resolves
  // ...
});
```

## Why This Happens

### Jest Fake Timers Behavior:

1. **`jest.useFakeTimers()`** replaces `setTimeout`, `setInterval`, `Date.now()`, etc.
2. **`jest.runAllTimersAsync()`** advances timers but may not trigger microtasks
3. **Promises in service code** create microtasks that depend on setTimeout
4. **Race condition**: Test awaits promise → Timer fires → Promise never resolves → Test hangs

### The Issue:

```
Test Flow:
1. Call service method → Returns promise
2. Service uses setTimeout internally
3. Test calls jest.runAllTimersAsync()
4. Timers fire but promise chain doesn't complete
5. Test awaits promise → HANGS FOREVER
```

## Attempted Fixes (All Failed)

### ❌ Approach 1: Use `jest.runAllTimersAsync()`
```typescript
await jest.runAllTimersAsync();
// Still hangs - doesn't flush promise microtasks
```

### ❌ Approach 2: Disable fake timers
```typescript
// jest.useFakeTimers(); // Commented out
// Tests run but timeout after 30+ seconds
```

### ❌ Approach 3: Advance timers incrementally
```typescript
await jest.advanceTimersByTimeAsync(1000); // First retry
await jest.advanceTimersByTimeAsync(2000); // Second retry
// Still hangs - timing doesn't align with promise resolution
```

## Impact on Coverage

| Service | Current Coverage | Target | Status | Issue |
|---------|------------------|--------|--------|-------|
| **AnalyticsService** | 98.26% | 80% | ✅ PASS | No timer issues |
| **TokenManager** | 14.2% | 80% | 🔴 HANG | Mock + timers |
| **ApiService** | 6.28% | 80% | 🔴 HANG | Retry/timeout timers |
| **NetworkService** | 11.61% | 80% | 🔴 HANG | Quality test intervals |

**Phase 2 Progress**: 7 of 10 services completed, 3 blocked by timer issues

## Proposed Solutions (Not Yet Implemented)

### Option 1: Use Real Timers with Mocked Delays

**Approach**: Mock the delay functions instead of using fake timers

```typescript
// In test setup
const mockDelay = jest.fn().mockResolvedValue(undefined);
jest.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
  mockDelay(delay).then(fn);
  return 123 as any; // Mock timeout ID
});
```

**Pros**: No timer hanging
**Cons**: Tests run slower, hard to control timing

### Option 2: Extract Timer Logic to Testable Service

**Approach**: Create `DelayService` with mockable interface

```typescript
class DelayService {
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// In tests
mockDelayService.wait.mockResolvedValue(undefined); // Instant
```

**Pros**: Clean separation, easy to mock
**Cons**: Requires refactoring all services

### Option 3: Use `jest.setSystemTime()` (Jest 29+)

**Approach**: Manipulate time directly instead of advancing timers

```typescript
const startTime = Date.now();
const promise = apiService.get('/test', { timeout: 5000 });

jest.setSystemTime(startTime + 5000); // Jump to timeout
await promise;
```

**Pros**: More control over time
**Cons**: Requires Jest 29+, complex for exponential backoff

### Option 4: Hybrid - Fake Timers ONLY for Specific Tests

**Approach**: Enable fake timers per-test, not globally

```typescript
describe('Retry Logic', () => {
  beforeEach(() => {
    // No fake timers here
  });

  it('retries with backoff', async () => {
    jest.useFakeTimers(); // Enable just for this test

    // Test implementation

    jest.useRealTimers(); // Restore immediately
  });
});
```

**Pros**: Isolated timer mocking, less chance of hangs
**Cons**: Verbose, easy to forget cleanup

## Recommended Next Steps

1. **Analyze AnalyticsService** - Why does it work?
   - Uses Date.now() mocking, not setTimeout for timers
   - No retry logic or async delays
   - Pattern: Synchronous event tracking with async backend calls

2. **Create Timer Handling Guide**
   - Document working patterns from AnalyticsService
   - Test Option 2 (DelayService) on one service
   - Compare coverage and test execution time

3. **Systematic Fix**
   - Apply working pattern to TokenManager first (smallest scope)
   - Then NetworkService (medium complexity)
   - Finally ApiService (highest complexity - retry + timeout)

4. **Update Coverage Tracking**
   - Re-run coverage after fixes
   - Document which patterns yield best results

## Files Affected

- `mobile/src/services/auth/TokenManager.test.ts` (1039 lines)
- `mobile/src/services/api/ApiService.test.ts` (1102 lines)
- `mobile/src/services/api/NetworkService.test.ts` (696+ lines)

## Related Issues

- HttpClient.test.ts has 25 interceptor-related failures (different issue)
- CacheService has known bugs but tests may pass (functional issues, not test issues)

---

**Last Updated**: 2025-12-18
**Discovered During**: Phase 2 (Services Layer) - Mobile Coverage Plan
**Blocked Coverage Target**: ~32% of Phase 2 target (3 of 10 services)
