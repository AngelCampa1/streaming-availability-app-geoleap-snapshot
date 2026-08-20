# User Story US-2.1: User Registration System

**Epic:** Authentication & User Management  
**Priority:** P0 (Must-Have)  
**Story Points:** 8  
**Sprint:** 3  

## User Story
**As a** new user  
**I want** to create an account using multiple authentication methods  
**So that** I can access personalized features and save my preferences

## Acceptance Criteria
- [x] User can register with email and password
- [x] User can register using Google OAuth
- [x] User can register using Apple OAuth
- [x] ~~Email verification is required for email/password registration~~ **REMOVED 2025-11-06: Auto-verify on registration**
- [x] Passwords must meet security requirements (length, complexity)
- [ ] User receives welcome email after successful registration
- [x] Duplicate email addresses are prevented with clear error messages
- [x] Registration form has proper validation and error handling
- [x] RBAC roles are automatically assigned upon registration

**BREAKING CHANGE (2025-11-06)**: Email verification requirement has been removed. Users are automatically verified upon registration (`EmailConfirmed = true`) for immediate access.

## Definition of Done
- [x] User can successfully create account via all three methods
- [x] ~~Email verification flow is functional and secure~~ **REMOVED 2025-11-06: Auto-verification implemented**
- [x] User data is securely stored in SQL Server Database
- [x] Registration analytics are being tracked in Application Insights
- [x] All registration attempts are logged with correlation IDs
- [x] Security requirements are met for password storage and OAuth integration
- [x] Error handling provides helpful guidance to users
- [x] Registration process is accessible and mobile-friendly

**COMPLETED**: Email verification has been removed in favor of immediate access. Password reset via email still functional.

## Technical Requirements

### Database Schema
```sql
-- Users table with RBAC integration
CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Email NVARCHAR(256) UNIQUE NOT NULL,
    EmailVerified BIT DEFAULT 0,
    PasswordHash NVARCHAR(MAX) NULL, -- NULL for OAuth-only users
    FirstName NVARCHAR(100),
    LastName NVARCHAR(100),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    LastLoginAt DATETIME2,
    IsActive BIT DEFAULT 1,
    -- OAuth Integration
    GoogleId NVARCHAR(100) NULL,
    AppleId NVARCHAR(100) NULL,
    -- Audit fields
    CreatedBy UNIQUEIDENTIFIER DEFAULT NEWID(),
    ModifiedAt DATETIME2 DEFAULT GETUTCDATE(),
    ModifiedBy UNIQUEIDENTIFIER
);

-- Email verification tokens (DEPRECATED - Removed 2025-11-06)
-- Table dropped in migration: 20251106170749_RemoveEmailVerification
-- Users are now auto-verified on registration (EmailConfirmed = true)
```

### Backend Implementation (.NET 9)
- **ASP.NET Identity** for user management and password hashing
- **OAuth integration** with Google and Apple using Microsoft.AspNetCore.Authentication
- **Email verification** with secure token generation and expiration
- **Input validation** with FluentValidation
- **RBAC integration** with automatic role assignment

### Frontend Implementation (Next.js/TypeScript)
- **Registration forms** with proper validation and UX
- **OAuth integration** with social login buttons
- ~~**Email verification** flow with user feedback~~ **REMOVED 2025-11-06**
- **Error handling** with user-friendly messages
- **Responsive design** for mobile and desktop

**NOTE**: `/auth/verify-email` page has been removed. Users login immediately after registration.

## Implementation Tasks

### Backend API Development
- [ ] Set up ASP.NET Identity with custom user model
- [ ] Configure password requirements and hashing (bcrypt/PBKDF2)
- [ ] Implement email/password registration endpoint
- [ ] Set up Google OAuth integration with proper scope and claims
- [ ] Set up Apple OAuth integration with Sign in with Apple
- [ ] Create email verification token generation and validation
- [ ] Implement email verification endpoint
- [ ] Add duplicate email prevention with proper error responses
- [ ] Integrate with RBAC system for automatic role assignment
- [ ] Set up email service for verification and welcome emails
- [ ] Add comprehensive logging for all registration events
- [ ] Implement rate limiting for registration endpoints

### Frontend Development
- [ ] Create registration form with email/password fields
- [ ] Add form validation with real-time feedback
- [ ] Implement Google OAuth login button and flow
- [ ] Implement Apple OAuth login button and flow
- [ ] Create email verification page and flow
- [ ] Add proper error handling and user feedback
- [ ] Implement loading states and progress indicators
- [ ] Create responsive design for mobile devices
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Implement client-side logging for user actions

### Email Integration
- [ ] Set up Azure Communication Services for email delivery
- [ ] Create email verification template with clear call-to-action
- [ ] Create welcome email template with onboarding guidance
- [ ] Implement email deliverability monitoring
- [ ] Add unsubscribe handling for marketing emails
- [ ] Configure SPF, DKIM, and DMARC records for email authentication

### Security Implementation
- [ ] Implement secure password requirements (minimum 8 chars, complexity)
- [ ] Add CSRF protection for registration forms
- [ ] Implement proper OAuth state validation
- [ ] Add rate limiting to prevent registration abuse
- [ ] Implement email verification token security (time-limited, single-use)
- [ ] Add input sanitization and validation
- [ ] Configure secure cookie settings for OAuth
- [ ] Implement audit logging for all registration events

## OAuth Configuration

### Google OAuth Setup
```csharp
services.AddAuthentication()
    .AddGoogle(options =>
    {
        options.ClientId = configuration["Authentication:Google:ClientId"];
        options.ClientSecret = configuration["Authentication:Google:ClientSecret"];
        options.Scope.Add("email");
        options.Scope.Add("profile");
        options.SaveTokens = true;
    });
```

### Apple OAuth Setup
```csharp
services.AddAuthentication()
    .AddApple(options =>
    {
        options.ClientId = configuration["Authentication:Apple:ClientId"];
        options.KeyId = configuration["Authentication:Apple:KeyId"];
        options.TeamId = configuration["Authentication:Apple:TeamId"];
        options.UsePrivateKey(keyId => 
            configuration["Authentication:Apple:PrivateKey"]);
    });
```

## Error Handling Patterns
- **Duplicate email:** "An account with this email already exists. Try signing in instead."
- **Invalid password:** "Password must be at least 8 characters with uppercase, lowercase, and numbers."
- **OAuth failures:** "Authentication failed. Please try again or use email registration."
- **Email verification:** "Please check your email and click the verification link to activate your account."

## Testing Strategy
- [ ] Unit tests for all registration logic and validation
- [ ] Integration tests for OAuth flow with mock providers
- [ ] End-to-end tests for complete registration workflows
- [ ] Security tests for SQL injection and XSS prevention
- [ ] Performance tests for registration under load
- [ ] Email delivery tests with test email services
- [ ] Accessibility testing for registration forms
- [ ] Mobile responsiveness testing across devices

## Security Considerations
- Password hashing with bcrypt and proper salt
- OAuth state parameter validation to prevent CSRF
- Email verification tokens are cryptographically secure and time-limited
- Rate limiting prevents automated registration abuse
- Input validation prevents injection attacks
- Secure storage of OAuth tokens and refresh tokens
- Audit logging for all registration events
- GDPR compliance for user data collection

## Performance Requirements
- Registration API response time: < 500ms
- OAuth callback processing: < 1 second
- Email verification token generation: < 100ms
- Database user creation: < 200ms
- Email delivery initiation: < 300ms

## Dependencies
- RBAC foundation system (US-1.2) for role assignment
- Logging infrastructure (US-1.3) for registration event tracking
- Azure infrastructure (US-1.5) for database and email services
- Error handling system (US-1.4) for graceful failure management

## Risks
- **OAuth provider outages:** Provide email/password as fallback
- **Email deliverability:** Monitor bounce rates and use reputable email service
- **Registration abuse:** Implement CAPTCHA and rate limiting
- **Privacy compliance:** Ensure GDPR and privacy law compliance

## Success Metrics
- **Registration success rate:** > 90% of attempts complete successfully
- **Email verification rate:** > 80% of users verify within 24 hours
- **OAuth vs email preference:** Track usage patterns for UX optimization
- **Registration abandonment:** < 15% abandon during process
- **Time to complete registration:** < 2 minutes average

## Resources
- ASP.NET Identity Documentation: https://docs.microsoft.com/en-us/aspnet/core/security/authentication/identity
- Google OAuth Setup: https://developers.google.com/identity/protocols/oauth2
- Apple Sign In: https://developer.apple.com/sign-in-with-apple/

## Estimation Notes
- 8 story points reflects complexity of multi-provider authentication
- Includes comprehensive security, testing, and email integration
- OAuth setup requires coordination with external provider configurations