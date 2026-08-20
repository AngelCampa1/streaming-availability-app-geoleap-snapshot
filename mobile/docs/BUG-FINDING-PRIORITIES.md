# Bug Finding Priorities - Zero Coverage Services

**Date**: 2025-12-19
**Overall Coverage**: 9.97% (596/767 tests passing)
**Critical Finding**: 1,500 lines of untested code in 5 critical services

---

## 🎯 Prioritized Service List (by Bug Risk)

### Priority 1: RecommendationService (646 lines, 0% coverage) 🚨

**File**: `src/services/recommendations/RecommendationService.ts`
**Lines of Code**: 646 (largest untested file)
**Current Coverage**: 0%
**Business Impact**: High (core app feature - content discovery)

**Expected Bug Categories**:
- Algorithm bugs (incorrect recommendations)
- Performance bugs (slow recommendation generation)
- Cache bugs (stale recommendations shown)
- Personalization bugs (wrong user's recommendations shown)
- Data privacy bugs (recommendation data leaked across users)

**Test Strategy**:
- Remove module-level mocks from existing tests
- Add MSW handlers for recommendation API
- Test recommendation algorithm with real user data
- Test personalization logic (different users get different recommendations)
- Test cache invalidation (recommendations update after user actions)

---

### Priority 2: WatchlistService (590 lines, 1.16% coverage) 🚨

**File**: `src/services/watchlist/WatchlistService.ts`
**Lines of Code**: 590
**Current Coverage**: 1.16% (tests exist but mock everything)
**Business Impact**: High (core user feature - watchlist management)

**Current Problem**:
- File has 30+ tests that ALL pass
- Coverage is 1.16% because tests mock `apiService` at module level
- Tests verify mock behavior, not service logic

**Expected Bug Categories**:
- Duplicate items in watchlist
- Watchlist not cleared on logout (data leak between users)
- Stale cache shown to different users
- Race conditions (add + remove same item concurrently)
- Optimistic updates not rolled back on API failure

**Test Strategy**:
```typescript
// REMOVE THIS LINE from WatchlistService.test.ts:
jest.mock('../../api/ApiService'); // ❌ Causes 0% coverage

// ADD MSW instead:
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer();

// Now tests hit REAL WatchlistService code
const service = new WatchlistService(); // Not mocked!
await service.addToWatchlist('movie-123'); // Exercises real code
```

---

### Priority 3: VpnService (124 lines, 0% coverage) 🔴

**File**: `src/services/vpn/VpnService.ts`
**Lines of Code**: 124
**Current Coverage**: 0%
**Business Impact**: CRITICAL (core app functionality - VPN connection)

**Expected Bug Categories**:
- Connection state bugs (stuck in "connecting" forever)
- Disconnect bugs (VPN doesn't restore normal network)
- Security bugs (credentials leaked to logs)
- Timeout bugs (connection attempt never times out)
- Race conditions (connect + disconnect simultaneously)

**Test Strategy**:
- Test connection timeout scenarios
- Test disconnect/reconnect flows
- Test state transitions (disconnected → connecting → connected → disconnected)
- Test error handling (server unreachable, auth failed)
- Test concurrent operations (rapid connect/disconnect)

---

### Priority 4: PaymentService (78 lines, 0% coverage) 🔴

**File**: `src/services/payment/PaymentService.ts`
**Lines of Code**: 78
**Current Coverage**: 0%
**Business Impact**: CRITICAL (revenue - payment processing)

**Expected Bug Categories**:
- Duplicate charges (rapid button clicks)
- Payment retry bugs (charges user multiple times)
- Validation bugs (invalid payment method accepted)
- State bugs (payment status not updated after success)
- Race conditions (concurrent payment attempts)

**Test Strategy**:
- Test duplicate charge prevention
- Test payment retry logic (should NOT retry successful payments)
- Test validation (reject invalid card numbers, expired cards)
- Test state management (payment pending → success/failure)
- Test error handling (network failure during payment)

---

### Priority 5: ContentService (62 lines, 0% coverage) 🟡

**File**: `src/services/content/ContentService.ts`
**Lines of Code**: 62
**Current Coverage**: 0%
**Business Impact**: Medium (content discovery)

**Expected Bug Categories**:
- Cache bugs (stale content after logout)
- Pagination bugs (duplicate items across pages)
- Filter bugs (genre filters incorrectly applied)
- Search bugs (case sensitivity issues)

**Test Strategy**:
- Test content caching and invalidation
- Test pagination (no duplicates, correct page size)
- Test filters (genre, year, rating)
- Test search integration

---

## 📊 Impact Analysis

| Service | LOC | Coverage | Bug Risk | Revenue Impact | User Impact |
|---------|-----|----------|----------|----------------|-------------|
| **RecommendationService** | 646 | 0% | 🚨 HIGH | High (engagement) | High |
| **WatchlistService** | 590 | 1.16% | 🚨 HIGH | High (retention) | High |
| **VpnService** | 124 | 0% | 🔴 CRITICAL | Critical (core value) | Critical |
| **PaymentService** | 78 | 0% | 🔴 CRITICAL | Critical (revenue) | Critical |
| **ContentService** | 62 | 0% | 🟡 MEDIUM | Medium | Medium |

**Total Untested Code**: 1,500 lines across 5 services

---

## 🚀 Recommended Action Plan

### Option A: Business Impact First (Revenue Focus)

1. **PaymentService** (78 lines, 0% → 60%) - 4 hours
   - Bug: Duplicate charges on rapid clicks
   - Bug: Retry logic charges multiple times
   - Bug: Invalid payment methods accepted

2. **VpnService** (124 lines, 0% → 60%) - 6 hours
   - Bug: Connection stuck in "connecting" state
   - Bug: Credentials leaked to logs
   - Bug: Timeout logic doesn't work

3. **WatchlistService** (590 lines, 1.16% → 60%) - 12 hours
   - Bug: Duplicate items in watchlist
   - Bug: Watchlist data leak between users
   - Bug: Optimistic updates not rolled back

**Total**: 22 hours, **HIGH revenue/security impact**

### Option B: Code Volume First (Largest Files)

1. **RecommendationService** (646 lines, 0% → 60%) - 14 hours
   - Bug: Wrong recommendations shown
   - Bug: Recommendations leaked between users
   - Bug: Cache never invalidates

2. **WatchlistService** (590 lines, 1.16% → 60%) - 12 hours
   - (Same as Option A)

3. **VpnService** (124 lines, 0% → 60%) - 6 hours
   - (Same as Option A)

**Total**: 32 hours, **HIGH code coverage increase**

### Option C: Quick Wins First (Smallest Files)

1. **ContentService** (62 lines, 0% → 60%) - 3 hours
2. **PaymentService** (78 lines, 0% → 60%) - 4 hours
3. **VpnService** (124 lines, 0% → 60%) - 6 hours

**Total**: 13 hours, **FAST coverage improvement**

---

## 🎯 Next Steps

**CRITICAL DECISION POINT**: Choose which service to tackle first.

Based on user's instruction: **"don't fix stuff, focus is coverage and finding bugs"**

**Recommended**: Start with **PaymentService** (Option A - Business Impact First)

**Why?**
- Smallest file (78 lines) = faster to test
- CRITICAL revenue impact = highest priority
- High bug risk (duplicate charges) = likely to find real bugs
- Tests will likely find 3-5 critical bugs in 4 hours

**Alternative**: Start with **WatchlistService** (easier, tests already exist)

**Why?**
- Tests already exist, just need to remove mocks
- 590 lines = lots of uncovered code
- Known issues: tests pass but mock everything
- Likely to find 5-10 bugs quickly

---

**Author**: Claude Sonnet 4.5
**Generated**: 2025-12-19
**Next Action**: Await user decision on which service to prioritize
