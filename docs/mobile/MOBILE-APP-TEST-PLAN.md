# GeoLeap Mobile App - Comprehensive Test Plan

**Version:** 1.0
**Date:** December 15, 2025
**Platform:** React Native (Expo) - iOS & Android
**App Version:** 1.0.0 (Build 1)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Test Scope & Objectives](#2-test-scope--objectives)
3. [Test Environment](#3-test-environment)
4. [Authentication Testing](#4-authentication-testing)
5. [VPN Features Testing](#5-vpn-features-testing)
6. [Streaming & Content Testing](#6-streaming--content-testing)
7. [Search Functionality Testing](#7-search-functionality-testing)
8. [Subscription & Payment Testing](#8-subscription--payment-testing)
9. [Navigation & Deep Linking Testing](#9-navigation--deep-linking-testing)
10. [Profile & Settings Testing](#10-profile--settings-testing)
11. [Offline & Network Testing](#11-offline--network-testing)
12. [UI/UX Testing](#12-uiux-testing)
13. [Accessibility Testing](#13-accessibility-testing)
14. [Performance Testing](#14-performance-testing)
15. [Security Testing](#15-security-testing)
16. [Platform-Specific Testing](#16-platform-specific-testing)
17. [Error Handling Testing](#17-error-handling-testing)
18. [Regression Testing](#18-regression-testing)
19. [Test Execution Priority](#19-test-execution-priority)
20. [Bug Tracking Template](#20-bug-tracking-template)

---

## 1. Executive Summary

This test plan provides comprehensive coverage for the GeoLeap mobile application, a cross-platform React Native app that helps users discover streaming content and find VPN recommendations. The plan covers **450+ test cases** across **18 testing categories**.

### Key Features to Test
- Email/password, biometric, and OAuth authentication
- VPN provider recommendations and comparisons
- Streaming content search with filters
- Subscription management with IAP
- Offline functionality and data sync
- Cross-platform (iOS/Android) compatibility

### Testing Approach
- **Manual Testing:** UI flows, visual verification, real device testing
- **Automated Testing:** Jest unit tests, integration tests, E2E with Playwright/Detox
- **Platform Testing:** iOS simulator, Android emulator, physical devices
- **Network Testing:** Online, offline, poor connectivity scenarios

---

## 2. Test Scope & Objectives

### In Scope
| Area | Components |
|------|------------|
| Authentication | Login, Register, Forgot Password, Biometric, OAuth (Google/Apple) |
| VPN Features | Recommendations, Provider Comparison, Country Selection |
| Streaming | Content Search, Filters, Details, Availability |
| Subscription | Plans, IAP (iOS/Android), Management, Promo Codes |
| User Features | Watchlist, History, Profile, Settings |
| Navigation | Tabs, Stacks, Drawers, Deep Links |
| Data Sync | Offline Mode, Queue, Sync on Reconnect |

### Out of Scope
- Backend API testing (covered by separate test plan)
- Third-party VPN provider apps
- Actual streaming content playback (external apps)

### Test Objectives
1. Identify all functional bugs before release
2. Ensure cross-platform consistency (iOS vs Android)
3. Validate offline functionality
4. Verify payment/subscription flows work correctly
5. Confirm accessibility compliance
6. Validate performance benchmarks

---

## 3. Test Environment

### Devices
| Platform | Device | OS Version |
|----------|--------|------------|
| iOS | iPhone 15 Pro | iOS 17.x |
| iOS | iPhone 12 | iOS 16.x |
| iOS | iPad Pro 12.9" | iPadOS 17.x |
| Android | Pixel 8 | Android 14 |
| Android | Samsung S23 | Android 13 |
| Android | Budget Device | Android 12 |

### Simulators/Emulators
- iOS Simulator (Xcode 15+)
- Android Emulator (API 33, 34)

### Network Conditions
- WiFi (stable)
- 4G/LTE
- 3G (slow)
- Airplane mode (offline)
- Intermittent connectivity

### API Environment
- Backend: `https://api.geoleap.app`
- Test Backend: `http://localhost:8020`

---

## 4. Authentication Testing

### 4.1 Email/Password Login

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-001 | Valid login | Enter valid email/password, tap Login | User logged in, navigated to Dashboard | Critical |
| AUTH-002 | Invalid email format | Enter "invalid-email", tap Login | Validation error: "Invalid email format" | High |
| AUTH-003 | Empty email | Leave email empty, tap Login | Validation error: "Email is required" | High |
| AUTH-004 | Empty password | Leave password empty, tap Login | Validation error: "Password is required" | High |
| AUTH-005 | Wrong password | Enter valid email, wrong password | Error: "Invalid credentials" | High |
| AUTH-006 | Non-existent user | Enter unregistered email | Error: "User not found" | High |
| AUTH-007 | Password visibility toggle | Tap eye icon on password field | Password text toggles visible/hidden | Medium |
| AUTH-008 | Remember me | Check "Remember me", login, close app, reopen | User remains logged in | High |
| AUTH-009 | Remember me unchecked | Uncheck "Remember me", login, close app | User must login again | Medium |
| AUTH-010 | Login button disabled | Form has validation errors | Login button is disabled | Medium |
| AUTH-011 | Login loading state | Tap Login with valid credentials | Loading spinner shown during request | Low |
| AUTH-012 | Case-insensitive email | Enter email with mixed case | Login succeeds (emails are case-insensitive) | Medium |
| AUTH-013 | Whitespace trimming | Enter email with leading/trailing spaces | Spaces trimmed, login succeeds | Low |
| AUTH-014 | Network error during login | Disable network, tap Login | Error: "Network error. Please try again" | High |
| AUTH-015 | Server error (500) | API returns 500 | Error: "Something went wrong. Please try again" | High |
| AUTH-016 | Rate limiting (429) | Attempt 10+ rapid logins | Error: "Too many attempts. Try again later" | Medium |
| AUTH-017 | Concurrent login attempts | Tap Login rapidly multiple times | Only one request sent, no duplicates | Medium |
| AUTH-018 | Login timeout | API takes >30 seconds | Error: "Request timed out" | Medium |

### 4.2 User Registration

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-020 | Valid registration | Enter valid email, password (8+ chars), confirm | Account created, navigated to Welcome | Critical |
| AUTH-021 | Password mismatch | Enter different passwords in confirm field | Error: "Passwords do not match" | High |
| AUTH-022 | Weak password | Enter password < 8 characters | Error: "Password must be at least 8 characters" | High |
| AUTH-023 | Email already exists | Register with existing email | Error: "Email already registered" | High |
| AUTH-024 | Invalid email format | Enter "not-an-email" | Validation error on email field | High |
| AUTH-025 | Password strength indicator | Type password | Indicator shows weak/medium/strong | Medium |
| AUTH-026 | Terms checkbox required | Leave terms unchecked, tap Register | Error: "You must agree to terms" | High |
| AUTH-027 | Terms link tappable | Tap "Terms of Service" link | Terms modal/page opens | Medium |
| AUTH-028 | Privacy link tappable | Tap "Privacy Policy" link | Privacy modal/page opens | Medium |
| AUTH-029 | Navigate to Login | Tap "Already have an account?" | Navigated to Login screen | Medium |
| AUTH-030 | Special characters in password | Register with password "P@ss!w0rd#" | Registration succeeds | Medium |
| AUTH-031 | Unicode in name | Register with name "Jean-Pierre" | Registration succeeds with special chars | Low |
| AUTH-032 | Maximum length fields | Enter 256+ char email/password | Field truncates or shows error | Low |

### 4.3 Forgot Password / Reset

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-040 | Request reset - valid email | Enter registered email, tap Send | Success: "Reset link sent to email" | Critical |
| AUTH-041 | Request reset - unregistered | Enter non-existent email | Same success message (security) | High |
| AUTH-042 | Empty email | Tap Send with empty email | Validation error | High |
| AUTH-043 | Invalid email format | Enter "invalid" | Validation error | Medium |
| AUTH-044 | Reset with valid token | Click link in email, enter new password | Password changed, can login | Critical |
| AUTH-045 | Reset with expired token | Use old/expired reset link | Error: "Reset link has expired" | High |
| AUTH-046 | Reset with invalid token | Use tampered token | Error: "Invalid reset link" | High |
| AUTH-047 | Password confirmation | Enter mismatched passwords | Error: "Passwords do not match" | High |
| AUTH-048 | Navigate back to Login | Tap "Back to Login" | Returns to Login screen | Medium |

### 4.4 Biometric Authentication

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-050 | Setup biometric - supported | Tap "Enable Face ID/Fingerprint" | System prompt for biometric | Critical |
| AUTH-051 | Setup biometric - not enrolled | Device has no biometric enrolled | Message: "Please set up biometrics in Settings" | High |
| AUTH-052 | Login with Face ID | Tap Face ID login, look at camera | Authenticated, logged in | Critical |
| AUTH-053 | Login with Fingerprint | Tap Fingerprint login, provide finger | Authenticated, logged in | Critical |
| AUTH-054 | Biometric canceled | Start biometric, tap Cancel | Returns to password login option | High |
| AUTH-055 | Biometric failed 3x | Fail biometric 3 times | Falls back to password, shows warning | High |
| AUTH-056 | Disable biometric | Settings > Disable biometric | Biometric option removed from login | Medium |
| AUTH-057 | Biometric after password change | Change password, try biometric | Biometric requires re-setup | High |
| AUTH-058 | Device biometric changed | Add new fingerprint, try login | Prompt to re-authenticate | High |
| AUTH-059 | Biometric on unsupported device | Old device without biometric | Option not shown, no crash | Medium |

### 4.5 Social Login (OAuth)

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-060 | Google Sign-In - new user | Tap "Sign in with Google", select account | Account created, logged in | Critical |
| AUTH-061 | Google Sign-In - existing | Tap Google, select linked account | Logged in to existing account | Critical |
| AUTH-062 | Google Sign-In - canceled | Tap Google, cancel prompt | Returns to login, no error | High |
| AUTH-063 | Apple Sign-In - new user | Tap "Sign in with Apple" | Account created, logged in | Critical |
| AUTH-064 | Apple Sign-In - hide email | Choose "Hide My Email" | Account created with relay email | High |
| AUTH-065 | Apple Sign-In - canceled | Cancel Apple prompt | Returns to login, no error | High |
| AUTH-066 | Link Google to existing | Login, Settings > Link Google | Google account linked | Medium |
| AUTH-067 | Link Apple to existing | Login, Settings > Link Apple | Apple account linked | Medium |
| AUTH-068 | Unlink social account | Settings > Unlink Google | Account unlinked (if password exists) | Medium |
| AUTH-069 | Unlink only auth method | Try to unlink only auth | Error: "Must have another login method" | High |
| AUTH-070 | Google token expired | Token expires during session | Auto-refresh or prompt re-auth | Medium |

### 4.6 Token Management

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-080 | Token refresh on API call | Make API call with expired access token | Token silently refreshed, call succeeds | Critical |
| AUTH-081 | Refresh token expired | Both tokens expired | Logged out, redirected to Login | Critical |
| AUTH-082 | Token stored securely | Inspect storage | Tokens in SecureStore, not AsyncStorage | Critical |
| AUTH-083 | Token cleared on logout | Logout | No tokens in storage | Critical |
| AUTH-084 | Concurrent token refresh | Multiple APIs trigger refresh | Only one refresh request made | High |
| AUTH-085 | Logout during refresh | Logout while refresh in progress | Logout completes, refresh discarded | High |

### 4.7 Logout

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AUTH-090 | Normal logout | Tap Logout in settings | Logged out, tokens cleared, at Login | Critical |
| AUTH-091 | Logout confirmation | Tap Logout | Confirmation dialog shown | Medium |
| AUTH-092 | Cancel logout | Tap Cancel on confirmation | Remains logged in | Medium |
| AUTH-093 | Logout clears watchlist cache | Logout, login as different user | Different user's watchlist shown | High |
| AUTH-094 | Concurrent logout | Tap logout rapidly | Only one logout request, no crash | Medium |

---

## 5. VPN Features Testing

### 5.1 VPN Recommendations

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| VPN-001 | Recommendations loaded | Navigate to VPN Guidance | Top 3 VPN providers shown | Critical |
| VPN-002 | Based on user services | User has Netflix, Disney+ | Recommendations support those services | Critical |
| VPN-003 | Scoring algorithm | Check recommendation order | Highest score first (streaming match + ratings) | High |
| VPN-004 | Provider card info | View provider card | Shows: name, price, rating, features | High |
| VPN-005 | Tap provider card | Tap on NordVPN card | Opens provider detail/comparison | High |
| VPN-006 | Empty services | User has no streaming services | Generic recommendations shown | Medium |
| VPN-007 | All providers list | Scroll below recommendations | All 4 providers shown | Medium |
| VPN-008 | Refresh recommendations | Pull to refresh | Recommendations reloaded | Medium |
| VPN-009 | Loading state | Initial load | Skeleton/spinner shown | Low |
| VPN-010 | Error state | API fails | Error message with retry | Medium |

### 5.2 VPN Provider Comparison

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| VPN-020 | Compare two providers | Select NordVPN and ExpressVPN | Side-by-side comparison shown | Critical |
| VPN-021 | Feature matrix | View comparison | All features compared (kill switch, no-logs, etc.) | High |
| VPN-022 | Streaming support matrix | View comparison | Shows which services each supports | High |
| VPN-023 | Pricing comparison | View comparison | Monthly and yearly prices shown | High |
| VPN-024 | Server count display | View comparison | Server counts shown (5000+, etc.) | Medium |
| VPN-025 | Rating display | View comparison | Star ratings shown | Medium |
| VPN-026 | Setup guide - iOS | Tap "iOS Setup" | iOS setup instructions shown | High |
| VPN-027 | Setup guide - Android | Tap "Android Setup" | Android setup instructions shown | High |
| VPN-028 | Deep link to provider app | Tap "Download App" | Opens provider's app store page | High |
| VPN-029 | Compare >2 providers | Try to select 3 providers | Limited to 2 or shows all 3 | Low |

### 5.3 Country-Based Browsing

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| VPN-030 | Browse by country | Tap "Browse by Country" | Country list shown | High |
| VPN-031 | Country content | Select "United Kingdom" | Shows content available in UK | High |
| VPN-032 | VPN for country | Select country | Shows which VPNs have servers there | High |
| VPN-033 | Search countries | Type in search | Filters country list | Medium |
| VPN-034 | Flag icons | View country list | Correct flag icons displayed | Low |
| VPN-035 | Empty country | Select country with no extra content | Appropriate message shown | Medium |

---

## 6. Streaming & Content Testing

### 6.1 Content Details

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STR-001 | View content details | Tap on "Stranger Things" | Details page opens with all info | Critical |
| STR-002 | Title and description | View details | Title, description visible | High |
| STR-003 | Rating display | View details | Rating shown (e.g., 8.5/10) | High |
| STR-004 | Genre tags | View details | Genre tags displayed (Drama, Sci-Fi) | Medium |
| STR-005 | Season count (TV) | View TV show | Number of seasons shown | Medium |
| STR-006 | Duration (Movie) | View movie | Runtime shown (e.g., 2h 15m) | Medium |
| STR-007 | Release year | View details | Year displayed | Low |
| STR-008 | Cast list | View details | Main cast names shown | Low |

### 6.2 Streaming Availability

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STR-010 | Where to watch | View content details | "Where to Watch" section shown | Critical |
| STR-011 | Availability by country | View availability | User's country shown first | High |
| STR-012 | Multiple services | Content on Netflix and Prime | Both services listed | High |
| STR-013 | Availability type | View availability | Shows: subscription, rent, buy, free | High |
| STR-014 | Pricing displayed | Content available for rent | Price shown (e.g., $3.99) | High |
| STR-015 | Quality options | View availability | Shows SD, HD, 4K options | Medium |
| STR-016 | Leaving soon | Content leaving in 7 days | "Leaving soon" badge shown | High |
| STR-017 | Coming soon | Content not yet available | "Coming soon" with date shown | Medium |
| STR-018 | Deep link to service | Tap "Watch on Netflix" | Opens Netflix app or website | High |
| STR-019 | No availability | Content not streaming anywhere | "Not available for streaming" message | Medium |
| STR-020 | Country selector | Tap different country | Availability updates for that country | High |
| STR-021 | Audio/subtitles | View availability | Languages listed | Low |

### 6.3 Recommendations

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STR-030 | Similar content | View content details | "Similar" section shown | High |
| STR-031 | Based on genre | Viewing Sci-Fi movie | Sci-Fi recommendations shown | Medium |
| STR-032 | Personalized recs | Dashboard | "For You" recommendations shown | High |
| STR-033 | Trending content | Dashboard | "Trending" section shown | Medium |
| STR-034 | Recommendation tap | Tap recommended item | Opens that content's details | High |
| STR-035 | No recommendations | New user with no history | Generic popular content shown | Medium |

---

## 7. Search Functionality Testing

### 7.1 Basic Search

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SRC-001 | Search by title | Type "Stranger Things" | Matching results shown | Critical |
| SRC-002 | Partial search | Type "Strang" | Autocomplete suggestions shown | High |
| SRC-003 | Search results | View results | Shows title, thumbnail, type, year | High |
| SRC-004 | Empty search | Search "xyzabc123" | "No results found" message | High |
| SRC-005 | Search clear | Tap X on search field | Field cleared, results removed | Medium |
| SRC-006 | Search history | Tap search field | Recent searches shown | Medium |
| SRC-007 | Remove history item | Swipe on history item | Item removed from history | Medium |
| SRC-008 | Clear all history | Tap "Clear All" | All history cleared | Medium |
| SRC-009 | Case insensitive | Search "STRANGER things" | Results found | Medium |
| SRC-010 | Special characters | Search "Spider-Man" | Results found (handles hyphen) | Medium |

### 7.2 Voice Search

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SRC-020 | Voice search icon | View search screen | Microphone icon visible | Medium |
| SRC-021 | Start voice search | Tap microphone | Voice recording starts | High |
| SRC-022 | Speak and search | Say "Game of Thrones" | Search executed with spoken text | High |
| SRC-023 | Voice permission denied | Deny microphone permission | Appropriate error message | High |
| SRC-024 | Voice not recognized | Speak gibberish | "Couldn't understand" message | Medium |
| SRC-025 | Cancel voice | Tap cancel during recording | Recording stopped, no search | Medium |
| SRC-026 | Voice in noisy environment | Background noise | Still attempts recognition | Low |

### 7.3 Filters

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SRC-030 | Filter by type - Movie | Select "Movies" filter | Only movies shown | High |
| SRC-031 | Filter by type - TV | Select "TV Shows" filter | Only TV shows shown | High |
| SRC-032 | Filter by genre | Select "Action" | Only action content shown | High |
| SRC-033 | Multiple genres | Select "Action" and "Comedy" | Content matching either shown | Medium |
| SRC-034 | Filter by year | Set range 2020-2024 | Only content from those years | Medium |
| SRC-035 | Filter by service | Select "Netflix" | Only Netflix content shown | High |
| SRC-036 | Multiple services | Select Netflix and Disney+ | Content on either shown | Medium |
| SRC-037 | Filter by rating | Set minimum 7.0 | Only 7.0+ rated content | Medium |
| SRC-038 | Combine filters | Type "action" + filter year 2023 | Combined results | High |
| SRC-039 | Clear filters | Tap "Clear All" | All filters removed | Medium |
| SRC-040 | Filter persistence | Apply filter, navigate away, return | Filter still applied | Low |
| SRC-041 | Filter count badge | Apply filters | Badge shows number of active filters | Low |

### 7.4 Pagination & Performance

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SRC-050 | Infinite scroll | Search "the", scroll down | More results load automatically | High |
| SRC-051 | Loading indicator | Scroll to load more | Spinner shown at bottom | Medium |
| SRC-052 | No more results | Scroll to end | "No more results" message | Medium |
| SRC-053 | Fast scrolling | Rapidly scroll through results | No crash, smooth performance | High |
| SRC-054 | Return to position | View detail, go back | Returns to scroll position | Medium |

---

## 8. Subscription & Payment Testing

### 8.1 Subscription Plans

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-001 | View plans | Navigate to Subscription Plans | All 4 tiers shown (Free, Basic, Premium, Pro) | Critical |
| SUB-002 | Plan details | View each plan | Features list accurate | High |
| SUB-003 | Monthly/Yearly toggle | Toggle billing period | Prices update accordingly | High |
| SUB-004 | Yearly discount | Toggle to yearly | Discount percentage shown | Medium |
| SUB-005 | Current plan badge | User on Basic plan | "Current Plan" badge on Basic | High |
| SUB-006 | Upgrade CTA | View higher tier | "Upgrade" button shown | High |
| SUB-007 | Downgrade option | View lower tier | "Downgrade" option available | Medium |
| SUB-008 | Free tier limitations | On Free tier | Shows what's limited | Medium |

### 8.2 iOS In-App Purchase

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-010 | Purchase Basic Monthly (iOS) | Tap Subscribe, complete Face ID | Purchase successful, plan upgraded | Critical |
| SUB-011 | Purchase Basic Yearly (iOS) | Toggle yearly, subscribe | Yearly subscription active | Critical |
| SUB-012 | Purchase canceled (iOS) | Start purchase, cancel | Returns to plan screen, no charge | High |
| SUB-013 | Payment failed (iOS) | Use invalid payment method | Error: "Payment failed" | High |
| SUB-014 | Subscription restored (iOS) | Delete app, reinstall, tap Restore | Previous subscription restored | Critical |
| SUB-015 | Sandbox testing (iOS) | Use sandbox account | Can test purchase flow | High |
| SUB-016 | Receipt validation (iOS) | Complete purchase | Receipt validated with backend | Critical |
| SUB-017 | Family Sharing (iOS) | Family member has subscription | Shared subscription recognized | Medium |

### 8.3 Android In-App Purchase

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-020 | Purchase Basic Monthly (Android) | Tap Subscribe, confirm with fingerprint | Purchase successful | Critical |
| SUB-021 | Purchase Basic Yearly (Android) | Toggle yearly, subscribe | Yearly subscription active | Critical |
| SUB-022 | Purchase canceled (Android) | Start purchase, press back | Returns to plan screen | High |
| SUB-023 | Payment failed (Android) | Use test card that declines | Error message shown | High |
| SUB-024 | Subscription restored (Android) | Reinstall app | Subscription auto-detected | Critical |
| SUB-025 | Test purchase (Android) | Use test IAP | Can test without real payment | High |
| SUB-026 | License check (Android) | Purchase complete | License validated with Google | Critical |

### 8.4 Promo Codes

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-030 | Valid promo code | Enter "LAUNCH50" | 50% discount applied | High |
| SUB-031 | Invalid promo code | Enter "INVALID123" | Error: "Invalid promo code" | High |
| SUB-032 | Expired promo code | Enter expired code | Error: "Promo code has expired" | Medium |
| SUB-033 | Already used code | Use code twice | Error: "Code already redeemed" | Medium |
| SUB-034 | Case insensitive | Enter "launch50" | Code accepted | Low |
| SUB-035 | Apply to yearly | Apply code to yearly plan | Discount calculated correctly | Medium |

### 8.5 Subscription Management

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-040 | View current subscription | Navigate to Subscription Management | Current plan and renewal date shown | Critical |
| SUB-041 | Auto-renewal status | View management | Shows if auto-renew is on/off | High |
| SUB-042 | Turn off auto-renewal | Toggle auto-renew off | Renewal disabled (via App Store/Play) | High |
| SUB-043 | Cancel subscription | Tap Cancel Subscription | Redirects to OS subscription settings | High |
| SUB-044 | Billing history | View history | Past payments shown | Medium |
| SUB-045 | Subscription expires | Let subscription expire | User downgraded to Free | High |
| SUB-046 | Grace period | Subscription expires | Grace period behavior (if applicable) | Medium |
| SUB-047 | Re-subscribe | After cancellation, subscribe again | New subscription started | Medium |

---

## 9. Navigation & Deep Linking Testing

### 9.1 Tab Navigation

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NAV-001 | Home tab | Tap Home icon | Home/Dashboard screen shown | Critical |
| NAV-002 | Search tab | Tap Search icon | Search screen shown | Critical |
| NAV-003 | Dashboard tab | Tap Dashboard icon | Dashboard screen shown | Critical |
| NAV-004 | Profile tab | Tap Profile icon | Profile screen shown | Critical |
| NAV-005 | Settings tab | Tap Settings icon | Settings screen shown | Critical |
| NAV-006 | Tab indicator | Navigate tabs | Active tab highlighted | Medium |
| NAV-007 | Tab badge | New notifications | Badge shown on relevant tab | Medium |
| NAV-008 | Double-tap tab | Double-tap current tab | Scrolls to top | Low |

### 9.2 Stack Navigation

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NAV-010 | Navigate to detail | Tap content item | Detail screen opens (push) | High |
| NAV-011 | Back button | Tap back arrow | Returns to previous screen | High |
| NAV-012 | Swipe back (iOS) | Swipe from left edge | Returns to previous screen | High |
| NAV-013 | Hardware back (Android) | Press hardware back | Returns to previous screen | High |
| NAV-014 | Deep stack | Navigate 5+ screens deep | All back buttons work correctly | Medium |
| NAV-015 | Modal dismiss | Open modal, tap outside | Modal dismisses | Medium |

### 9.3 Deep Linking

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NAV-020 | Deep link - home | Open geoleap://home | App opens to Home screen | High |
| NAV-021 | Deep link - profile | Open geoleap://profile | App opens to Profile | High |
| NAV-022 | Deep link - settings | Open geoleap://settings | App opens to Settings | High |
| NAV-023 | Deep link - content | Open geoleap://content/123 | Opens specific content detail | High |
| NAV-024 | Deep link - not logged in | Open deep link when logged out | Opens Login, then navigates | High |
| NAV-025 | Deep link from notification | Tap push notification | Opens relevant screen | High |
| NAV-026 | Universal link | Open https://geoleap.app/content/123 | Opens app to content (if installed) | Medium |
| NAV-027 | Invalid deep link | Open geoleap://invalid | Graceful fallback to Home | Medium |

---

## 10. Profile & Settings Testing

### 10.1 Profile Screen

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PRF-001 | View profile | Navigate to Profile | User info displayed | Critical |
| PRF-002 | Profile picture | View profile | Avatar/photo shown | Medium |
| PRF-003 | Edit name | Tap edit, change name | Name updated | High |
| PRF-004 | Edit email | Tap edit, change email | Email update (with verification) | High |
| PRF-005 | Change password | Settings > Change Password | Password changed | High |
| PRF-006 | Delete account | Settings > Delete Account | Confirmation shown, account deleted | High |
| PRF-007 | Subscription badge | View profile | Shows current tier (Free, Basic, etc.) | Medium |

### 10.2 Settings Screen

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SET-001 | Settings list | Open Settings | All settings categories shown | High |
| SET-002 | Theme toggle | Toggle Light-Only Mode | Theme changes immediately | High |
| SET-003 | Theme persistence | Set Light-Only Mode, restart app | Light-Only Mode still active | High |
| SET-004 | Language selection | Settings > Language | Language options shown | Medium |
| SET-005 | Change language | Select Spanish | App language changes | Medium |
| SET-006 | Notification settings | Settings > Notifications | Notification preferences shown | High |
| SET-007 | Toggle notifications | Toggle off marketing | Marketing notifications disabled | Medium |
| SET-008 | Analytics consent | Settings > Analytics | Consent toggle shown | Medium |
| SET-009 | Toggle analytics | Toggle off analytics | Analytics collection stopped | Medium |
| SET-010 | About/Version | Settings > About | App version shown | Low |
| SET-011 | Terms link | Tap Terms of Service | Terms page opens | Medium |
| SET-012 | Privacy link | Tap Privacy Policy | Privacy page opens | Medium |
| SET-013 | Support contact | Tap Contact Support | Email/support channel opens | Medium |
| SET-014 | Rate app | Tap Rate App | Opens App Store/Play Store | Medium |

### 10.3 Streaming Service Preferences

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SVC-001 | View services | Profile > My Services | User's selected services shown | High |
| SVC-002 | Add service | Tap + Add Service | Service selection modal opens | High |
| SVC-003 | Select service | Tap Netflix | Netflix added to user's services | High |
| SVC-004 | Remove service | Swipe/tap remove on service | Service removed | High |
| SVC-005 | Service icons | View services | Correct icons for each service | Low |
| SVC-006 | Multiple services | Add 5+ services | All services saved correctly | Medium |
| SVC-007 | Services affect recommendations | Change services | VPN recommendations update | High |

---

## 11. Offline & Network Testing

### 11.1 Offline Mode

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| OFF-001 | Go offline | Enable Airplane mode | "You're offline" indicator shown | Critical |
| OFF-002 | Cached content | Offline, view previously loaded | Content displays from cache | High |
| OFF-003 | Watchlist offline | Offline, view watchlist | Cached watchlist shown | High |
| OFF-004 | Search offline | Offline, search | "Search unavailable offline" | High |
| OFF-005 | Add to watchlist offline | Offline, add to watchlist | Queued for sync when online | Medium |
| OFF-006 | Remove offline | Offline, remove from watchlist | Queued for sync | Medium |
| OFF-007 | Login offline | Offline, try to login | Error: "No internet connection" | High |
| OFF-008 | Register offline | Offline, try to register | Error: "No internet connection" | High |

### 11.2 Network Transitions

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NET-010 | Go online | Was offline, reconnect | "Back online" indicator, sync starts | High |
| NET-011 | Auto-sync | Reconnect with pending actions | Pending changes sync automatically | High |
| NET-012 | Sync conflict | Modified same item offline & online | Conflict resolution (latest wins?) | Medium |
| NET-013 | WiFi to cellular | Switch from WiFi to 4G | Connection maintained | High |
| NET-014 | Cellular to WiFi | Switch from 4G to WiFi | Connection maintained | High |
| NET-015 | Slow connection | 3G/slow network | Content loads with spinner | High |
| NET-016 | Timeout handling | Very slow response | Timeout error after threshold | Medium |

### 11.3 Network Error Handling

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NET-020 | Network error retry | API fails, tap Retry | Request retried | High |
| NET-021 | Multiple retries | Fails 3 times | Shows "Check connection" | High |
| NET-022 | Partial load failure | Half of API calls fail | Successful parts shown | Medium |
| NET-023 | Image load failure | Image URL 404 | Placeholder image shown | Medium |

---

## 12. UI/UX Testing

### 12.1 Theme & Visual

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UI-001 | Light theme | Set light mode | All screens use light colors | High |
| UI-002 | Light Theme | Set Light-Only Mode | All screens use dark colors | High |
| UI-003 | System theme | Set to "System" | Matches device setting | Medium |
| UI-004 | Theme consistency | Navigate all screens | No light elements in Light-Only Mode | High |
| UI-005 | Text readability | Both themes | All text readable (contrast) | High |
| UI-006 | Icon visibility | Both themes | Icons visible and correct | Medium |
| UI-007 | Image rendering | All screens | Images load, correct aspect | High |
| UI-008 | Animation smoothness | Navigate screens | Transitions are smooth | Medium |

### 12.2 Responsive Design

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UI-010 | Phone portrait | Use phone vertically | Layout correct | Critical |
| UI-011 | Phone landscape | Rotate to landscape | Layout adapts (if supported) | Medium |
| UI-012 | Tablet portrait | Use tablet vertically | Larger layout, more content | High |
| UI-013 | Tablet landscape | Tablet horizontally | Multi-column layout | Medium |
| UI-014 | Small screen | Use iPhone SE size | No content cut off | High |
| UI-015 | Large screen | Use iPad Pro | No wasted space | Medium |
| UI-016 | Notch handling | iPhone with notch | Content not obscured | High |
| UI-017 | Safe areas | All devices | Content respects safe areas | High |

### 12.3 Loading States

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UI-020 | Initial load | Open app | Splash/loading screen shown | High |
| UI-021 | Screen load | Navigate to new screen | Loading indicator shown | High |
| UI-022 | Skeleton loaders | Search results loading | Skeleton placeholders shown | Medium |
| UI-023 | Button loading | Tap Login | Button shows loading state | Medium |
| UI-024 | Pull to refresh | Pull down on list | Refresh indicator shown | Medium |
| UI-025 | Infinite scroll load | Scroll to load more | Spinner at bottom | Medium |

### 12.4 Empty States

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| UI-030 | Empty watchlist | New user, view watchlist | "No items" message with CTA | High |
| UI-031 | Empty history | No viewing history | "No history" message | Medium |
| UI-032 | Empty search results | Search "xyzabc" | "No results" with suggestions | High |
| UI-033 | Empty notifications | No notifications | "No notifications" message | Medium |

---

## 13. Accessibility Testing

### 13.1 Screen Reader

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| A11Y-001 | VoiceOver (iOS) | Enable VoiceOver, navigate | All elements announced | Critical |
| A11Y-002 | TalkBack (Android) | Enable TalkBack, navigate | All elements announced | Critical |
| A11Y-003 | Button labels | Focus on buttons | Descriptive labels read | High |
| A11Y-004 | Image alt text | Focus on images | Alt text read | High |
| A11Y-005 | Form labels | Focus on inputs | Labels and hints read | High |
| A11Y-006 | Navigation | Navigate with gestures | All screens reachable | High |
| A11Y-007 | Error announcements | Form validation error | Error announced | High |
| A11Y-008 | Dynamic content | New content loads | Change announced | Medium |

### 13.2 Visual Accessibility

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| A11Y-010 | Large text | Increase system font size | Text scales appropriately | High |
| A11Y-011 | Bold text | Enable bold text | Text uses bold weight | Medium |
| A11Y-012 | Reduced motion | Enable reduced motion | Animations minimized | Medium |
| A11Y-013 | Color contrast | All screens | 4.5:1 contrast ratio minimum | High |
| A11Y-014 | Color-blind friendly | All screens | Not relying solely on color | Medium |
| A11Y-015 | Touch targets | All buttons | Minimum 44x44 pt tap areas | High |

### 13.3 Motor Accessibility

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| A11Y-020 | Switch control (iOS) | Use Switch Control | All features accessible | Medium |
| A11Y-021 | Voice control | Use voice commands | Features controllable | Medium |
| A11Y-022 | Single-hand use | Use with one hand | Key features reachable | Medium |

---

## 14. Performance Testing

### 14.1 App Launch

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PERF-001 | Cold start time | Force quit, open app | < 3 seconds to interactive | Critical |
| PERF-002 | Warm start time | Background, reopen | < 1 second to interactive | High |
| PERF-003 | First load time | Fresh install, open | < 5 seconds to usable | High |
| PERF-004 | Login performance | Tap Login | < 2 seconds response | High |

### 14.2 Navigation Performance

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PERF-010 | Tab switch | Switch between tabs | < 100ms, no jank | High |
| PERF-011 | Screen transition | Navigate to new screen | Smooth 60fps animation | High |
| PERF-012 | Back navigation | Tap back | < 100ms response | High |
| PERF-013 | Deep navigation | Navigate 10+ screens | No memory buildup | Medium |

### 14.3 List Performance

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PERF-020 | Search results scroll | Scroll 100+ results | Smooth 60fps | High |
| PERF-021 | Watchlist scroll | Large watchlist (50+ items) | Smooth scrolling | High |
| PERF-022 | Image loading | Scroll fast through images | Images load without jank | Medium |
| PERF-023 | Infinite scroll | Load 5+ pages | No memory issues | Medium |

### 14.4 Memory & Battery

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PERF-030 | Memory usage | Use app for 30 minutes | Memory stable, no leaks | High |
| PERF-031 | Background memory | Send to background | Memory released | Medium |
| PERF-032 | Battery drain | Use app for 1 hour | Reasonable battery usage | Medium |
| PERF-033 | CPU usage | Idle on screen | Low CPU when idle | Medium |

### 14.5 Network Performance

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PERF-040 | API response time | Make typical API calls | < 500ms average | High |
| PERF-041 | Image optimization | View content with images | Appropriate size images loaded | Medium |
| PERF-042 | Caching | Revisit same content | Loads from cache (faster) | High |
| PERF-043 | Request batching | Multiple APIs needed | Batched efficiently | Medium |

---

## 15. Security Testing

### 15.1 Authentication Security

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SEC-001 | Token storage | Inspect device storage | Tokens in SecureStore only | Critical |
| SEC-002 | Password not stored | Inspect storage | Password never persisted | Critical |
| SEC-003 | HTTPS only | Intercept network | All traffic over HTTPS | Critical |
| SEC-004 | Certificate pinning | MITM attack attempt | Connection refused | High |
| SEC-005 | Session timeout | Leave app idle | Session expires after threshold | High |
| SEC-006 | Concurrent sessions | Login on second device | First session invalidated (or both valid per policy) | Medium |
| SEC-007 | Token refresh | Token expires | Silently refreshed, no exposure | High |

### 15.2 Data Security

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SEC-010 | Sensitive data in logs | Check debug logs | No passwords, tokens in logs | Critical |
| SEC-011 | Data in transit | Network inspection | Sensitive data encrypted | Critical |
| SEC-012 | Data at rest | Inspect local storage | Sensitive data encrypted | High |
| SEC-013 | Backup security (iOS) | iTunes backup | Sensitive data excluded | Medium |
| SEC-014 | Screenshot prevention | Sensitive screens | App may prevent screenshots | Low |
| SEC-015 | Clipboard security | Copy sensitive data | Auto-cleared after time | Low |

### 15.3 Input Validation

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SEC-020 | XSS in search | Search "<script>alert(1)</script>" | Input sanitized, no execution | High |
| SEC-021 | SQL injection | Input "'; DROP TABLE--" | Input sanitized, no effect | High |
| SEC-022 | Deep link injection | Malformed deep link | Handled safely, no crash | Medium |
| SEC-023 | Large input | Input 10000+ chars | Handled gracefully | Medium |

---

## 16. Platform-Specific Testing

### 16.1 iOS Specific

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| IOS-001 | Face ID | Use Face ID login | Works correctly | Critical |
| IOS-002 | Touch ID | Use Touch ID login | Works correctly | Critical |
| IOS-003 | Apple Sign-In | Sign in with Apple | Account created/linked | Critical |
| IOS-004 | App Store IAP | Purchase via App Store | Payment processed | Critical |
| IOS-005 | iOS 17 features | Test on iOS 17 | No compatibility issues | High |
| IOS-006 | iOS 16 support | Test on iOS 16 | App functions correctly | High |
| IOS-007 | iPad support | Test on iPad | Tablet layout works | High |
| IOS-008 | Swipe gestures | Swipe to go back | Works correctly | High |
| IOS-009 | Status bar | All screens | Status bar styled correctly | Medium |
| IOS-010 | Safe area (notch) | iPhone 14 Pro | Content not cut off | High |
| IOS-011 | Dynamic Island | iPhone 14 Pro | No interference | Medium |
| IOS-012 | Keyboard handling | Open keyboard | Content adjusts | High |
| IOS-013 | Push notifications (APNs) | Receive notification | Notification arrives | High |
| IOS-014 | Background refresh | App in background | Data refreshes | Medium |

### 16.2 Android Specific

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AND-001 | Fingerprint auth | Use fingerprint login | Works correctly | Critical |
| AND-002 | Face unlock | Use face unlock | Works correctly | High |
| AND-003 | Google Sign-In | Sign in with Google | Account created/linked | Critical |
| AND-004 | Play Store IAP | Purchase via Play Store | Payment processed | Critical |
| AND-005 | Android 14 | Test on Android 14 | No compatibility issues | High |
| AND-006 | Android 13 | Test on Android 13 | App functions correctly | High |
| AND-007 | Android 12 | Test on Android 12 | App functions correctly | Medium |
| AND-008 | Hardware back | Press back button | Correct behavior | High |
| AND-009 | Status bar | All screens | Status bar styled | Medium |
| AND-010 | Navigation bar | Different nav bar styles | App respects nav bar | Medium |
| AND-011 | Split screen | Use split screen | App handles correctly | Low |
| AND-012 | Keyboard handling | Open keyboard | Content adjusts | High |
| AND-013 | Push notifications (FCM) | Receive notification | Notification arrives | High |
| AND-014 | Doze mode | Device in Doze | Notifications still work | Medium |
| AND-015 | Samsung devices | Test on Samsung | No Samsung-specific issues | Medium |
| AND-016 | Xiaomi devices | Test on Xiaomi | No MIUI-specific issues | Low |

---

## 17. Error Handling Testing

### 17.1 API Errors

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ERR-001 | 400 Bad Request | API returns 400 | User-friendly validation error | High |
| ERR-002 | 401 Unauthorized | API returns 401 | Redirect to login | Critical |
| ERR-003 | 403 Forbidden | API returns 403 | "Access denied" message | High |
| ERR-004 | 404 Not Found | API returns 404 | "Not found" message | High |
| ERR-005 | 429 Rate Limit | API returns 429 | "Too many requests" message | Medium |
| ERR-006 | 500 Server Error | API returns 500 | "Server error" with retry | High |
| ERR-007 | 503 Service Unavailable | API returns 503 | "Service unavailable" message | High |
| ERR-008 | Network timeout | Request times out | Timeout error with retry | High |
| ERR-009 | Parse error | Malformed JSON response | Handled gracefully | Medium |

### 17.2 Crash Prevention

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ERR-010 | Null data | API returns null | No crash, fallback UI | High |
| ERR-011 | Empty arrays | API returns [] | Empty state shown | High |
| ERR-012 | Missing fields | API missing expected field | Handled with defaults | Medium |
| ERR-013 | Wrong data type | String where number expected | Handled, no crash | Medium |
| ERR-014 | Invalid dates | Malformed date string | Handled, no crash | Low |
| ERR-015 | Memory pressure | Low memory warning | App releases memory | High |
| ERR-016 | Rapid tapping | Tap button rapidly | Only one action, no crash | High |
| ERR-017 | Rotate during load | Rotate while loading | No crash, UI adapts | Medium |

### 17.3 Error Recovery

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ERR-020 | Retry mechanism | Error, tap Retry | Request retried successfully | High |
| ERR-021 | Error boundary | Component throws | Error boundary catches, shows fallback | Critical |
| ERR-022 | Crash recovery | App crashed previously | Opens normally next time | Critical |
| ERR-023 | Crash reporting | App crashes | Crash report sent (Sentry/Crashlytics) | High |

---

## 18. Regression Testing

### 18.1 Core Flows (Smoke Test)

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| REG-001 | Login flow | User can login successfully |
| REG-002 | Search flow | User can search and see results |
| REG-003 | Content detail | User can view content details |
| REG-004 | Add to watchlist | User can add/remove from watchlist |
| REG-005 | VPN recommendations | Recommendations load correctly |
| REG-006 | Settings change | Settings save and persist |
| REG-007 | Logout | User can logout successfully |
| REG-008 | Navigation | All tabs and screens accessible |

### 18.2 Automated Test Suite

| Category | Test Count | Execution Time |
|----------|------------|----------------|
| Unit Tests | ~150 | < 30 seconds |
| Integration Tests | ~50 | < 2 minutes |
| E2E Tests | ~30 | < 10 minutes |

---

## 19. Test Execution Priority

### P0 - Critical (Must pass before any release)
- AUTH-001, AUTH-020, AUTH-050, AUTH-060 (Login/Register/Biometric/OAuth)
- AUTH-080, AUTH-090 (Token management, Logout)
- VPN-001, VPN-002 (VPN Recommendations)
- SUB-010, SUB-020 (IAP purchases)
- SEC-001, SEC-002, SEC-003 (Token/password security, HTTPS)

### P1 - High (Must pass before release)
- All authentication validation tests
- All payment and subscription tests
- All core navigation tests
- All network error handling tests
- All platform-specific critical tests

### P2 - Medium (Should pass, minor bugs acceptable)
- Filter and search advanced features
- UI polish tests
- Accessibility tests
- Performance benchmarks

### P3 - Low (Nice to have)
- Edge cases
- Minor UI issues
- Nice-to-have features

---

## 20. Bug Tracking Template

### Bug Report Format

```markdown
**Bug ID:** BUG-XXXX
**Title:** [Brief description]
**Severity:** Critical / High / Medium / Low
**Priority:** P0 / P1 / P2 / P3
**Platform:** iOS / Android / Both
**Device:** [Device model]
**OS Version:** [iOS/Android version]
**App Version:** [App version]
**Environment:** Production / Staging / Dev

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Screenshots/Videos:**
[Attach evidence]

**Logs:**
[Relevant logs]

**Additional Context:**
[Any other information]
```

### Severity Definitions

| Severity | Definition |
|----------|------------|
| Critical | App crash, data loss, security breach, payment failure |
| High | Major feature broken, blocking user flow |
| Medium | Feature partially broken, workaround exists |
| Low | Minor UI issue, cosmetic problem |

---

## Appendix A: Test Data Requirements

### Test Accounts
| Type | Email | Password | Purpose |
|------|-------|----------|---------|
| Free User | free@test.com | Test1234! | Test Free tier limitations |
| Basic User | basic@test.com | Test1234! | Test Basic tier features |
| Premium User | premium@test.com | Test1234! | Test Premium features |
| Pro User | pro@test.com | Test1234! | Test Pro features |
| New User | - | - | Fresh registration testing |

### Test Content
- Known movies: "Stranger Things", "Game of Thrones", "The Office"
- Known unavailable: Content that doesn't exist
- Regional content: UK-only, US-only content

### Test Payment
- iOS Sandbox account
- Android test cards
- Valid promo codes: LAUNCH50, NEWUSER10
- Invalid promo code: INVALID123

---

## Appendix B: Testing Tools

| Tool | Purpose |
|------|---------|
| Jest | Unit and integration tests |
| React Native Testing Library | Component testing |
| Detox | E2E testing (iOS/Android) |
| Playwright | Web-based E2E |
| Charles Proxy | Network inspection |
| Xcode Instruments | iOS performance |
| Android Profiler | Android performance |
| Accessibility Inspector | iOS a11y testing |
| Accessibility Scanner | Android a11y testing |

---

*Document maintained by: QA Team*
*Last updated: December 15, 2025*
