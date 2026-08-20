# User Story US-2.2: User Authentication & Login

**Epic:** Authentication & User Management  
**Priority:** P0 (Must-Have)  
**Story Points:** 5  
**Sprint:** 3  

## User Story
**As a** returning user  
**I want** to log into my account securely  
**So that** I can access my saved data and personalized features

## Acceptance Criteria
- [ ] User can log in with email and password
- [ ] User can log in with Google OAuth
- [ ] User can log in with Apple OAuth
- [ ] Invalid credentials show appropriate error messages
- [ ] Account lockout after 5 failed attempts within 15 minutes
- [ ] "Remember me" functionality for extended sessions (30 days)
- [ ] Users are redirected to intended page after login
- [ ] Login state persists across browser sessions when remembered
- [ ] Session management integrates with RBAC system

## Definition of Done
- [ ] All login methods work reliably across browsers and devices
- [ ] Security measures prevent brute force attacks
- [ ] User session management is working correctly with JWT tokens
- [ ] Login analytics and security events are tracked
- [ ] Error handling provides clear user guidance
- [ ] Performance meets sub-second response time requirements
- [ ] Session security follows industry best practices
- [ ] Integration with RBAC provides correct user permissions

## Technical Requirements

### Authentication Flow
```csharp
// JWT Token Configuration
public class JwtSettings
{
    public string Secret { get; set; }
    public string Issuer { get; set; }
    public string Audience { get; set; }
    public int AccessTokenExpirationMinutes { get; set; } = 15;
    public int RefreshTokenExpirationDays { get; set; } = 7;
    public int RememberMeTokenExpirationDays { get; set; } = 30;
}
```

### Session Management
- **Access tokens:** 15-minute expiration for security
- **Refresh tokens:** 7-day expiration with rotation
- **Remember me tokens:** 30-day expiration
- **Session tracking:** Store active sessions with device info
- **Concurrent sessions:** Allow multiple sessions per user

## Implementation Tasks

### Backend Implementation
- [ ] Configure JWT authentication with proper token expiration
- [ ] Implement login endpoint with credential validation
- [ ] Add OAuth callback handlers for Google and Apple
- [ ] Create refresh token rotation system
- [ ] Implement account lockout mechanism with Redis
- [ ] Add "remember me" extended session handling
- [ ] Create session management endpoints
- [ ] Implement logout functionality with token blacklisting
- [ ] Add comprehensive security event logging
- [ ] Integrate with RBAC for role-based token claims

### Frontend Implementation
- [ ] Create login form with validation
- [ ] Implement OAuth login flows
- [ ] Add "remember me" checkbox functionality
- [ ] Create session state management (Context/Zustand)
- [ ] Implement automatic token refresh
- [ ] Add login loading and error states
- [ ] Create redirect functionality after login
- [ ] Implement logout functionality
- [ ] Add session expiration warnings
- [ ] Create mobile-responsive login interface

### Security Features
- [ ] Rate limiting: Max 5 login attempts per IP per minute
- [ ] Account lockout: 15-minute lockout after 5 failed attempts
- [ ] Login attempt logging with IP and user agent
- [ ] Suspicious activity detection and alerts
- [ ] Session fingerprinting for additional security
- [ ] Secure token storage (httpOnly cookies for web)

## Error Handling Patterns
- **Invalid credentials:** "Invalid email or password. Please try again."
- **Account locked:** "Account temporarily locked due to multiple failed attempts. Try again in 15 minutes."
- **OAuth failure:** "Authentication failed. Please try again or use email login."
- **Session expired:** "Your session has expired. Please log in again."
- **Network error:** "Connection error. Please check your internet and try again."

## Security Implementation
```csharp
// Account lockout service
public class AccountLockoutService
{
    private readonly IMemoryCache _cache;
    private const int MaxAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);
    
    public async Task<bool> IsLockedOutAsync(string email)
    {
        var key = $"lockout_{email}";
        return _cache.TryGetValue(key, out var lockoutInfo) && 
               ((LockoutInfo)lockoutInfo).IsLocked;
    }
}
```

## Session Management Database
```sql
CREATE TABLE UserSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    RefreshToken NVARCHAR(255) NOT NULL,
    DeviceInfo NVARCHAR(500),
    IpAddress NVARCHAR(45),
    UserAgent NVARCHAR(1000),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    LastAccessedAt DATETIME2 DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2 NOT NULL,
    IsActive BIT DEFAULT 1,
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);
```

## Testing Strategy
- [ ] Unit tests for authentication logic and token generation
- [ ] Integration tests for OAuth flows
- [ ] Security tests for brute force protection
- [ ] Session management tests
- [ ] Cross-browser compatibility tests
- [ ] Mobile responsiveness tests
- [ ] Performance tests under load
- [ ] Accessibility tests for login forms

## Performance Requirements
- Login API response: < 500ms
- Token validation: < 50ms
- OAuth callback: < 1 second
- Session refresh: < 200ms
- Logout processing: < 100ms

## Dependencies
- User Registration system (US-2.1)
- RBAC system (US-1.2) for role claims
- Logging system (US-1.3) for security events
- Azure infrastructure for Redis and database

## Success Metrics
- **Login success rate:** > 98%
- **Average login time:** < 2 seconds
- **Session security incidents:** 0 per month
- **User satisfaction:** > 4.5/5 for login experience
- **OAuth usage:** Track preferred login methods

## Resources
- JWT Best Practices: https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/
- OAuth 2.0 Security: https://tools.ietf.org/html/rfc6819

## Estimation Notes
- 5 story points for straightforward implementation building on registration
- Includes comprehensive security and session management