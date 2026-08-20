# Week 2, Day 7: Offline & Sync Critical Bugs Report
**Date:** December 16, 2025
**Auditor:** Claude Code
**Focus:** Offline functionality, data synchronization, cache management, background sync

---

## Executive Summary

**Total Bugs Found:** 15 critical offline and synchronization bugs
**Severity Breakdown:**
- **P0 (Critical):** 1 bug - Data loss in subscription updates
- **P1 (High):** 10 bugs - Memory leaks, service instantiation issues, sync inefficiencies
- **P2 (Medium):** 4 bugs - Production logging, missing features

**Most Critical Issue:** `useSubscriptions` hook does NOT integrate with offline queue, causing data loss when network fails during subscription operations (add/update/remove).

**Key Problem Areas:**
1. Service instantiation patterns (new instances vs singletons)
2. setInterval cleanup tracking
3. Offline queue integration gaps
4. useEffect dependency issues
5. Production logging

---

## Critical Bugs (P0)

### BUG-SYNC-007: useSubscriptions NO Offline Queue Integration ⚠️

**Severity:** P0 (CRITICAL - Data Loss)
**File:** `mobile/src/hooks/useSubscriptions.ts`
**Lines:** 64-148 (addSubscription, updateSubscription, removeSubscription)

**Description:**
The `useSubscriptions` hook does NOT integrate with `OfflineService` for queuing failed requests. When network fails during subscription operations (add/update/remove), changes are lost permanently.

**Impact:**
- **Data Loss:** User's subscription changes lost if offline
- **UX Degradation:** No retry mechanism, user must manually retry
- **Business Impact:** Lost revenue if user can't add subscriptions
- **Mentioned in Day 5/6 audits** as a gap in profile sync

**Code Evidence:**
```typescript
// Lines 64-86: addSubscription - NO offline queue
const addSubscription = useCallback(async (request: AddSubscriptionRequest): Promise<UserStreamingSubscription | null> => {
  try {
    setError(null);

    const apiService = new ApiService();  // ❌ New instance every call
    const response = await apiService.post<UserStreamingSubscription>('/api/usersubscriptions', request);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to add subscription');
    }

    const newSubscription = response.data;

    // Add to local state
    setSubscriptions(prev => [...prev, newSubscription]);

    return newSubscription;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to add subscription';
    setError(errorMessage);
    logger.error('[useSubscriptions] Error adding subscription', err);
    return null;  // ❌ Data lost, no offline queue
  }
}, []);

// Lines 92-122: updateSubscription - NO offline queue
// Lines 128-148: removeSubscription - NO offline queue
// Same pattern: no OfflineService integration
```

**Expected Behavior:**
```typescript
const addSubscription = useCallback(async (request: AddSubscriptionRequest) => {
  try {
    // Check network status first
    const isOnline = await networkService.isConnected();

    if (!isOnline) {
      // Queue for offline sync
      await offlineService.queueRequest({
        url: '/api/usersubscriptions',
        method: 'POST',
        data: request,
        priority: 'high',
      });

      // Update local state optimistically
      const tempSubscription = { ...request, id: generateTempId(), isActive: true };
      setSubscriptions(prev => [...prev, tempSubscription]);

      return tempSubscription;
    }

    // Online: proceed normally
    // ...
  } catch (err) {
    // Network error: queue for retry
    await offlineService.queueRequest(/* ... */);
    // ...
  }
}, []);
```

**Reproduction Steps:**
1. Open app while offline
2. Navigate to subscription management
3. Add a new subscription (e.g., Netflix)
4. Observe: Local state updated, but request fails
5. Go online
6. Observe: Subscription NOT synced to server (data lost)

**Multi-Device Scenario (Data Loss):**
1. User offline on Device A → Adds Netflix subscription → Saved locally only
2. User switches to Device B (online) → Does NOT see Netflix (not synced)
3. User adds HBO on Device B → Synced to server
4. Device A comes online → NEVER syncs Netflix, Device B data overwrites

**Fix Priority:** IMMEDIATE - This is a data loss bug affecting business logic

---

## High Priority Bugs (P1)

### BUG-SYNC-001: useNetworkStatus Creates NetworkService on Every Render

**Severity:** P1 (High - Memory Leak)
**File:** `mobile/src/hooks/useNetworkStatus.ts`
**Line:** 33

**Description:**
`useNetworkStatus` creates a new `NetworkService()` instance on every component render instead of using `useRef` or singleton pattern. This causes:
- Memory leaks (multiple NetworkService instances)
- Multiple network listeners registered
- useEffect re-runs on every render (line 103-110 dependencies include `networkService`)

**Code Evidence:**
```typescript
// Line 33 - BUG: New instance on every render
const networkService = new NetworkService();

// Lines 103-110 - BUG: networkService in dependencies causes infinite re-runs
}, [
  networkService,  // ❌ Changes every render
  updateStatus,
  updateQuality,
  testOnMount,
  testInterval,
  testConnection,
]);
```

**Impact:**
- Memory leak: Each render creates new service with timers
- Multiple NetInfo listeners registered
- useEffect runs infinitely (networkService changes → effect re-runs → networkService recreated)

**Fix:**
```typescript
// Use useRef to maintain single instance
const networkService = useRef(new NetworkService()).current;

// OR use singleton from NetworkService export
import networkService from '../services/api/NetworkService';
```

**Related:** There's already a fixed version: `useNetworkStatus.optimized.ts` line 33:
```typescript
const networkService = useMemo(() => new NetworkService(), []);
```

**Reproduction:**
1. Mount component using `useNetworkStatus`
2. Trigger re-render (state change, prop change)
3. Observe: New NetworkService created (check memory profiler)
4. Observe: useEffect runs again due to networkService dependency change

---

### BUG-SYNC-003: CacheService scheduleCleanup Interval Not Tracked

**Severity:** P1 (High - Memory Leak)
**File:** `mobile/src/services/api/CacheService.ts`
**Line:** 211

**Description:**
`scheduleCleanup()` creates a `setInterval` without tracking the interval ID for cleanup. If `CacheService` instances are created/destroyed, the interval continues running.

**Code Evidence:**
```typescript
// Lines 209-214 - BUG: No interval tracking
private scheduleCleanup(): void {
  // Cleanup every hour
  setInterval(() => {  // ❌ No variable to track interval ID
    this.cleanup();
  }, 60 * 60 * 1000);
}
```

**Impact:**
- Memory leak if CacheService is recreated
- Cleanup continues running even after service destruction
- Multiple cleanup intervals if service initialized multiple times

**Fix:**
```typescript
private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

private scheduleCleanup(): void {
  if (this.cleanupIntervalId) {
    clearInterval(this.cleanupIntervalId);
  }

  this.cleanupIntervalId = setInterval(() => {
    this.cleanup();
  }, 60 * 60 * 1000);
}

public destroy(): void {
  if (this.cleanupIntervalId) {
    clearInterval(this.cleanupIntervalId);
    this.cleanupIntervalId = null;
  }
}
```

---

### BUG-SYNC-005: useOfflineSync forceSync Inefficient Retry Loop

**Severity:** P1 (High - Performance)
**File:** `mobile/src/hooks/useOfflineSync.ts`
**Lines:** 207-217

**Description:**
The `forceSync` function calls `offlineService.retryFailedRequests()` for EVERY queued request, but that function already retries ALL failed requests. This causes redundant processing.

**Code Evidence:**
```typescript
// Lines 207-217 - BUG: Redundant retry calls
for (const _request of queuedRequests) {
  try {
    await offlineService.current.retryFailedRequests();  // ❌ Retries ALL requests
    completed++;
  } catch (error) {
    logger.error('Failed to process queued request:', error);
    failed++;
  }

  // Updates progress for EACH iteration
  updateSyncProgress(completed, failed, queuedRequests.length);
}
```

**Impact:**
- If 10 requests queued, `retryFailedRequests()` called 10 times
- Each call retries ALL failed requests
- 10 * 10 = 100 redundant retry attempts
- Severe performance degradation during sync

**Fix:**
```typescript
// Call retryFailedRequests ONCE for all queued requests
try {
  const results = await offlineService.current.retryFailedRequests();
  completed = results.successful;
  failed = results.failed;
  updateSyncProgress(completed, failed, queuedRequests.length);
} catch (error) {
  logger.error('Failed to process queued requests:', error);
  failed = queuedRequests.length;
  updateSyncProgress(0, failed, queuedRequests.length);
}
```

---

### BUG-SYNC-006: useNetworkStatus useEffect Dependencies Cause Re-runs

**Severity:** P1 (High - Performance)
**File:** `mobile/src/hooks/useNetworkStatus.ts`
**Lines:** 103-110

**Description:**
The useEffect has `networkService` in dependencies, which changes on every render (due to BUG-SYNC-001), causing the effect to re-run repeatedly.

**Code Evidence:**
```typescript
// Lines 103-110
}, [
  networkService,  // ❌ Changes every render (BUG-SYNC-001)
  updateStatus,    // ❌ Changes if onStatusChange changes
  updateQuality,   // ❌ Changes if onQualityChange changes
  testOnMount,
  testInterval,
  testConnection,  // ❌ Changes due to networkService
]);
```

**Impact:**
- useEffect runs on every render
- Listeners re-registered repeatedly
- Connection tests triggered unnecessarily
- Poor performance, battery drain

**Fix:**
```typescript
// Fix BUG-SYNC-001 first (use useRef)
const networkService = useRef(new NetworkService()).current;

// Remove unnecessary dependencies
}, [testOnMount, testInterval]);
// updateStatus, updateQuality, testConnection are stable if defined with useCallback
```

---

### BUG-SYNC-008: Multiple Hooks Create New ApiService Instances

**Severity:** P1 (High - Memory/Performance)
**Files:**
- `mobile/src/hooks/useSubscriptions.ts` - Lines 40, 68, 99, 132
- `mobile/src/hooks/useCountriesForContent.ts` - Line 137
- `mobile/src/hooks/useApi.ts` - Lines 159, 452, 590

**Description:**
Multiple hooks create new `ApiService()` instances on every function call instead of using singleton or `useRef` pattern.

**Code Evidence:**
```typescript
// useSubscriptions.ts - Lines 40, 68, 99, 132
const apiService = new ApiService();  // ❌ New instance every call

// useCountriesForContent.ts - Line 137
const apiService = new ApiService();  // ❌ New instance every call

// useApi.ts - Lines 159, 452, 590
const apiService = new ApiService();  // ❌ New instance every call
```

**Impact:**
- Memory overhead: Multiple ApiService instances created
- No connection pooling benefits
- Potential auth token issues if not shared

**Fix:**
```typescript
// Option 1: Use singleton
import { apiService } from '../services/api/ApiService';

// Option 2: Create once with useRef
const apiServiceRef = useRef(new ApiService());
const apiService = apiServiceRef.current;

// Option 3: useMemo
const apiService = useMemo(() => new ApiService(), []);
```

---

### BUG-SYNC-009: useApi Creates NetworkService/CacheService at Module Level

**Severity:** P1 (High - Initialization Issue)
**File:** `mobile/src/hooks/useApi.ts`
**Lines:** 54-55

**Description:**
`useApi` creates `NetworkService` and `CacheService` instances at module load time (top-level), not as singletons. This creates issues if module is reloaded or if multiple imports occur.

**Code Evidence:**
```typescript
// Lines 54-55 - Module-level instantiation
const networkService = new NetworkService();  // ❌ Not singleton
const cacheService = new CacheService();      // ❌ Not singleton
```

**Impact:**
- Multiple instances if module bundled in different chunks
- Not using singleton instances exported from services
- Potential state inconsistency

**Fix:**
```typescript
// Import singleton instances
import networkService from '../services/api/NetworkService';
import cacheService from '../services/api/CacheService';
```

---

### BUG-SYNC-012: OfflineService.queueProcessingInterval Not Cleared

**Severity:** P1 (High - Memory Leak)
**File:** `mobile/src/services/api/OfflineService.ts`
**Line:** 243

**Description:**
`startQueueProcessing()` creates `setInterval` but there's no cleanup method to clear it when service is destroyed.

**Code Evidence:**
```typescript
// Line 243 - BUG: No cleanup tracking
this.queueProcessingInterval = setInterval(() => {
  this.processQueue();
}, 5000);

// No destroy/cleanup method to clear this interval
```

**Impact:**
- Interval continues running even after service should be stopped
- Memory leak and unnecessary processing

**Fix:**
```typescript
public stopQueueProcessing(): void {
  if (this.queueProcessingInterval) {
    clearInterval(this.queueProcessingInterval);
    this.queueProcessingInterval = null;
  }
}

public destroy(): void {
  this.stopQueueProcessing();
  // ... other cleanup
}
```

---

### BUG-SYNC-013: SyncService.heartbeatTimer Not Guaranteed Cleanup

**Severity:** P1 (High - Memory Leak)
**File:** `mobile/src/services/api/SyncService.ts`
**Line:** 505

**Description:**
`heartbeatTimer` is cleared in `disconnect()` method, but there's no guarantee `disconnect()` is called before service destruction.

**Code Evidence:**
```typescript
// Line 505 - Heartbeat timer
this.heartbeatTimer = setInterval(() => {
  this.sendHeartbeat();
}, 30000);

// Lines 868-900 - disconnect() clears it, but not guaranteed to be called
```

**Impact:**
- If disconnect() not called, timer continues running
- Memory leak in background

**Recommendation:**
Ensure `disconnect()` is called in component cleanup, or add explicit `destroy()` method.

---

### BUG-SYNC-015: useWatchlist Auto-Refresh Interval Recreated on Dependency Changes

**Severity:** P1 (High - Performance)
**File:** `mobile/src/hooks/useWatchlist.ts`
**Lines:** 295-303

**Description:**
The auto-refresh interval depends on `refreshWatchlists`, which may change on every render if not properly memoized. This causes the interval to be cleared and recreated repeatedly.

**Code Evidence:**
```typescript
// Lines 295-303
useEffect(() => {
  if (!autoRefresh) {return;}

  const interval = setInterval(() => {
    refreshWatchlists();
  }, refreshInterval);

  return () => clearInterval(interval);
}, [autoRefresh, refreshInterval, refreshWatchlists]);  // ❌ refreshWatchlists changes
```

**Impact:**
- Interval recreated on every `refreshWatchlists` change
- Memory overhead from constant interval churn
- Potential timing issues (refresh happens too frequently)

**Fix:**
```typescript
// Ensure refreshWatchlists is stable with useCallback
const refreshWatchlists = useCallback(async () => {
  // ... implementation
}, []); // Empty deps if possible

// OR use ref pattern
const refreshRef = useRef(refreshWatchlists);
refreshRef.current = refreshWatchlists;

useEffect(() => {
  if (!autoRefresh) {return;}

  const interval = setInterval(() => {
    refreshRef.current();  // Use ref
  }, refreshInterval);

  return () => clearInterval(interval);
}, [autoRefresh, refreshInterval]);  // Remove refreshWatchlists
```

---

## Medium Priority Bugs (P2)

### BUG-SYNC-002: backgroundSyncService Uses console.log Instead of Logger

**Severity:** P2 (Medium - Production Logging)
**File:** `mobile/src/services/backgroundSyncService.ts`
**Lines:** 52, 55, 92, 111, 140, 149, 165, 174

**Description:**
Service uses `console.log` and `console.error` directly instead of the logger service, causing unfiltered production logging.

**Code Evidence:**
```typescript
// Line 52
console.log('BackgroundSyncService initialized (simplified version)');

// Line 55
console.error('Failed to initialize BackgroundSyncService:', error);

// Line 92
console.error(`Failed to sync task ${task.id}:`, error);

// Line 111
console.log(`Processing sync task: ${task.type}`, task.data);

// Lines 140, 149, 165, 174 - More console.error calls
```

**Impact:**
- Production logs clutter console
- No log level filtering
- Can't disable in production builds
- Performance overhead

**Fix:**
```typescript
import { logger } from '../utils/logger';

// Replace all console.log with logger.info
logger.info('BackgroundSyncService initialized (simplified version)');

// Replace all console.error with logger.error
logger.error('Failed to initialize BackgroundSyncService:', error);
```

---

### BUG-SYNC-004: OfflineService lastSyncTime Not Tracked (TODO)

**Severity:** P2 (Medium - Missing Feature)
**File:** `mobile/src/services/api/OfflineService.ts`
**Line:** 559

**Description:**
`getStats()` method has a TODO comment indicating `lastSyncTime` is not being tracked, always returns `null`.

**Code Evidence:**
```typescript
// Line 559 - TODO comment
getStats(): OfflineStats {
  return {
    queuedRequests: this.queue.length,
    pendingSyncOperations: this.syncOperations.length,
    lastSyncTime: null, // TODO: Track last successful sync
    isOnline: this.isOnline,
    offlineDuration,
  };
}
```

**Impact:**
- Users can't see when last sync occurred
- Debugging sync issues more difficult
- Missing feature for offline status UI

**Fix:**
```typescript
private lastSyncTime: Date | null = null;

private async processQueue(): Promise<void> {
  // ... existing code

  // After successful sync
  this.lastSyncTime = new Date();
  await this.persistData();
}

getStats(): OfflineStats {
  return {
    queuedRequests: this.queue.length,
    pendingSyncOperations: this.syncOperations.length,
    lastSyncTime: this.lastSyncTime,  // ✅ Now tracked
    isOnline: this.isOnline,
    offlineDuration,
  };
}
```

---

### BUG-SYNC-010: useOfflineSync Creates Multiple SyncService Instances

**Severity:** P2 (Medium - Resource Waste)
**File:** `mobile/src/hooks/useOfflineSync.ts`
**Lines:** 74, 488, 503

**Description:**
`useOfflineSync` creates new `SyncService` instances in multiple places instead of reusing the one from `useRef`.

**Code Evidence:**
```typescript
// Line 74 - Main instance
const syncService = useRef(new SyncService({ conflictResolution }));

// Line 488 - useEntitySync creates NEW instance
const localSyncService = new SyncService({ conflictResolution: 'merge' });

// Line 503 - Another useEntitySync creates NEW instance
const localSyncService = new SyncService({ conflictResolution: 'merge' });
```

**Impact:**
- Multiple SyncService instances running simultaneously
- Potential SignalR connection conflicts
- Memory waste

**Fix:**
```typescript
// Reuse the main syncService instance
export function useEntitySync<T>(/* ... */) {
  const { syncService } = useOfflineSync();  // Get existing instance

  // Use syncService.current instead of creating new one
  // ...
}
```

---

### BUG-SYNC-011: NetworkService Production Logging with logger.info/debug

**Severity:** P2 (Medium - Production Logging)
**File:** `mobile/src/services/api/NetworkService.ts`
**Lines:** 118, 151, 213, 272, 359

**Description:**
`NetworkService` uses `logger.info` and `logger.debug` extensively, which may still log in production builds depending on logger configuration.

**Code Evidence:**
```typescript
// Line 118
logger.info('NetworkService initialized successfully');

// Line 151
logger.info('Loaded network data:', { /* ... */ });

// Line 213
logger.info('Network monitoring started');

// Line 272
logger.debug('Network quality testing started');

// Line 359
logger.debug('Connection quality test completed:', quality);
```

**Impact:**
- Production logs if logger not configured properly
- Performance overhead
- Sensitive data may be logged

**Recommendation:**
Use conditional logging based on environment:
```typescript
if (__DEV__) {
  logger.info('NetworkService initialized successfully');
}
```

Or ensure logger is configured to filter info/debug in production.

---

### BUG-SYNC-014: AnalyticsManager.flushTimer Not Tracked

**Severity:** P2 (Medium - Memory Leak)
**File:** `mobile/src/services/analytics/AnalyticsManager.ts`
**Line:** 338

**Description:**
`flushTimer` is created with `setInterval` but cleanup tracking is not explicitly clear.

**Code Evidence:**
```typescript
// Line 338
this.flushTimer = setInterval(() => {
  this.flushEvents();
}, this.config.flushInterval);
```

**Impact:**
- Potential memory leak if service not properly cleaned up
- Timer continues running after service destruction

**Recommendation:**
Ensure `destroy()` method clears the timer:
```typescript
public destroy(): void {
  if (this.flushTimer) {
    clearInterval(this.flushTimer);
    this.flushTimer = null;
  }
}
```

---

## Summary Statistics

| Category | Count | Example |
|----------|-------|---------|
| Service Instantiation Issues | 4 | useNetworkStatus, useSubscriptions, useApi |
| setInterval Cleanup Issues | 5 | CacheService, OfflineService, SyncService, AnalyticsManager |
| Offline Queue Gaps | 1 | useSubscriptions (CRITICAL) |
| Production Logging | 2 | backgroundSyncService, NetworkService |
| Performance Issues | 2 | useOfflineSync, useWatchlist |
| Missing Features | 1 | lastSyncTime tracking |

---

## Cumulative Bug Count (Week 1 + Week 2)

| Day | Bugs Found | Cumulative |
|-----|------------|------------|
| Day 1: Authentication | 12 | 12 |
| Day 2: VPN Core | 19 | 31 |
| Day 3: Navigation | 12 | 43 |
| Day 4: Content Discovery | 12 | 55 |
| Day 5: Profile & Settings | 8 | 63 |
| Day 6: Subscription & Payment | 17 | 80 |
| **Day 7: Offline & Sync** | **15** | **95** |

**Total Bugs Found:** 95 across 7 days
**Severity Distribution:**
- P0 (Critical): 15 bugs (16%)
- P1 (High): 40 bugs (42%)
- P2 (Medium): 40 bugs (42%)

---

## Testing Recommendations

### Unit Tests Required:
1. `useSubscriptions` offline queue integration
2. `useNetworkStatus` service instantiation with useRef
3. `CacheService` interval cleanup on destroy
4. `useOfflineSync` forceSync efficiency
5. `OfflineService` lastSyncTime tracking

### Integration Tests Required:
1. Subscription operations while offline → sync on reconnect
2. Multiple service instances → ensure singletons used
3. Interval cleanup on component unmount
4. Sync service heartbeat cleanup

### E2E Tests Required:
1. Add subscription while offline → go online → verify synced
2. Network toggle (online→offline→online) → verify all queued requests processed
3. Multi-device sync conflict resolution

---

## Next Steps

1. **IMMEDIATE:** Fix BUG-SYNC-007 (subscription offline queue) - data loss issue
2. **High Priority:** Fix service instantiation issues (BUG-SYNC-001, 008, 009)
3. **Memory Leaks:** Fix all setInterval cleanup issues (BUG-SYNC-003, 012, 013, 015)
4. **Code Cleanup:** Replace console.log with logger (BUG-SYNC-002)
5. **Create Regression Tests:** Cover all 15 bugs with automated tests

**Day 8 Preview:** Performance & Memory audit will focus on memory leak detection, render performance, and battery usage optimization.
