# StreamVPN Mobile App - Bug Report

**Date:** December 15, 2025
**Platform Tested:** Web (Expo Web on localhost:3070)
**Backend:** GeoLeap.Api on localhost:8020
**Tester:** Automated Testing via Playwright

---

## Executive Summary

Critical testing of the StreamVPN mobile application revealed **24 bugs** across multiple severity levels. The most critical issues involve authentication bypass, broken logout functionality, and API configuration errors that prevent the app from functioning properly in development mode.

### Bug Summary by Severity

| Severity | Count | Categories |
|----------|-------|------------|
| **CRITICAL** | 5 | Authentication, Security |
| **HIGH** | 10 | API, Navigation, Rendering |
| **MEDIUM** | 6 | UI/UX, Functionality |
| **LOW** | 3 | Warnings, Best Practices |

---

## CRITICAL Bugs (P0)

### BUG-001: No Authentication Required - App Accessible Without Login
**Severity:** CRITICAL
**Category:** Authentication/Security
**Status:** Open

**Description:**
The app loads directly to the main interface (Search screen) without requiring user authentication. Users can access all features including Profile, Library, and Browse without logging in.

**Steps to Reproduce:**
1. Navigate to http://localhost:3070
2. App loads directly to Search screen
3. Click on Profile tab
4. Full profile with user data is displayed

**Expected Behavior:**
App should redirect to Login screen for unauthenticated users.

**Actual Behavior:**
App shows mock user profile "John Doe" (john.doe@example.com) without any authentication.

**Impact:**
CRITICAL security vulnerability - any user can access the app without credentials.

**Files Affected:**
- `mobile/src/App.tsx`
- `mobile/src/navigation/`
- `mobile/src/contexts/AuthContext.tsx`

---

### BUG-002: Logout Button Does Not Work
**Severity:** CRITICAL
**Category:** Authentication
**Status:** Open

**Description:**
Clicking the Logout button on the Profile screen has no effect. The user remains on the same screen with the same data displayed.

**Steps to Reproduce:**
1. Navigate to Profile tab
2. Click "Logout" button
3. Nothing happens - page remains unchanged

**Expected Behavior:**
User should be logged out and redirected to Login screen.

**Actual Behavior:**
Button click registers (button shows "active" state) but no logout action occurs.

**Console Errors:**
```
Access to fetch at 'https://api.geoleap.com/health' from origin 'http://localhost:3070' has been blocked by CORS
```

**Impact:**
Users cannot log out of the application.

---

### BUG-003: API Base URL Points to Production Instead of Local Development Server
**Severity:** CRITICAL
**Category:** Configuration/API
**Status:** Open

**Description:**
The mobile app is configured to call production API endpoints (`https://api.geoleap.app` and `https://api.geoleap.com`) instead of the local development server (`http://localhost:8020`).

**Evidence:**
```
Access to fetch at 'https://api.geoleap.app/api/users/watchlist' from origin 'http://localhost:3070' has been blocked by CORS
Access to XMLHttpRequest at 'https://api.geoleap.app/api/recommendations' from origin 'http://localhost:3070' has been blocked by CORS
```

**Expected Behavior:**
Development builds should use `http://localhost:8020` as the API base URL.

**Actual Behavior:**
App calls production endpoints causing CORS errors and failed requests.

**Impact:**
App cannot communicate with backend in development mode.

**Files Affected:**
- `mobile/src/services/api.ts`
- `mobile/app.json` or environment configuration

---

### BUG-004: Token Retrieval Fails - Cannot Read Properties of Undefined
**Severity:** CRITICAL
**Category:** Authentication
**Status:** Open

**Description:**
Token retrieval consistently fails with TypeError, preventing authentication flow from working.

**Console Error:**
```
Failed to retrieve tokens: TypeError: Cannot read properties of undefined (reading 'getInter...')
```

**Impact:**
Authentication tokens cannot be retrieved, breaking all authenticated API calls.

**Files Affected:**
- `mobile/src/services/TokenService.ts`
- `mobile/src/services/AuthService.ts`

---

### BUG-005: Duplicate /api/api/ Path in API URLs
**Severity:** CRITICAL
**Category:** API Configuration
**Status:** Open

**Description:**
API calls contain duplicate `/api/` segments in the URL path.

**Evidence:**
```
https://api.geoleap.app/api/api/users/current-user/watchlist-stats
```

**Expected:**
```
https://api.geoleap.app/api/users/current-user/watchlist-stats
```

**Impact:**
All API calls with this pattern will return 404 errors.

**Files Affected:**
- `mobile/src/services/api.ts`

---

## HIGH Severity Bugs (P1)

### BUG-006: Screen Overlay/Z-Index Bug - Multiple Screens Visible Simultaneously
**Severity:** HIGH
**Category:** Navigation/Rendering
**Status:** Open

**Description:**
When navigating between tabs, previous screen content remains visible underneath the current screen. Search, Browse, and Profile screens all render on top of each other.

**Steps to Reproduce:**
1. Start on Search tab
2. Click Browse tab - Browse content shows but Search bar still visible above
3. Click Profile tab - Profile shows but Browse content visible underneath
4. All three screens are now stacked and visible

**Expected Behavior:**
Only the active tab's screen should be visible.

**Actual Behavior:**
Multiple screens render simultaneously, creating a confusing layered UI.

**Impact:**
Poor user experience, confusing navigation, potential performance issues.

**Files Affected:**
- `mobile/src/navigation/MainTabs.tsx`
- Screen component styles

---

### BUG-007: Content Cards Do Not Navigate to Detail View
**Severity:** HIGH
**Category:** Navigation
**Status:** Open

**Description:**
Clicking on content cards (movies/shows) in Browse or Library does not navigate to the detail view.

**Steps to Reproduce:**
1. Go to Browse tab
2. Click on any "Trending Title" card
3. Console shows "Content pressed: Trending Title 1" but no navigation occurs

**Expected Behavior:**
Should navigate to content detail screen.

**Actual Behavior:**
Click registers but no navigation happens.

**Files Affected:**
- `mobile/src/components/content/ContentCard.tsx`
- `mobile/src/navigation/`

---

### BUG-008: CORS Errors Block All API Requests
**Severity:** HIGH
**Category:** API/Security
**Status:** Open

**Description:**
All API requests are blocked by CORS policy when running in development.

**Console Errors:**
```
Access to fetch at 'https://api.geoleap.com/health' from origin 'http://localhost:3070' has been blocked by CORS policy
Access to XMLHttpRequest at 'https://api.geoleap.app/api/usersubscriptions' from origin 'http://localhost:3070' has been blocked by CORS
```

**Impact:**
No backend communication possible in development mode.

---

### BUG-009: Google Sign-In Not Implemented for Web Platform
**Severity:** HIGH
**Category:** Authentication
**Status:** Open

**Description:**
Google Sign-In functionality is not implemented for web platform.

**Console Warning:**
```
RNGoogleSignIn: you are calling a not-implemented method on web platform. Web support is only available on Google's Expo SDK
```

**Impact:**
Google OAuth login unavailable on web platform.

---

### BUG-010: Search Returns Zero Results
**Severity:** HIGH
**Category:** Search
**Status:** Open

**Description:**
Searching for content returns no results, even with mock data enabled.

**Steps to Reproduce:**
1. Navigate to Search tab
2. Type "Batman" in search field
3. Press Enter
4. "Recent Searches" shows "Batman (0)" indicating zero results

**Console Warning:**
```
Streaming Availability API key not found. Using mock data.
```

**Expected Behavior:**
Mock data should return sample results when API key is not configured.

**Actual Behavior:**
Returns 0 results.

---

### BUG-011: All Content Shows Placeholder/Mock Data
**Severity:** HIGH
**Category:** Content
**Status:** Open

**Description:**
All content throughout the app displays generic placeholder names instead of real data.

**Examples:**
- Browse: "Trending Title 1", "Trending Title 2", "Popular Title 1"
- Library: "Watchlist Item 1", "Watchlist Item 2"
- New Releases: "New Release 1", "New Release 2"

**Impact:**
App appears non-functional to users; no real content displayed.

---

### BUG-012: HTML Nesting Error - Button Inside Button
**Severity:** HIGH
**Category:** React/HTML
**Status:** Open

**Description:**
Invalid HTML nesting detected - `<button>` elements nested inside other `<button>` elements.

**Console Errors:**
```
In HTML, <button> cannot be a descendant of <button>. This will cause a hydration error.
<button> cannot contain a nested <button>
```

**Impact:**
React hydration errors, accessibility issues, potential click handler conflicts.

**Files Affected:**
- `mobile/src/components/library/WatchlistItem.tsx` (likely)
- Library screen components

---

### BUG-013: Watchlist API Continuously Failing
**Severity:** HIGH
**Category:** API
**Status:** Open

**Description:**
Watchlist API calls fail repeatedly and fall back to cached data.

**Console Errors:**
```
[ERROR] Failed to fetch watchlists from server: TypeError: Failed to fetch
[WARN] Falling back to cached watchlists
```

**Impact:**
Users cannot sync watchlist with server; data may be stale.

---

### BUG-014: Recommendations API Failing
**Severity:** HIGH
**Category:** API
**Status:** Open

**Description:**
All recommendation-related API calls fail.

**Console Errors:**
```
Failed to fetch recommendations from server, using cache
Failed to fetch trending recommendations
Failed to fetch friend recommendations
```

---

### BUG-015: User Preferences API Failing
**Severity:** HIGH
**Category:** API
**Status:** Open

**Description:**
User preferences cannot be fetched from server.

**Console Error:**
```
Failed to fetch user preferences, using cache
```

---

## MEDIUM Severity Bugs (P2)

### BUG-016: ReferenceError - 'theme' is Not Defined
**Severity:** MEDIUM
**Category:** JavaScript Error
**Status:** Open

**Description:**
ProfileSettings component has an undefined 'theme' variable reference.

**Console Error:**
```
ReferenceError: theme is not defined
    at ProfileSettings component
```

**Files Affected:**
- `mobile/src/components/profile/ProfileSettings.tsx`

---

### BUG-017: useNativeDriver Not Supported Warning
**Severity:** MEDIUM
**Category:** Animation
**Status:** Open

**Description:**
Native animation driver not available for web platform.

**Console Warning:**
```
Animated: `useNativeDriver` is not supported because the native animated module is missing
```

**Impact:**
Animations may be less performant on web.

---

### BUG-018: Deprecated Style Props Warning
**Severity:** MEDIUM
**Category:** Styling
**Status:** Open

**Description:**
Deprecated shadow style props being used.

**Console Warning:**
```
"shadow*" style props are deprecated. Use "boxShadow".
```

---

### BUG-019: Deprecated pointerEvents Props Warning
**Severity:** MEDIUM
**Category:** Styling
**Status:** Open

**Description:**
Deprecated pointerEvents prop usage.

**Console Warning:**
```
props.pointerEvents is deprecated. Use style.pointerEvents
```

---

### BUG-020: Streaming Availability API Key Not Configured
**Severity:** MEDIUM
**Category:** Configuration
**Status:** Open

**Description:**
Streaming availability API key is not set in environment variables.

**Console Warning:**
```
[WARN] Streaming Availability API key not found in environment variables
[INFO] Please set STREAMING_AVAILABILITY_API_KEY in your environment
[INFO] For Expo, use EXPO_PUBLIC_STREAMING_API_KEY
```

---

### BUG-021: User Subscriptions API Error
**Severity:** MEDIUM
**Category:** API
**Status:** Open

**Description:**
User subscriptions endpoint returns error.

**Console Error:**
```
Error fetching subscriptions: AxiosError
```

---

## LOW Severity Bugs (P3)

### BUG-022: Password Fields Not Contained in Form Element
**Severity:** LOW
**Category:** HTML/Accessibility
**Status:** Open

**Description:**
Password input fields are not wrapped in a `<form>` element.

**Console Warning:**
```
[DOM] Password field is not contained in a form
```

**Impact:**
May affect password manager autofill functionality.

**Files Affected:**
- `mobile/src/screens/profile/AccountSettingsScreen.tsx`

---

### BUG-023: React DevTools Recommendation
**Severity:** LOW
**Category:** Development
**Status:** Informational

**Console Message:**
```
Download the React DevTools for a better development experience
```

---

### BUG-024: Network Reports Internet Not Reachable
**Severity:** LOW
**Category:** Network
**Status:** Open

**Description:**
Network service reports internet as not reachable even when connected.

**Console Log:**
```
Network connected: {type: other, internetReachable: false}
```

---

## Recommendations

### Immediate Actions (Critical)

1. **Fix API Base URL Configuration**
   - Create proper environment configuration for development vs production
   - Use `http://localhost:8020` for development builds
   - Fix duplicate `/api/api/` path issue

2. **Implement Authentication Gate**
   - Add authentication check at app startup
   - Redirect unauthenticated users to Login screen
   - Fix logout functionality

3. **Fix Token Retrieval**
   - Debug TokenService to identify undefined property access
   - Ensure proper initialization of authentication services

### Short-term Actions (High Priority)

4. **Fix Screen Navigation/Rendering**
   - Investigate tab navigation to prevent screen overlay
   - Ensure proper unmounting of inactive screens

5. **Fix Content Card Navigation**
   - Ensure onPress handlers properly trigger navigation

6. **Fix HTML Nesting Issues**
   - Refactor WatchlistItem to avoid nested buttons

### Medium-term Actions

7. **Configure Environment Variables**
   - Set up STREAMING_AVAILABILITY_API_KEY
   - Document required environment variables

8. **Fix Theme Reference Error**
   - Import or define theme in ProfileSettings component

9. **Update Deprecated APIs**
   - Replace shadow* props with boxShadow
   - Replace props.pointerEvents with style.pointerEvents

---

## Test Environment Details

- **App Version:** 1.0.0
- **React Native:** 0.81.5
- **Expo:** 54.0.0
- **Node:** 18+
- **Backend:** GeoLeap.Api (.NET 9)
- **Browser:** Chromium (via Playwright)

---

## Appendix: Console Error Summary

Total unique errors captured during testing session:
- CORS Errors: 50+
- TypeError (Token): 20+
- ReferenceError (theme): 5+
- API Failures: 30+
- Deprecation Warnings: 10+
- HTML Nesting Errors: 2

---

*Report generated: December 15, 2025*
*Testing tool: Playwright MCP*
