# GeoLeap (GeoLeap) - Comprehensive E2E Manual Test Plan

## Executive Summary

**Application**: GeoLeap (GeoLeap) - Global Streaming Content Discovery Platform
**Test Type**: End-to-End Manual Testing via Playwright MCP
**Test Environment**: Web Application
**Coverage Level**: Comprehensive (Functional + Security Testing)
**Total Test Cases**: 80+
**Estimated Execution Time**: 12-16 hours

---

## Table of Contents

1. [Test Execution Order](#test-execution-order)
2. [Test Data Requirements](#test-data-requirements)
3. [Authentication & User Management (P0)](#1-authentication--user-management-p0---critical)
4. [Search & Content Discovery (P0)](#2-search--content-discovery-p0---critical)
5. [VPN Guidance System (P0)](#3-vpn-guidance-system-p0---primary-feature)
6. [Subscription & Payment (P0)](#4-subscription--payment-p0---revenue-critical)
7. [Watchlist Management (P1)](#5-watchlist-management-p1---important)
8. [User Preferences (P1)](#6-user-preferences-p1---important)
9. [Admin Management (P1)](#7-admin-management-p1---important)
10. [Analytics & Reporting (P2)](#8-analytics--reporting-p2---nice-to-have)
11. [SEO & Marketing (P2)](#9-seo--marketing-p2---nice-to-have)
12. [Cross-Cutting Security Tests](#10-cross-cutting-security-tests)
13. [Test Results Template](#test-results-template)

---

## Test Execution Order

Execute tests in this sequence to build upon completed flows:

1. ✅ Authentication & User Management (Foundation)
2. ✅ Search & Content Discovery (Core functionality)
3. ✅ VPN Guidance System (Primary feature)
4. ✅ Watchlist Management (User engagement)
5. ✅ Subscription & Payment (Revenue critical)
6. ✅ User Preferences (Personalization)
7. ✅ Admin Management (Platform management)
8. ✅ Analytics & Reporting (Business intelligence)
9. ✅ SEO & Marketing (Growth features)

---

## Test Data Requirements

### User Accounts

| Email | Password | Role | Subscription |
|-------|----------|------|--------------|
| admin@geoleap.test | *(see local seed script)* | Admin | Premium Annual |
| premium@geoleap.test | *(see local seed script)* | User | Premium Annual |
| freeuser@geoleap.test | *(see local seed script)* | User | Free |
| testuser@geoleap.test | *(see local seed script)* | User | Free |

These are local fixtures on the reserved `.test` TLD, created by the development
seeder. The passwords are deliberately not published here: they follow a guessable
pattern, and the same pattern is used by the seeder that runs at startup in
Development.

### Stripe Test Cards

| Card Number | Expiry | CVC | Purpose |
|-------------|--------|-----|---------|
| 4242 4242 4242 4242 | 12/28 | 123 | Successful payment |
| 4000 0000 0000 0002 | 12/28 | 123 | Card declined |
| 4000 0000 0000 9995 | 12/28 | 123 | Insufficient funds |

### Content Test Data

- **Movies**: "Inception", "The Matrix", "Fight Club"
- **TV Shows**: "Breaking Bad", "Stranger Things", "The Office"
- **Streaming Services**: Netflix, Disney+, Hulu, HBO Max, Prime Video
- **Countries**: US, GB, CA, AU, FR, DE, JP

---

## 1. Authentication & User Management (P0 - Critical)

### AUTH-001: Email/Password Registration

**Objective**: Validate new user registration with email/password

**Preconditions**: None (anonymous user)

**Test Steps**:
1. Navigate to `https://geoleap.app/auth/register`
2. Take snapshot of registration page
3. Click email input field
4. Type "newuser@test.com"
5. Click password field
6. Type "SecurePass123!"
7. Click confirm password field
8. Type "SecurePass123!"
9. Click "Sign up" button
10. Wait for redirect
11. Take snapshot of success state

**Expected Results**:
- ✅ Registration form displays with all fields
- ✅ Password field type="password" (hidden input)
- ✅ Password strength indicator appears
- ✅ User redirected to `/onboarding` or `/dashboard`
- ✅ Success message displayed
- ✅ Tokens stored in httpOnly cookies (NOT localStorage)
- ✅ HTTPS connection enforced throughout

**Security Checks**:
- ❌ Password visible in plaintext → FAIL
- ❌ Tokens in URL parameters → FAIL
- ❌ Weak passwords accepted (< 8 chars, no uppercase, etc.) → FAIL
- ✅ CSRF token present in form

---

### AUTH-002: Email/Password Login

**Objective**: Validate user authentication with email and password

**Preconditions**: User account exists (testuser@geoleap.test)

**Test Steps**:
1. Navigate to `https://geoleap.app/auth/login`
2. Take snapshot of login page
3. Fill email field: "testuser@geoleap.test"
4. Fill password field: "Test123!"
5. Click "Sign in" button
6. Wait for redirect
7. Take snapshot of authenticated dashboard

**Expected Results**:
- ✅ Login successful on first attempt
- ✅ User redirected to `/dashboard`
- ✅ User profile visible in navigation header
- ✅ Session established (check cookies in dev tools)
- ✅ Last login timestamp updated

**Security Checks**:
- ✅ Password field masked (type="password")
- ✅ Failed login doesn't reveal whether email exists
- ✅ Rate limiting after 5 failed attempts
- ✅ Session tokens in httpOnly cookies

**Failed Login Test**:
- Attempt 6 logins with wrong password
- Verify account locked with message: "Too many failed attempts. Try again in 15 minutes."

---

### AUTH-003: OAuth Google Login

**Objective**: Validate social authentication via Google OAuth

**Preconditions**: Google OAuth configured, test Google account available

**Test Steps**:
1. Navigate to `/auth/login`
2. Click "Continue with Google" button
3. Complete Google OAuth flow in popup window
4. Verify redirect back to application
5. Take snapshot of authenticated state

**Expected Results**:
- ✅ OAuth flow completes successfully
- ✅ User profile created/updated with Google data (name, email, avatar)
- ✅ User redirected to `/dashboard` or `/onboarding`
- ✅ Tokens stored securely

**Security Checks**:
- ✅ OAuth state parameter validates correctly
- ✅ No authorization code in browser history
- ✅ PKCE flow implemented
- ❌ Tokens exposed in URL → FAIL

---

### AUTH-004: Password Reset Flow

**Objective**: Validate password reset functionality

**Preconditions**: User account exists

**Test Steps**:
1. Navigate to `/auth/forgot-password`
2. Enter email: "testuser@geoleap.test"
3. Click "Send reset link"
4. Verify success message (generic, doesn't reveal if email exists)
5. Simulate clicking reset link from email
6. Navigate to `/auth/reset-password?token=TEST_TOKEN`
7. Enter new password: "NewSecure456!"
8. Confirm new password
9. Submit form
10. Attempt login with new password

**Expected Results**:
- ✅ Generic success message prevents email enumeration
- ✅ Reset token validates correctly
- ✅ New password meets strength requirements
- ✅ User can login with new password
- ✅ Old password no longer works

**Security Checks**:
- ✅ Rate limiting: Max 3 requests per 15 minutes per email
- ✅ Reset token expires after 1 hour
- ✅ Token single-use only
- ✅ Timing-resistant validation

---

### AUTH-005: Session Management & Logout

**Objective**: Validate session lifecycle and logout

**Preconditions**: User logged in

**Test Steps**:
1. Login as testuser@geoleap.test
2. Navigate to `/settings`
3. Click "View active sessions"
4. Verify current session appears in list
5. Click "Logout from all sessions"
6. Confirm action
7. Verify redirect to `/auth/login`
8. Attempt to access `/dashboard` without logging in

**Expected Results**:
- ✅ All sessions terminated
- ✅ User redirected to login page
- ✅ Cannot access protected routes
- ✅ Cookies cleared
- ✅ Refresh tokens revoked

**Security Checks**:
- ✅ Session tokens invalidated on logout
- ✅ Concurrent sessions displayed with device info
- ❌ Session tokens visible in logs → FAIL

---

### AUTH-006: Permission-Based Authorization

**Objective**: Validate role-based access control

**Preconditions**: Admin and regular user accounts exist

**Test Steps**:
1. Login as regular user (testuser@geoleap.test)
2. Attempt to navigate to `/admin/dashboard`
3. Take snapshot of forbidden error
4. Logout
5. Login as admin user (admin@geoleap.test)
6. Navigate to `/admin/dashboard`
7. Verify admin panel loads

**Expected Results**:
- ❌ Regular user receives 403 Forbidden
- ✅ Admin user accesses admin panel successfully
- ✅ Role-based access control enforced on backend

**Security Checks**:
- ✅ Authorization checked on backend (not just frontend hiding)
- ✅ Direct URL access blocked for unauthorized users
- ✅ No permission escalation possible
- ✅ Audit log records access attempts

---

### AUTH-007: Account Security Settings

**Objective**: Validate password change functionality

**Preconditions**: User logged in

**Test Steps**:
1. Navigate to `/account/security`
2. Click "Change password"
3. Enter current password: "Test123!"
4. Enter new password: "NewSecure789!"
5. Confirm new password
6. Submit form
7. Verify success message
8. Logout and login with new password

**Expected Results**:
- ✅ Password changed successfully
- ✅ User logged out from other sessions for security
- ✅ Can login with new password
- ❌ Old password still works → FAIL

**Security Checks**:
- ✅ Current password verification required
- ✅ Password strength meter displayed
- ❌ Common passwords accepted (test with "password123") → FAIL
- ✅ Password history enforced (cannot reuse last 5)

---

## 2. Search & Content Discovery (P0 - Critical)

### SEARCH-001: Basic Global Search

**Objective**: Validate content search with XSS/SQL injection protection

**Preconditions**: None (anonymous allowed)

**Test Steps**:
1. Navigate to `/search`
2. Click search input field
3. Type "Breaking Bad"
4. Press Enter or click search button
5. Take snapshot of search results
6. Verify "Breaking Bad" TV series appears in results

**Expected Results**:
- ✅ Search executes within 2 seconds
- ✅ Relevant results displayed with thumbnails
- ✅ Content type badges visible (TV, Movie)
- ✅ Pagination controls present
- ✅ Result count displayed

**Security Tests**:

**Test XSS Protection**:
1. Search for: `<script>alert('xss')</script>`
2. Verify: Script does not execute, HTML encoded in display

**Test SQL Injection**:
1. Search for: `' OR '1'='1`
2. Verify: No SQL errors, no data leakage, treated as literal string

**Test Input Sanitization**:
1. Search for: `<img src=x onerror=alert('xss')>`
2. Verify: HTML tags stripped, no script execution

**Test Rate Limiting** (Anonymous):
1. Perform 51 searches within 1 minute
2. Verify: 51st search blocked with HTTP 429 Too Many Requests

---

### SEARCH-002: Advanced Filtering

**Objective**: Validate multi-criteria filtering

**Preconditions**: On search results page

**Test Steps**:
1. Perform search for "action"
2. Click "Filters" button
3. Select genre: "Action"
4. Select streaming service: "Netflix"
5. Set minimum year: 2020
6. Set minimum rating: 7.0
7. Click "Apply Filters"
8. Take snapshot of filtered results

**Expected Results**:
- ✅ Results filtered according to all criteria
- ✅ Filter chips displayed above results
- ✅ Result count updates dynamically
- ✅ "Clear all filters" button appears
- ✅ URL parameters updated (shareable link)

**Security Checks**:
- ✅ Filter values validated on backend
- ❌ Invalid values accepted (year 3000) → FAIL
- ✅ No injection attacks via filter parameters

---

### SEARCH-003: Anonymous Search Limit

**Objective**: Validate free tier search restrictions

**Preconditions**: Not logged in, clear browser cookies

**Test Steps**:
1. Clear browser session/cookies
2. Perform 1st search - verify works
3. Perform 2nd search - verify works
4. Perform 3rd search - verify works
5. Perform 4th search
6. Take snapshot of paywall message

**Expected Results**:
- ✅ First 3 searches succeed
- ❌ 4th search succeeds (should be blocked) → FAIL
- ✅ Paywall displays: "Free search limit reached. Please sign up to continue."
- ✅ HTTP 403 Forbidden response
- ✅ Signup prompt with clear CTA

**Security Checks**:
- ✅ Session-based tracking (not easily bypassed)
- ✅ Limit enforced on backend
- ❌ Bypass via incognito windows → FAIL
- ✅ Logged-in users exempt from limit

---

### SEARCH-004: Search Autocomplete

**Objective**: Validate search suggestions

**Preconditions**: On search page

**Test Steps**:
1. Navigate to `/search`
2. Click search input
3. Type "bre" (partial query)
4. Wait for autocomplete dropdown
5. Take snapshot of suggestions
6. Click suggestion "Breaking Bad"
7. Verify search executes

**Expected Results**:
- ✅ Autocomplete appears after 2+ characters
- ✅ Suggestions relevant to partial query
- ✅ Suggestion includes content type icon
- ✅ Clicking suggestion performs search
- ✅ Keyboard navigation works (arrow keys, enter)

**Security Checks**:
- ✅ XSS protection in autocomplete display
- ✅ Debounced requests (not more than 1 per 300ms)
- ✅ Rate limiting on autocomplete endpoint
- ✅ No sensitive data leaked in suggestions

---

### SEARCH-005: Streaming Availability Check

**Objective**: Validate regional streaming availability

**Preconditions**: Search results displayed

**Test Steps**:
1. Search for "The Matrix"
2. Click on first result
3. Verify streaming options section displays
4. Check availability: "Available on Netflix (US)"
5. Take snapshot of availability section
6. Select different region: "United Kingdom"
7. Verify availability updates for UK
8. Click deep link to Netflix

**Expected Results**:
- ✅ Streaming services listed with logos
- ✅ Regional availability accurate
- ✅ Deep links to streaming platforms work
- ✅ Price information displayed if required
- ✅ "Not available in this region" message for restricted content

**Security Checks**:
- ✅ API keys not exposed in frontend
- ✅ External API responses validated
- ✅ Graceful fallback if external API fails
- ✅ No user PII sent to external APIs

---

### SEARCH-006: Search History (Authenticated)

**Objective**: Validate search history for logged-in users

**Preconditions**: User logged in, has search history

**Test Steps**:
1. Login as testuser@geoleap.test
2. Navigate to `/dashboard/history`
3. Take snapshot of search history
4. Click "Clear history" button
5. Confirm deletion
6. Verify history cleared
7. Perform new search
8. Verify appears in history

**Expected Results**:
- ✅ Search history displays past searches with timestamps
- ✅ Most recent searches shown first
- ✅ Clear history removes all entries
- ✅ Empty state message after clearing
- ✅ New searches added to history

**Security Checks**:
- ✅ User can only view own search history
- ✅ Authorization required for `/api/search/history`
- ✅ GDPR compliance: User can delete their data
- ✅ Audit log records history deletion

---

## 3. VPN Guidance System (P0 - PRIMARY FEATURE)

### VPN-001: VPN Provider Discovery

**Objective**: Validate VPN provider listing and filtering

**Preconditions**: None

**Test Steps**:
1. Navigate to `/vpn-guidance`
2. Take snapshot of VPN provider list
3. Verify 4 main providers displayed (NordVPN, ExpressVPN, Surfshark, CyberGhost)
4. Check ratings, pricing, features visible
5. Click "Featured Providers" filter
6. Verify filtered list updates

**Expected Results**:
- ✅ VPN providers listed with logos, names, ratings
- ✅ Pricing information displayed (monthly/annual)
- ✅ Feature comparison available
- ✅ Sorting options functional (price, rating, popularity)
- ✅ Provider details expandable

**Security Checks**:
- ✅ Affiliate links properly tracked
- ✅ No injection attacks via provider data
- ✅ Provider ratings cannot be manipulated by users
- ✅ Admin-only endpoints for provider management secured

---

### VPN-002: Content-Specific VPN Recommendations

**Objective**: Validate personalized VPN recommendations for specific content

**Preconditions**: Content selected

**Test Steps**:
1. Search for "Squid Game"
2. Click on result
3. Navigate to content detail page
4. Scroll to "VPN Recommendations" section
5. Take snapshot of VPN recommendations
6. Verify recommendations show countries where content available
7. Click "View Setup Guide" for recommended VPN

**Expected Results**:
- ✅ VPN recommendations specific to content
- ✅ Countries ranked by language match and availability
- ✅ Server locations highlighted
- ✅ Setup guides accessible
- ✅ Deep links to VPN providers work

**Security Checks**:
- ✅ Content ID validated (no arbitrary IDs)
- ✅ Recommendations based on real data
- ✅ External API calls authenticated
- ✅ No PII sent to VPN providers

---

### VPN-003: VPN Provider Comparison

**Objective**: Validate side-by-side VPN comparison

**Preconditions**: On VPN guidance page

**Test Steps**:
1. Navigate to `/vpn-guidance`
2. Select 3 VPN providers (checkboxes)
3. Click "Compare Selected" button
4. Take snapshot of comparison table
5. Verify side-by-side comparison displays

**Expected Results**:
- ✅ Comparison table shows features, pricing, ratings
- ✅ Differences highlighted
- ✅ "Choose Plan" buttons for each provider
- ✅ Export comparison as PDF option

**Security Checks**:
- ✅ Maximum 10 providers for comparison (DoS prevention)
- ✅ Provider IDs validated
- ✅ Comparison doesn't expose internal data
- ✅ Affiliate tracking secure

---

### VPN-004: VPN Best Practices & Legal Disclaimers

**Objective**: Validate informational content

**Preconditions**: None

**Test Steps**:
1. Navigate to `/vpn-guidance`
2. Scroll to "Best Practices" section
3. Click "View All Best Practices"
4. Take snapshot of best practices list
5. Scroll to "Legal Disclaimers"
6. Verify disclaimer displayed
7. Select country: "China"
8. Check region-specific legal information

**Expected Results**:
- ✅ Best practices categorized (Security, Privacy, Streaming)
- ✅ Importance level indicated (Critical, Important, Optional)
- ✅ Legal disclaimers present and accurate
- ✅ Region-specific legal information displayed

**Security Checks**:
- ✅ Disclaimers comply with legal requirements
- ✅ No misleading information
- ✅ Content cannot be edited by unauthorized users
- ✅ Audit trail for disclaimer updates

---

### VPN-005: User VPN Preferences

**Objective**: Validate preference persistence

**Preconditions**: User logged in

**Test Steps**:
1. Login as testuser@geoleap.test
2. Navigate to `/vpn-guidance`
3. Click "Save Preferences"
4. Select features: "Streaming", "P2P Support", "No Logs Policy"
5. Set budget: $10/month
6. Save preferences
7. Navigate away and return
8. Verify preferences persisted

**Expected Results**:
- ✅ Preferences saved successfully
- ✅ Future recommendations filtered by preferences
- ✅ Preferences persist across sessions
- ✅ Can update preferences anytime

**Security Checks**:
- ✅ User can only save own preferences
- ✅ Preference data validated on backend
- ✅ Authorization required
- ✅ No data leaked to other users

---

### VPN-006: VPN Provider Rating System

**Objective**: Validate rating submission and spam protection

**Preconditions**: User logged in

**Test Steps**:
1. Navigate to VPN provider detail page (NordVPN)
2. Scroll to "Rate This Provider" section
3. Select 4 stars
4. Enter review: "Great service, fast speeds"
5. Submit rating
6. Verify rating submitted
7. Attempt to rate same provider again
8. Verify duplicate prevention

**Expected Results**:
- ✅ Rating submitted and confirmed
- ✅ Review appears in review list
- ✅ Average rating recalculated
- ❌ Can rate same provider twice → FAIL

**Security Checks**:
- ✅ Rate limiting: Max 1 rating per provider per user
- ✅ Review content sanitized (XSS protection)
- ✅ Cannot manipulate ratings via API
- ✅ Spam/abuse detection

---

## 4. Subscription & Payment (P0 - Revenue Critical)

### PAY-001: View Subscription Plans

**Objective**: Validate pricing page display

**Preconditions**: None

**Test Steps**:
1. Navigate to `/pricing`
2. Take snapshot of pricing page
3. Verify plans displayed: Free, Premium Monthly, Premium Annual
4. Verify features listed for each plan
5. Click "View Full Features"
6. Verify feature comparison table

**Expected Results**:
- ✅ All plans visible with pricing
- ✅ Monthly and annual billing toggleable
- ✅ Feature comparison clear
- ✅ "Get Started" buttons present
- ✅ Free plan clearly marked

**Security Checks**:
- ✅ Pricing cannot be manipulated client-side
- ✅ Prices fetched from backend/Stripe
- ✅ No exposed API keys
- ✅ Plan IDs validated on backend

---

### PAY-002: Subscribe to Premium Plan

**Objective**: Validate subscription purchase flow

**Preconditions**: User logged in, no active subscription

**Test Steps**:
1. Navigate to `/pricing`
2. Click "Get Started" on Premium Monthly ($9.99/month)
3. Verify redirect to `/payment`
4. Enter Stripe test card: 4242 4242 4242 4242
5. Enter expiry: 12/28
6. Enter CVC: 123
7. Click "Subscribe Now"
8. Wait for processing
9. Take snapshot of success page
10. Navigate to `/dashboard/subscriptions`
11. Verify Premium subscription active

**Expected Results**:
- ✅ Payment processed successfully
- ✅ Subscription created in Stripe
- ✅ User upgraded to Premium tier immediately
- ✅ Premium features accessible
- ✅ Confirmation email sent

**Security Checks**:
- ✅ PCI compliance: Card details not stored on server
- ✅ Stripe.js used for tokenization
- ✅ Payment intent validated server-side
- ✅ Amount/currency validated on backend
- ✅ HTTPS enforced throughout

---

### PAY-003: Change Subscription Plan (Upgrade)

**Objective**: Validate plan upgrade with proration

**Preconditions**: User has Basic subscription

**Test Steps**:
1. Login as user with Basic plan
2. Navigate to `/dashboard/subscriptions`
3. Click "Upgrade Plan"
4. Select "Premium Annual" plan
5. Review prorated amount
6. Confirm upgrade
7. Take snapshot of updated subscription

**Expected Results**:
- ✅ Upgrade processed immediately
- ✅ Prorated charge calculated correctly
- ✅ Premium features activated
- ✅ Next billing date updated
- ✅ Invoice generated

**Security Checks**:
- ✅ Authorization validated
- ✅ Subscription ID verified
- ✅ Proration calculated server-side
- ✅ Cannot upgrade to invalid plan
- ✅ Audit log records change

---

### PAY-004: Cancel Subscription

**Objective**: Validate subscription cancellation

**Preconditions**: User has active subscription

**Test Steps**:
1. Navigate to `/dashboard/subscriptions`
2. Click "Cancel Subscription"
3. Select cancellation reason (optional)
4. Confirm cancellation
5. Verify cancellation scheduled
6. Take snapshot of confirmation

**Expected Results**:
- ✅ Subscription cancels at end of billing period (not immediately)
- ✅ Access continues until period end
- ✅ Cancellation date displayed
- ✅ "Reactivate" button appears
- ✅ Confirmation email sent

**Security Checks**:
- ✅ Authorization required
- ✅ Cancellation recorded in Stripe
- ❌ Can cancel twice → FAIL
- ✅ Audit trail
- ✅ Refund policy enforced

---

### PAY-005: Failed Payment Handling

**Objective**: Validate dunning process

**Preconditions**: User has subscription with expiring card

**Test Steps**:
1. Setup subscription with test card that will decline
2. Trigger billing cycle (simulate via admin or wait)
3. Verify grace period notification appears
4. Navigate to `/payment/recovery`
5. Update payment method with valid card (4242...)
6. Retry payment
7. Verify subscription reactivated

**Expected Results**:
- ✅ Grace period activated (7 days)
- ✅ User notified via email and in-app
- ✅ Subscription features continue during grace period
- ✅ Payment recovery flow clear
- ✅ Dunning emails sent (Day 1, 3, 5, 7)

**Security Checks**:
- ✅ Payment failure logged securely
- ✅ No card details in logs
- ✅ Recovery token validated
- ✅ Expired recovery links rejected

---

### PAY-006: Payment Method Management

**Objective**: Validate payment method CRUD

**Preconditions**: User logged in

**Test Steps**:
1. Navigate to `/dashboard/subscriptions`
2. Click "Payment Methods"
3. Click "Add Payment Method"
4. Enter card: 5555 5555 5555 4444 (Mastercard)
5. Save card
6. Set as default
7. Delete old card
8. Take snapshot

**Expected Results**:
- ✅ Multiple payment methods supported
- ✅ Default method marked clearly
- ✅ Can delete non-default methods
- ✅ Card last 4 digits displayed (not full number)
- ✅ Expiry date shown

**Security Checks**:
- ✅ Full card number never stored
- ✅ Stripe.js tokenization used
- ✅ Cannot view other users' methods
- ✅ Deletion removes from Stripe

---

### PAY-007: Invoice History

**Objective**: Validate invoice access and download

**Preconditions**: User has billing history

**Test Steps**:
1. Navigate to `/dashboard/subscriptions`
2. Click "View Invoices"
3. Take snapshot of invoice list
4. Click "Download PDF" on latest invoice
5. Verify PDF downloads
6. Open PDF and verify details

**Expected Results**:
- ✅ All invoices listed with dates, amounts
- ✅ Invoice statuses: Paid, Pending, Failed
- ✅ PDF downloads successfully
- ✅ Invoice includes: date, items, amount, tax, total
- ✅ Company/user details correct

**Security Checks**:
- ✅ User can only view own invoices
- ✅ Invoice IDs validated
- ✅ No invoice enumeration attacks
- ✅ Tax calculation correct

---

## 5. Watchlist Management (P1 - Important)

### WATCH-001: Create Watchlist

**Objective**: Validate watchlist creation

**Preconditions**: User logged in

**Test Steps**:
1. Navigate to `/watchlist`
2. Click "Create New Watchlist"
3. Enter name: "Action Movies 2024"
4. Enter description: "My favorite action films"
5. Select privacy: "Private"
6. Click "Create"
7. Take snapshot

**Expected Results**:
- ✅ Watchlist created successfully
- ✅ Appears in watchlist grid
- ✅ Empty state message (no items yet)
- ✅ "Add items" button present

**Security Checks**:
- ✅ Authorization required
- ✅ Name/description sanitized
- ✅ Privacy settings enforced
- ✅ User can only create own watchlists

---

### WATCH-002: Add Items to Watchlist

**Objective**: Validate adding content with duplicate prevention

**Preconditions**: User has a watchlist

**Test Steps**:
1. Search for "Inception"
2. Click result
3. Click "Add to Watchlist"
4. Select "Action Movies 2024"
5. Verify success message
6. Attempt to add same item again
7. Navigate to watchlist
8. Verify "Inception" appears

**Expected Results**:
- ✅ Item added successfully
- ✅ Item count increments
- ✅ Thumbnail and details displayed
- ❌ Can add same item twice → FAIL

**Security Checks**:
- ✅ Cannot add to other users' watchlists
- ✅ Content ID validated
- ✅ No injection attacks
- ✅ Rate limiting on add operations

---

### WATCH-003: Share Watchlist

**Objective**: Validate watchlist sharing with security

**Preconditions**: Watchlist with items exists

**Test Steps**:
1. Navigate to watchlist
2. Click "Share" button
3. Select "Generate Share Link"
4. Copy share link
5. Take snapshot of share modal
6. Open share link in incognito window
7. Verify watchlist visible (read-only)

**Expected Results**:
- ✅ Share link generated
- ✅ Link contains unique token
- ✅ Anonymous users can view via link
- ✅ Editing disabled for shared view
- ✅ Owner name displayed

**Security Checks**:
- ✅ Share token unpredictable (UUID)
- ✅ Cannot enumerate share tokens
- ✅ Share permissions respected (read-only)
- ✅ Can revoke share link
- ✅ Expired shares return 404

---

### WATCH-004: Watchlist Notifications

**Objective**: Validate notification settings

**Preconditions**: Watchlist with items exists

**Test Steps**:
1. Navigate to watchlist settings
2. Enable "Notify when content available"
3. Save settings
4. Navigate to `/settings/notifications`
5. Verify watchlist notifications enabled
6. Take snapshot

**Expected Results**:
- ✅ Notification setting saved
- ✅ Preferences persist
- ✅ Channels configurable (email, push, in-app)
- ✅ Frequency settings available (instant, daily digest)

**Security Checks**:
- ✅ Cannot enable for other users' watchlists
- ✅ Email addresses validated
- ✅ No spam (rate limiting)
- ✅ Unsubscribe link in emails

---

### WATCH-005: Bulk Actions

**Objective**: Validate bulk operations

**Preconditions**: Watchlist has 5+ items

**Test Steps**:
1. Navigate to watchlist
2. Enable "Select Mode"
3. Select 3 items
4. Click "Bulk Actions" dropdown
5. Select "Move to another watchlist"
6. Choose destination
7. Confirm
8. Verify items moved

**Expected Results**:
- ✅ Multiple items selected
- ✅ Bulk actions: Move, Delete, Mark as Watched
- ✅ Operation completes for all items
- ✅ Success message with count

**Security Checks**:
- ✅ Authorization validated
- ✅ Transaction safety (all or nothing)
- ✅ Rate limiting

---

### WATCH-006: Export Watchlist

**Objective**: Validate export functionality

**Preconditions**: Watchlist has items

**Test Steps**:
1. Navigate to watchlist
2. Click "Export"
3. Select format: "CSV"
4. Click "Download"
5. Verify file downloads
6. Open CSV and verify data

**Expected Results**:
- ✅ Export file generated
- ✅ Formats: CSV, JSON, PDF
- ✅ File contains all items with metadata
- ✅ Filename includes watchlist name and date

**Security Checks**:
- ✅ Authorization required
- ✅ Cannot export other users' watchlists
- ✅ No sensitive data in export
- ✅ Rate limiting (max 10 per hour)

---

## 6. User Preferences (P1 - Important)

### PREF-001: Streaming Services Preferences

### PREF-002: Content Preferences

### PREF-003: Language & Region Preferences

---

## 7. Admin Management (P1 - Important)

### ADMIN-001: User Management - View Users

### ADMIN-002: Suspend/Unsuspend User

### ADMIN-003: Role Assignment

### ADMIN-004: Audit Logs Review

### ADMIN-005: Admin Dashboard Metrics

### ADMIN-006: User Impersonation

---

## 8. Analytics & Reporting (P2 - Nice-to-Have)

### ANALYTICS-001: Search Analytics

### ANALYTICS-002: Subscription Analytics

---

## 9. SEO & Marketing (P2 - Nice-to-Have)

### SEO-001: Metadata Verification

### SEO-002: Programmatic SEO Pages

---

## 10. Cross-Cutting Security Tests

### SEC-001: XSS Prevention

**Test all input fields**:
- Login email: `<script>alert('xss')</script>`
- Search query: `<img src=x onerror=alert('xss')>`
- Watchlist name: `<svg onload=alert('xss')>`
- Profile bio: `<iframe src="javascript:alert('xss')">`

**Expected**: All inputs sanitized, scripts don't execute, HTML encoded/stripped

---

### SEC-002: SQL Injection Prevention

**Test all query parameters**:
- Search: `' OR '1'='1`
- User ID: `1; DROP TABLE users;--`
- Filter params: `' UNION SELECT * FROM passwords--`

**Expected**: Parameterized queries, no SQL errors, no data leakage

---

### SEC-003: CSRF Protection

**Test state-changing operations**:
- Create watchlist without CSRF token
- Change password without CSRF token
- Delete content without CSRF token

**Expected**: Operations blocked without valid CSRF token

---

### SEC-004: Rate Limiting

**Test all public endpoints**:
- Login: 10 requests in 1 minute → 429 after limit
- Search: 60 requests in 1 minute → 429 after limit
- API: Check Retry-After header

---

### SEC-005: HTTPS Enforcement

**Test mixed content**:
1. Access http://geoleap.app
2. Verify redirect to https://geoleap.app
3. Check HSTS header present
4. Verify no mixed content warnings

---

## Test Results Template

| Test ID | Test Name | Status | Duration | Bugs | Notes |
|---------|-----------|--------|----------|------|-------|
| AUTH-001 | Registration | ⏸️ | - | - | Not started |
| AUTH-002 | Login | ⏸️ | - | - | Not started |
| ... | ... | ... | ... | ... | ... |

**Bug Report Format**:
```
BUG-XXX: [Title]
Severity: Critical/High/Medium/Low
Steps to Reproduce:
1. ...
2. ...
Expected: ...
Actual: ...
Screenshots: [Attach]
Environment: Chrome 120, Windows 11
```

---

## Summary Statistics

- **Total Test Cases**: 80+
- **P0 (Critical)**: 26 test cases
- **P1 (Important)**: 15 test cases
- **P2 (Nice-to-Have)**: 4 test cases
- **Security Tests**: 35+ checks across all tests
- **Estimated Time**: 12-16 hours

**Critical Files Referenced**:
- Backend: `GeoLeap.Api/Controllers/AuthController.cs`, `SearchController.cs`, `VpnGuidanceController.cs`, `PaymentController.cs`
- Frontend: `frontend/src/app/auth/login/page.tsx`, `/search/page.tsx`, `/vpn-guidance/page.tsx`
- API Client: `frontend/src/lib/api.ts`
