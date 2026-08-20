# Legacy HTTP Client Migration Checklist

## Overview
Migration from legacy axios-based clients (`apiClient.ts`, `authApiClient.ts`) to modern unified `ApiService.ts`.

**Total Files to Migrate**: 8 files
**Estimated Time**: 6-8 hours

---

## Legacy Client Files (To be deprecated)

| File | Type | Lines | Status |
|------|------|-------|--------|
| `mobile/src/services/apiClient.ts` | Axios HTTP client | 193 | ⏳ Pending deprecation |
| `mobile/src/services/authApiClient.ts` | Axios auth client | 399 | ⏳ Pending deprecation |

---

## Files Using Legacy Clients

### 1. `mobile/src/hooks/useCountriesForContent.ts` ⚠️ HIGH PRIORITY
**Reason**: Critical VPN country recommendation feature

**Current Usage**:
```typescript
import { api } from '../services/apiClient';

// Line 132-136
const apiResponse = await api.vpnGuidance.getCountriesForContent(
  contentId,
  audioLanguages,
  subtitleLanguages,
);
```

**Migration Plan**:
- Replace `api.vpnGuidance.getCountriesForContent()` with direct `ApiService.get()` call
- Build endpoint URL: `/api/vpnguidance/countries-for-content/${contentId}?audioLanguages=...&subtitleLanguages=...`
- Update imports: `import { ApiService } from '../services/api/ApiService'`
- Handle response: Extract data from `ApiResponse<CountriesForContentResponse>` format

**Estimated Time**: 30 minutes

---

### 2. `mobile/src/hooks/useSubscriptions.ts` ⚠️ HIGH PRIORITY
**Reason**: User streaming service subscription management

**Current Usage**:
```typescript
import { api } from '../services/apiClient';

// Line 39: api.subscriptions.getAll()
// Line 61: api.subscriptions.add(request)
// Line 86: api.subscriptions.update(serviceId, request)
// Line 110: api.subscriptions.remove(serviceId)
```

**Migration Plan**:
- Replace all `api.subscriptions.*` calls with `ApiService` methods
- Endpoints:
  - GET `/api/usersubscriptions` (getAll)
  - POST `/api/usersubscriptions` (add)
  - PUT `/api/usersubscriptions/${serviceId}` (update)
  - DELETE `/api/usersubscriptions/${serviceId}` (remove)
- Update error handling to use `ApiResponse` format
- Maintain React Query integration

**Estimated Time**: 45 minutes

---

### 3. `mobile/src/services/analytics/UserAnalyticsService.ts` 🔶 MEDIUM PRIORITY
**Reason**: Analytics can degrade gracefully, non-blocking

**Current Usage**:
```typescript
import { apiClient } from '../apiClient';

// Line 108: apiClient.post('/analytics/viewing-sessions', ...)
// Line 131: apiClient.put(`/analytics/viewing-sessions/${sessionId}`, ...)
// Line 148-151: apiClient.get('/analytics/viewing-stats/...')
// Line 160: apiClient.get('/analytics/viewer-profile/...')
// Line 170: apiClient.get('/analytics/content-insights/...')
// Line 202: apiClient.get('/analytics/personalized-insights/...')
// Line 259-262: apiClient.get('/analytics/export/...')
// Line 276: apiClient.delete('/analytics/user-data/...')
```

**Migration Plan**:
- Comprehensive service refactor to use `ApiService`
- All endpoints use `/analytics/*` prefix
- Methods: GET, POST, PUT, DELETE
- Add proper TypeScript types for all responses
- Maintain offline queue integration with AnalyticsManager
- Update error handling and logging

**Estimated Time**: 1.5 hours

---

### 4. `mobile/src/services/authService.ts` ✅ LOW PRIORITY
**Reason**: Already uses modern `ApiService` for most operations

**Current Usage**:
```typescript
import { AuthApiClient } from './authApiClient';

// Line 20: this.apiClient = new AuthApiClient();
// BUT: Most methods use ApiService directly (lines 121, 171, 229, 300, 338, 382)
```

**Migration Plan**:
- Remove `AuthApiClient` import and instantiation
- Verify all auth methods use `ApiService`
- Clean up any remaining `authApiClient` references
- **Note**: This file is already 90% migrated!

**Estimated Time**: 15 minutes

---

### 5. `mobile/src/services/promotionService.ts` 🔶 MEDIUM PRIORITY
**Reason**: Promo code feature, not core functionality

**Current Usage**:
```typescript
import apiClient from './apiClient';

// Line 27: apiClient.get(`/promotions/active?platform=${platform}`)
// Line 41-43: apiClient.get(`/promotions/validate/...`)
// Line 76: apiClient.post('/promotions/redeem', request)
// Line 103: apiClient.get('/promotions/my-redemptions')
// Line 116: apiClient.get(`/promotions/code/...`)
```

**Migration Plan**:
- Replace all `apiClient.*` calls with `ApiService` methods
- Endpoints all use `/promotions/*` prefix
- Methods: GET, POST
- Maintain platform detection logic
- Update error response handling

**Estimated Time**: 30 minutes

---

### 6. `mobile/src/services/recommendations/RecommendationService.ts` ⚠️ HIGH PRIORITY
**Reason**: Core personalization feature

**Current Usage**:
```typescript
import { apiClient } from '../apiClient';

// Line 91: apiClient.get('/recommendations', { params: {...} })
// Line 116: apiClient.get('/recommendations/trending', ...)
// Line 128: apiClient.get('/recommendations/friends/...')
// Line 138: apiClient.get('/recommendations/similar/...')
// Line 148: apiClient.get('/recommendations/because-you-watched/...')
// Line 158: apiClient.put('/users/${userId}/preferences', ...)
// Line 167: apiClient.get('/users/${userId}/preferences')
// Line 190: apiClient.post('/recommendations/feedback', ...)
// Line 210: apiClient.post('/recommendations/refresh/...')
// Line 227: apiClient.get('/recommendations/insights/...')
```

**Migration Plan**:
- Replace all `apiClient.*` calls with `ApiService` methods
- Endpoints: `/recommendations/*`, `/users/*`
- Methods: GET, POST, PUT
- Maintain AsyncStorage caching integration
- Update Recommendation type interfaces
- Preserve watchlist service integration

**Estimated Time**: 1 hour

---

### 7. `mobile/src/services/search/UnifiedSearchService.ts` ⚠️ HIGH PRIORITY
**Reason**: Core search functionality

**Current Usage**:
```typescript
import { api } from '../apiClient';

// Line 122-124: api.search.servers(query)
// Line 123: api.search.locations(query)
// Line 124: api.search.features(query)
// Line 337: api.search.suggestions(query, limit)
// Line 357: api.search.popular(limit)
```

**Migration Plan**:
- Replace all `api.search.*` calls with `ApiService` methods
- Endpoints:
  - GET `/api/search/servers?q=${query}`
  - GET `/api/search/locations?q=${query}`
  - GET `/api/search/features?q=${query}`
  - GET `/api/search/suggestions?q=${query}&limit=${limit}`
  - GET `/api/search/popular?limit=${limit}`
- Update VPN search result handling
- Maintain SearchService integration for streaming
- Preserve fallback offline search logic

**Estimated Time**: 45 minutes

---

### 8. `mobile/src/services/watchlist/WatchlistService.ts` ⚠️ HIGH PRIORITY
**Reason**: User content management, ALREADY PARTIALLY MIGRATED

**Current Usage**:
```typescript
import ApiService from '../api/ApiService';
import { apiClient } from '../apiClient';

// MODERN (lines 84-89, 114-120, 147-154, 211-218): ApiService.get/post
// LEGACY (lines 176-179, 194-195, 236-237, 254-255, 263, 278, 290, 300): apiClient.*
```

**Migration Plan**:
- **MIXED STATE**: File uses BOTH ApiService and legacy apiClient
- Migrate remaining legacy calls:
  - Line 176-179: `updateWatchlist()` - PUT request
  - Line 194-195: `deleteWatchlist()` - DELETE request
  - Line 236-237: `updateWatchlistItem()` - PUT request
  - Line 254-255: `removeFromWatchlist()` - DELETE request
  - Line 263: `getWatchlistStats()` - GET request
  - Line 278: `searchWatchlists()` - GET request
  - Line 290: `shareWatchlist()` - POST request
  - Line 300: `importWatchlist()` - POST request
- All use `/api/watchlists/*` endpoints
- **Critical**: Maintain cache-fallback pattern for offline support

**Estimated Time**: 1 hour

---

## Migration Pattern

### Before (Legacy):
```typescript
import apiClient from '../services/apiClient';

const response = await apiClient.get('/api/endpoint');
const data = response.data;
```

### After (Modern):
```typescript
import { ApiService } from '../services/api/ApiService';
const apiService = new ApiService();

const response = await apiService.get<DataType>('/api/endpoint');
if (!response.success) {
  throw new Error(response.error?.message || 'Request failed');
}
const data = response.data;
```

---

## Common Gotchas

1. **Response Format Change**:
   - Legacy: `response.data` directly contains payload
   - Modern: `response.data` wrapped in `{ success, data, error }` format

2. **Error Handling**:
   - Legacy: Try/catch with `error.response.data`
   - Modern: Check `response.success` flag, use `response.error`

3. **Auth Token**:
   - Legacy: Automatically injected via interceptor
   - Modern: Automatically injected by ApiService (same behavior)

4. **Caching**:
   - Legacy: No built-in caching
   - Modern: Optional TTL caching with `cacheTTL` parameter

5. **Offline Support**:
   - Legacy: Manual cache fallback in catch blocks
   - Modern: Built-in queue + cache fallback via `ApiService`

---

## Post-Migration Checklist

After migrating all files:

- [ ] Run `grep -rn "import.*apiClient\|import.*authApiClient" mobile/src` - should return 0 results (except legacy files)
- [ ] Move `apiClient.ts` to `mobile/legacy/services/apiClient.ts.txt`
- [ ] Move `authApiClient.ts` to `mobile/legacy/services/authApiClient.ts.txt`
- [ ] Add `@deprecated` JSDoc to legacy files before moving
- [ ] Verify all tests pass: `npm test`
- [ ] Run smoke test: `npm run smoke-test` (when created)
- [ ] Update `mobile/docs/API_INTEGRATION.md` to reflect ApiService as standard

---

## Deprecation Process

1. **After All Migrations Complete**:
   ```bash
   mkdir -p mobile/legacy/services
   ```

2. **Add Deprecation Notice**:
   ```typescript
   /**
    * @deprecated LEGACY FILE - Moved to /legacy/services/
    * This file has been replaced by ApiService.ts
    * DO NOT USE - For reference only
    */
   ```

3. **Move Files**:
   ```bash
   mv mobile/src/services/apiClient.ts mobile/legacy/services/apiClient.ts.txt
   mv mobile/src/services/authApiClient.ts mobile/legacy/services/authApiClient.ts.txt
   ```

4. **Verify Build**:
   ```bash
   npm run build
   ```

---

## Success Criteria

- ✅ Zero imports of `apiClient` or `authApiClient` in `mobile/src/`
- ✅ All HTTP requests use `ApiService`
- ✅ Consistent error handling across all API calls
- ✅ Offline support maintained via ApiService cache + queue
- ✅ All tests pass
- ✅ Production smoke test passes
- ✅ Legacy files moved to `/legacy/` and renamed to `.txt`

---

## Notes

- **Priority**: HIGH priority files should be migrated first (streaming, search, watchlist, subscriptions)
- **Testing**: Test each file migration individually before moving to next
- **Rollback**: Keep git commits granular (one file per commit) for easy rollback
- **Documentation**: Update API_INTEGRATION.md after all migrations complete
