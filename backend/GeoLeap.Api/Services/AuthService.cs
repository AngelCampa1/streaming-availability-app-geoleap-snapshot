using System.Security.Claims;
using System.Security.Cryptography;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Hangfire;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GeoLeap.Api.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly ApplicationDbContext _context;
    private readonly IRbacService _rbacService;
    private readonly IEmailService _emailService;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ISessionService _sessionService;
    private readonly IAccountLockoutService _lockoutService;
    private readonly ISecurityService _securityService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AuthService> _logger;

    // Cache key prefix for user info
    private const string UserInfoCacheKeyPrefix = "UserInfo_";
    private static readonly TimeSpan UserInfoCacheExpiration = TimeSpan.FromSeconds(30);

    public AuthService(
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        ApplicationDbContext context,
        IRbacService rbacService,
        IEmailService emailService,
        IJwtTokenService jwtTokenService,
        ISessionService sessionService,
        IAccountLockoutService lockoutService,
        ISecurityService securityService,
        IMemoryCache cache,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
        _rbacService = rbacService;
        _emailService = emailService;
        _jwtTokenService = jwtTokenService;
        _sessionService = sessionService;
        _lockoutService = lockoutService;
        _securityService = securityService;
        _cache = cache;
        _logger = logger;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto, string? ipAddress = null, string? userAgent = null)
    {
        try
        {
            _logger.LogInformation("User registration attempt for email: {Email}", registerDto.Email);

            // Check if user already exists
            if (await _userManager.FindByEmailAsync(registerDto.Email) != null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "An account with this email already exists.",
                    Errors = new List<string> { "Email already in use" }
                };
            }

            // Create new user
            var user = new User
            {
                UserName = registerDto.Email,
                Email = registerDto.Email,
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                EmailConfirmed = true  // Auto-verify all users (email verification removed)
            };

            var result = await _userManager.CreateAsync(user, registerDto.Password);

            if (!result.Succeeded)
            {
                _logger.LogWarning("User registration failed for email: {Email}. Errors: {Errors}", 
                    registerDto.Email, string.Join(", ", result.Errors.Select(e => e.Description)));

                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Registration failed. Please check your information and try again.",
                    Errors = result.Errors.Select(e => e.Description).ToList()
                };
            }

            // Assign default role
            await AssignDefaultRoleAsync(user.Id);

            // Send welcome email after successful registration
            // FIXED: Week 1 Day 4 - Use Hangfire for reliable background job execution
            BackgroundJob.Enqueue(() => _emailService.SendWelcomeEmailAsync(user!.Email, user!.FirstName));

            // Log successful registration
            await _rbacService.LogAccessAttemptAsync(user!.Id, "auth", "register", true,
                "User registered successfully", ipAddress ?? "unknown", userAgent ?? "unknown");

            // Log security event for user registration
            await _securityService.LogSecurityEventAsync(user!.Id, "REGISTRATION_SUCCESS",
                ipAddress ?? "unknown", userAgent ?? "unknown",
                "User successfully registered and verified");

            _logger.LogInformation("User registered successfully: {UserId}", user!.Id);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Registration successful. You can now log in to your account.",
                User = new UserInfoDto
                {
                    Id = user!.Id,
                    Email = user!.Email,
                    FirstName = user!.FirstName,
                    LastName = user!.LastName,
                    EmailConfirmed = user!.EmailConfirmed,
                    CreatedAt = user!.CreatedAt
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user registration for email: {Email}", registerDto.Email);
            return new AuthResponseDto
            {
                Success = false,
                Message = "An error occurred during registration. Please try again.",
                Errors = new List<string> { "Internal server error" }
            };
        }
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto, string? ipAddress = null, string? userAgent = null, string? deviceInfo = null)
    {
        try
        {
            // Check account lockout first
            if (await _lockoutService.IsLockedOutAsync(loginDto.Email))
            {
                var lockoutEnd = await _lockoutService.GetLockoutEndAsync(loginDto.Email);
                return new AuthResponseDto
                {
                    Success = false,
                    Message = $"Account is locked due to multiple failed attempts. Please try again after {lockoutEnd:HH:mm} UTC.",
                    Errors = new List<string> { "Account locked" }
                };
            }

            var user = await _userManager.FindByEmailAsync(loginDto.Email);
            _logger.LogInformation("Login attempt for email: {Email}, User found: {UserFound}, IsActive: {IsActive}",
                loginDto.Email, user != null, user?.IsActive ?? false);

            if (user == null || !user!.IsActive)
            {
                await _lockoutService.RecordFailedAttemptAsync(loginDto.Email);
                await LogFailedLoginAttempt(loginDto.Email, "User not found or inactive", ipAddress, userAgent);
                _logger.LogWarning("Login failed - user not found or inactive: {Email}", loginDto.Email);
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid email or password.",
                    Errors = new List<string> { "Authentication failed" }
                };
            }

            // Verify password without using SignInManager (to avoid cookie authentication)
            var passwordValid = await _userManager.CheckPasswordAsync(user, loginDto.Password);
            _logger.LogInformation("Password check result for {Email}: {PasswordValid}", loginDto.Email, passwordValid);

            if (!passwordValid)
            {
                await _lockoutService.RecordFailedAttemptAsync(loginDto.Email);
                await LogFailedLoginAttempt(loginDto.Email, "Invalid password", ipAddress, userAgent);
                _logger.LogWarning("Login failed - invalid password: {Email}", loginDto.Email);
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid email or password.",
                    Errors = new List<string> { "Authentication failed" }
                };
            }

            // Email verification removed - all users auto-verified on registration

            // Clear failed attempts on successful login
            await _lockoutService.ClearFailedAttemptsAsync(loginDto.Email);

            // Generate JWT tokens
            IList<string> roles;
            try
            {
                roles = await _userManager.GetRolesAsync(user!);
            }
            catch (NotSupportedException)
            {
                // If role store is not implemented, default to empty roles
                _logger.LogWarning("Role store not implemented, defaulting to no roles for user {Email}", user!.Email);
                roles = new List<string>();
            }

            var claims = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user!.Id.ToString()),
                new Claim(ClaimTypes.Email, user!.Email ?? ""),
                new Claim(ClaimTypes.Name, $"{user!.FirstName} {user!.LastName}"),
                new Claim("sub", user!.Id.ToString())
            });

            // Add role claims
            foreach (var role in roles)
            {
                claims.AddClaim(new Claim(ClaimTypes.Role, role));
            }

            var accessToken = _jwtTokenService.GenerateAccessToken(claims, loginDto.RememberMe);
            var refreshToken = _jwtTokenService.GenerateRefreshToken();

            // Create session
            var session = await _sessionService.CreateSessionAsync(
                user!.Id, refreshToken, deviceInfo, ipAddress, userAgent, loginDto.RememberMe);

            // Update last login
            user!.LastLoginAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user!);

            await _rbacService.LogAccessAttemptAsync(user!.Id, "auth", "login", true,
                "User logged in successfully", ipAddress ?? "unknown", userAgent ?? "unknown");

            // Log security event for successful login
            await _securityService.LogSecurityEventAsync(user!.Id, "LOGIN_SUCCESS",
                ipAddress ?? "unknown", userAgent ?? "unknown",
                $"User successfully logged in from {deviceInfo ?? "unknown device"}");

            _logger.LogInformation("User logged in successfully: {UserId}", user!.Id);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Login successful.",
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                TokenExpiration = _jwtTokenService.GetTokenExpiration(accessToken),
                User = new UserInfoDto
                {
                    Id = user!.Id,
                    Email = user!.Email,
                    FirstName = user!.FirstName,
                    LastName = user!.LastName,
                    EmailConfirmed = user!.EmailConfirmed,
                    CreatedAt = user!.CreatedAt,
                    Roles = roles.ToList()
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for email: {Email}", loginDto.Email);
            return new AuthResponseDto
            {
                Success = false,
                Message = "An error occurred during login. Please try again.",
                Errors = new List<string> { "Internal server error" }
            };
        }
    }



    public async Task<AuthResponseDto> ExternalLoginAsync(string provider, string providerUserId, 
        string email, string firstName, string lastName, string? ipAddress = null, string? userAgent = null, string? deviceInfo = null)
    {
        try
        {
            // Check if user exists with this email
            var user = await _userManager.FindByEmailAsync(email);
            
            if (user == null)
            {
                // Create new user for external login
                user = new User
                {
                    UserName = email,
                    Email = email,
                    FirstName = firstName,
                    LastName = lastName,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true,
                    EmailConfirmed = true // External providers verify email
                };

                if (provider.ToLower() == "google")
                    user.GoogleId = providerUserId;
                else if (provider.ToLower() == "apple")
                    user.AppleId = providerUserId;

                var result = await _userManager.CreateAsync(user);
                if (!result.Succeeded)
                {
                    return new AuthResponseDto
                    {
                        Success = false,
                        Message = "Failed to create account.",
                        Errors = result.Errors.Select(e => e.Description).ToList()
                    };
                }

                await AssignDefaultRoleAsync(user.Id);
            }
            else
            {
                // Update OAuth ID if not set
                if (provider.ToLower() == "google" && string.IsNullOrEmpty(user.GoogleId))
                {
                    user.GoogleId = providerUserId;
                    await _userManager.UpdateAsync(user);
                }
                else if (provider.ToLower() == "apple" && string.IsNullOrEmpty(user.AppleId))
                {
                    user.AppleId = providerUserId;
                    await _userManager.UpdateAsync(user);
                }
            }

            // Generate JWT tokens instead of signing in with cookies
            user!.LastLoginAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user!);

            var roles = await _userManager.GetRolesAsync(user!);
            var claims = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user!.Id.ToString()),
                new Claim(ClaimTypes.Email, user!.Email ?? ""),
                new Claim(ClaimTypes.Name, $"{user!.FirstName} {user!.LastName}"),
                new Claim("sub", user!.Id.ToString())
            });

            foreach (var role in roles)
            {
                claims.AddClaim(new Claim(ClaimTypes.Role, role));
            }

            var accessToken = _jwtTokenService.GenerateAccessToken(claims);
            var refreshToken = _jwtTokenService.GenerateRefreshToken();

            // Create session
            var session = await _sessionService.CreateSessionAsync(
                user!.Id, refreshToken, deviceInfo, ipAddress, userAgent);

            await _rbacService.LogAccessAttemptAsync(user!.Id, "auth", $"{provider}-login", true,
                $"User logged in via {provider}", ipAddress ?? "unknown", userAgent ?? "unknown");

            return new AuthResponseDto
            {
                Success = true,
                Message = $"Successfully authenticated with {provider}.",
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                TokenExpiration = _jwtTokenService.GetTokenExpiration(accessToken),
                User = new UserInfoDto
                {
                    Id = user!.Id,
                    Email = user!.Email,
                    FirstName = user!.FirstName,
                    LastName = user!.LastName,
                    EmailConfirmed = user!.EmailConfirmed,
                    CreatedAt = user!.CreatedAt,
                    Roles = roles.ToList()
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during {Provider} login for email: {Email}", provider, email);
            return new AuthResponseDto
            {
                Success = false,
                Message = $"An error occurred during {provider} authentication.",
                Errors = new List<string> { "External authentication failed" }
            };
        }
    }

    public async Task<UserInfoDto?> GetUserInfoAsync(Guid userId)
    {
        try
        {
            // Try to get from cache first for faster response
            var cacheKey = $"{UserInfoCacheKeyPrefix}{userId}";
            if (_cache.TryGetValue(cacheKey, out UserInfoDto? cachedUserInfo))
            {
                return cachedUserInfo;
            }

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return null;
            }

            var roles = await _userManager.GetRolesAsync(user!);

            var userInfo = new UserInfoDto
            {
                Id = user!.Id,
                Email = user!.Email,
                FirstName = user!.FirstName,
                LastName = user!.LastName,
                EmailConfirmed = user!.EmailConfirmed,
                CreatedAt = user!.CreatedAt,
                Roles = roles.ToList()
            };

            // Cache the user info for 30 seconds to reduce DB calls
            _cache.Set(cacheKey, userInfo, UserInfoCacheExpiration);

            return userInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user info for user: {UserId}", userId);
            return null;
        }
    }

    public async Task<TokenResponseDto?> RefreshTokenAsync(string refreshToken, string? ipAddress = null, string? userAgent = null)
    {
        try
        {
            var session = await _sessionService.GetSessionByRefreshTokenAsync(refreshToken);
            if (session == null || !session.IsActive || session.ExpiresAt <= DateTime.UtcNow)
            {
                _logger.LogWarning("Invalid or expired refresh token");
                return null;
            }

            var user = session.User;
            if (user == null || !user.IsActive)
            {
                _logger.LogWarning("User not found or inactive for refresh token");
                await _sessionService.RevokeSessionAsync(refreshToken);
                return null;
            }

            // Generate new tokens
            var roles = await _userManager.GetRolesAsync(user!);
            var claims = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user!.Id.ToString()),
                new Claim(ClaimTypes.Email, user!.Email ?? ""),
                new Claim(ClaimTypes.Name, $"{user!.FirstName} {user!.LastName}"),
                new Claim("sub", user!.Id.ToString())
            });

            foreach (var role in roles)
            {
                claims.AddClaim(new Claim(ClaimTypes.Role, role));
            }

            var newAccessToken = _jwtTokenService.GenerateAccessToken(claims);
            var newRefreshToken = _jwtTokenService.GenerateRefreshToken();

            // Update session with new refresh token
            await _sessionService.RefreshSessionAsync(refreshToken, newRefreshToken);

            await _rbacService.LogAccessAttemptAsync(user!.Id, "auth", "refresh-token", true,
                "Token refreshed successfully", ipAddress ?? "unknown", userAgent ?? "unknown");

            _logger.LogInformation("Token refreshed successfully for user: {UserId}", user!.Id);

            return new TokenResponseDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                TokenExpiration = _jwtTokenService.GetTokenExpiration(newAccessToken)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token");
            return null;
        }
    }

    public async Task<bool> LogoutAsync(string? refreshToken = null)
    {
        try
        {
            if (!string.IsNullOrEmpty(refreshToken))
            {
                await _sessionService.RevokeSessionAsync(refreshToken);
                _logger.LogInformation("User session revoked via refresh token");
            }
            
            await _signInManager.SignOutAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout");
            return false;
        }
    }

    public async Task<bool> LogoutAllSessionsAsync(Guid userId)
    {
        try
        {
            await _sessionService.RevokeAllUserSessionsAsync(userId);
            
            await _rbacService.LogAccessAttemptAsync(userId, "auth", "logout-all", true,
                "All user sessions revoked", "system", "system");
                
            _logger.LogInformation("All sessions revoked for user: {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking all sessions for user: {UserId}", userId);
            return false;
        }
    }

    private async Task AssignDefaultRoleAsync(Guid userId)
    {
        try
        {
            // Assign default "User" role
            await _rbacService.AssignRoleAsync(userId, "User");
            _logger.LogInformation("Default role assigned to user: {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to assign default role to user: {UserId}", userId);
        }
    }


    private async Task LogFailedLoginAttempt(string email, string reason, string? ipAddress, string? userAgent)
    {
        try
        {
            var user = await _userManager.FindByEmailAsync(email);
            var userId = user?.Id ?? Guid.Empty;

            await _rbacService.LogAccessAttemptAsync(userId, "auth", "login", false,
                $"Login failed: {reason}", ipAddress ?? "unknown", userAgent ?? "unknown");

            // Log security event for failed login if user exists
            if (user != null)
            {
                await _securityService.LogSecurityEventAsync(user!.Id, "LOGIN_FAILED",
                    ipAddress ?? "unknown", userAgent ?? "unknown",
                    $"Login attempt failed: {reason}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging failed login attempt for email: {Email}", email);
        }
    }

    private static string GetLoginFailureMessage(SignInResult result)
    {
        if (result.IsLockedOut)
            return "Account is locked due to multiple failed attempts. Please try again later.";

        // Email verification removed 2025-11-06 - IsNotAllowed now indicates other restrictions
        if (result.IsNotAllowed)
            return "Account access is restricted. Please contact support.";

        if (result.RequiresTwoFactor)
            return "Two-factor authentication is required.";

        return "Invalid email or password.";
    }

    public async Task<bool> UpdateUserProfileAsync(Guid userId, UpdateProfileDto updateProfileDto)
    {
        try
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return false;
            }

            var hasChanges = false;

            if (!string.IsNullOrEmpty(updateProfileDto.FirstName) && updateProfileDto.FirstName != user!.FirstName)
            {
                user!.FirstName = updateProfileDto.FirstName;
                hasChanges = true;
            }

            if (!string.IsNullOrEmpty(updateProfileDto.LastName) && updateProfileDto.LastName != user!.LastName)
            {
                user!.LastName = updateProfileDto.LastName;
                hasChanges = true;
            }

            if (!string.IsNullOrEmpty(updateProfileDto.Email) && updateProfileDto.Email != user!.Email)
            {
                user!.Email = updateProfileDto.Email;
                user!.NormalizedEmail = updateProfileDto.Email.ToUpperInvariant();
                // Email verification removed - email changes no longer require re-verification
                hasChanges = true;
            }

            if (!string.IsNullOrEmpty(updateProfileDto.UserName) && updateProfileDto.UserName != user!.UserName)
            {
                user!.UserName = updateProfileDto.UserName;
                user!.NormalizedUserName = updateProfileDto.UserName.ToUpperInvariant();
                hasChanges = true;
            }

            if (hasChanges)
            {
                var result = await _userManager.UpdateAsync(user!);
                
                if (result.Succeeded)
                {
                    _logger.LogInformation("User profile updated successfully for UserId: {UserId}", userId);
                    return true;
                }
                else
                {
                    _logger.LogWarning("Failed to update user profile for UserId: {UserId}. Errors: {Errors}", 
                        userId, string.Join(", ", result.Errors.Select(e => e.Description)));
                    return false;
                }
            }

            return true; // No changes needed
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user profile for UserId: {UserId}", userId);
            return false;
        }
    }
}