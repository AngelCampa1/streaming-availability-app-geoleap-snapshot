using System.ComponentModel.DataAnnotations;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Middleware;
using GeoLeap.Api.Extensions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IPasswordResetService _passwordResetService;
    private readonly IPasswordValidationService _passwordValidationService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthService authService, 
        IPasswordResetService passwordResetService,
        IPasswordValidationService passwordValidationService,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _passwordResetService = passwordResetService;
        _passwordValidationService = passwordValidationService;
        _logger = logger;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponseDto
            {
                Success = false,
                Message = "Invalid registration data.",
                Errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList()
            });
        }

        try
        {
            var ipAddress = GetClientIpAddress();
            var userAgent = GetUserAgent();

            var result = await _authService.RegisterAsync(registerDto, ipAddress, userAgent);

            if (result.Success)
            {
                // Registration doesn't generate tokens - user must login after registration
                // Just return success response
                return Ok(new AuthResponseDto
                {
                    Success = true,
                    Message = result.Message,
                    User = result.User,
                    AccessToken = null,
                    RefreshToken = null,
                    Errors = result.Errors
                });
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Registration failed for email {Email}", registerDto.Email);
            return StatusCode(500, new AuthResponseDto
            {
                Success = false,
                Message = "An unexpected error occurred during registration. Please try again.",
                Errors = new List<string> { "Internal server error" }
            });
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponseDto
            {
                Success = false,
                Message = "Invalid login data.",
                Errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList()
            });
        }

        try
        {
            var ipAddress = GetClientIpAddress();
            var userAgent = GetUserAgent();
            var deviceInfo = GetDeviceInfo();

            var result = await _authService.LoginAsync(loginDto, ipAddress, userAgent, deviceInfo);

            if (result.Success)
            {
                // Check if client prefers cookie-based auth (web) or header-based auth (mobile)
                var useCookies = Request.Headers["X-Auth-Mode"].FirstOrDefault() == "cookie" ||
                               !Request.Headers.UserAgent.ToString().Contains("Mobile");

                if (useCookies)
                {
                    // Store tokens in secure, httpOnly cookies to prevent XSS attacks
                    // Use SameSite=None for cross-domain cookie support (geoleap.app -> api.geoleap.app)
                    var cookieDomain = GetCookieDomain();
                    Response.Cookies.Append("access_token", result.AccessToken ?? "", new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = true, // Only send over HTTPS
                        SameSite = SameSiteMode.None, // Required for cross-domain cookies
                        Domain = cookieDomain, // Share cookie across subdomains
                        MaxAge = TimeSpan.FromMinutes(15)
                    });

                    Response.Cookies.Append("refresh_token", result.RefreshToken ?? "", new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = true,
                        SameSite = SameSiteMode.None, // Required for cross-domain cookies
                        Domain = cookieDomain, // Share cookie across subdomains
                        MaxAge = TimeSpan.FromDays(7)
                    });

                    // Return success without tokens in response body
                    return Ok(new AuthResponseDto
                    {
                        Success = true,
                        Message = result.Message,
                        User = result.User,
                        // Tokens not included - stored in httpOnly cookies
                        AccessToken = null,
                        RefreshToken = null,
                        Errors = result.Errors
                    });
                }

                // Mobile/API clients get tokens in response body for Authorization header
                return Ok(result);
            }

            return Unauthorized(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Login failed for email {Email}", loginDto.Email);
            return StatusCode(500, new AuthResponseDto
            {
                Success = false,
                Message = "An unexpected error occurred during login. Please try again.",
                Errors = new List<string> { "Internal server error" }
            });
        }
    }



    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<ActionResult<TokenResponseDto>> RefreshToken([FromBody] RefreshTokenDto? refreshTokenDto = null)
    {
        // Get refresh token from cookie if not in request body
        var refreshToken = refreshTokenDto?.RefreshToken ?? Request.Cookies["refresh_token"];

        if (string.IsNullOrEmpty(refreshToken))
        {
            var correlationId = HttpContext.TraceIdentifier;
            var errorResponse = ErrorResponseFactory.CreateBadRequestError(
                correlationId,
                Request.Path,
                "Refresh token is required.",
                correlationId);
            return BadRequest(errorResponse);
        }

        var ipAddress = GetClientIpAddress();
        var userAgent = GetUserAgent();

        var result = await _authService.RefreshTokenAsync(refreshToken, ipAddress, userAgent);

        if (result == null)
        {
            var correlationId = HttpContext.TraceIdentifier;
            var errorResponse = ErrorResponseFactory.CreateAuthenticationError(
                correlationId,
                Request.Path,
                "Invalid or expired refresh token.",
                correlationId);
            return Unauthorized(errorResponse);
        }

        // Check if client prefers cookie-based auth
        var useCookies = Request.Headers["X-Auth-Mode"].FirstOrDefault() == "cookie" ||
                       Request.Cookies.ContainsKey("access_token");

        if (useCookies)
        {
            // Update tokens in cookies
            // Use SameSite=None for cross-domain cookie support (geoleap.app -> api.geoleap.app)
            var cookieDomain = GetCookieDomain();
            Response.Cookies.Append("access_token", result.AccessToken ?? "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None, // Required for cross-domain cookies
                Domain = cookieDomain, // Share cookie across subdomains
                MaxAge = TimeSpan.FromMinutes(15)
            });

            Response.Cookies.Append("refresh_token", result.RefreshToken ?? "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None, // Required for cross-domain cookies
                Domain = cookieDomain, // Share cookie across subdomains
                MaxAge = TimeSpan.FromDays(7)
            });

            // Return success without tokens in response body
            return Ok(new TokenResponseDto
            {
                AccessToken = string.Empty,
                RefreshToken = string.Empty
            });
        }

        return Ok(result);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<ActionResult> Logout([FromBody] RefreshTokenDto? refreshTokenDto = null)
    {
        // Get refresh token from cookie if not in request body
        var refreshToken = refreshTokenDto?.RefreshToken ?? Request.Cookies["refresh_token"];
        var success = await _authService.LogoutAsync(refreshToken);

        // Clear cookies if they exist - must use same domain/path options used when setting
        var cookieDomain = GetCookieDomain();
        var deleteOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Domain = cookieDomain
        };

        if (Request.Cookies.ContainsKey("access_token"))
        {
            Response.Cookies.Delete("access_token", deleteOptions);
        }
        if (Request.Cookies.ContainsKey("refresh_token"))
        {
            Response.Cookies.Delete("refresh_token", deleteOptions);
        }

        if (success)
        {
            return Ok(new { message = "Logged out successfully." });
        }

        return this.StandardBadRequest("Logout failed.");
    }

    [HttpPost("logout-all")]
    [Authorize]
    public async Task<ActionResult> LogoutAllSessions()
    {
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            var correlationId = HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }

        var success = await _authService.LogoutAllSessionsAsync(userGuid);
        
        if (success)
        {
            return Ok(new { message = "All sessions logged out successfully." });
        }
        
        return this.StandardBadRequest("Failed to logout all sessions.");
    }

    [HttpGet("google")]
    [AllowAnonymous]
    public IActionResult GoogleLogin()
    {
        var redirectUrl = Url.Action("GoogleCallback", "Auth");
        var properties = new Microsoft.AspNetCore.Authentication.AuthenticationProperties 
        { 
            RedirectUri = redirectUrl 
        };
        return Challenge(properties, "Google");
    }

    [HttpGet("google-callback")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleCallback()
    {
        var result = await HttpContext.AuthenticateAsync("Google");
        
        if (!result.Succeeded)
        {
            var errorUrl = $"{GetFrontendUrl()}/auth/callback?error=google_authentication_failed";
            return Redirect(errorUrl);
        }

        var email = result.Principal?.FindFirst("email")?.Value ?? "";
        var firstName = result.Principal?.FindFirst("given_name")?.Value ?? "";
        var lastName = result.Principal?.FindFirst("family_name")?.Value ?? "";
        var googleId = result.Principal?.FindFirst("sub")?.Value ?? "";

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(googleId))
        {
            var errorUrl = $"{GetFrontendUrl()}/auth/callback?error=insufficient_user_information";
            return Redirect(errorUrl);
        }

        var ipAddress = GetClientIpAddress();
        var userAgent = GetUserAgent();
        var deviceInfo = GetDeviceInfo();

        var authResult = await _authService.ExternalLoginAsync("Google", googleId, email, firstName, lastName, ipAddress, userAgent, deviceInfo);

        if (authResult.Success)
        {
            // SECURITY FIX: Use httpOnly cookies instead of URL parameters for tokens
            // Store tokens in secure, httpOnly cookies to prevent XSS attacks
            // Use SameSite=None for cross-domain cookie support (geoleap.app -> api.geoleap.app)
            var cookieDomain = GetCookieDomain();
            Response.Cookies.Append("access_token", authResult.AccessToken ?? "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // Only send over HTTPS
                SameSite = SameSiteMode.None, // Required for cross-domain cookies
                Domain = cookieDomain, // Share cookie across subdomains
                MaxAge = TimeSpan.FromMinutes(15)
            });

            Response.Cookies.Append("refresh_token", authResult.RefreshToken ?? "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None, // Required for cross-domain cookies
                Domain = cookieDomain, // Share cookie across subdomains
                MaxAge = TimeSpan.FromDays(7)
            });

            var successUrl = $"{GetFrontendUrl()}/auth/callback?success=true";
            return Redirect(successUrl);
        }

        var failureUrl = $"{GetFrontendUrl()}/auth/callback?error=authentication_failed";
        return Redirect(failureUrl);
    }

    [HttpGet("apple")]
    [AllowAnonymous]
    public IActionResult AppleLogin()
    {
        var redirectUrl = Url.Action("AppleCallback", "Auth");
        var properties = new Microsoft.AspNetCore.Authentication.AuthenticationProperties 
        { 
            RedirectUri = redirectUrl 
        };
        return Challenge(properties, "Apple");
    }

    [HttpGet("apple-callback")]
    [AllowAnonymous]
    public async Task<IActionResult> AppleCallback()
    {
        var result = await HttpContext.AuthenticateAsync("Apple");
        
        if (!result.Succeeded)
        {
            var errorUrl = $"{GetFrontendUrl()}/auth/callback?error=apple_authentication_failed";
            return Redirect(errorUrl);
        }

        var email = result.Principal?.FindFirst("email")?.Value ?? "";
        var firstName = result.Principal?.FindFirst("given_name")?.Value ?? "";
        var lastName = result.Principal?.FindFirst("family_name")?.Value ?? "";
        var appleId = result.Principal?.FindFirst("sub")?.Value ?? "";

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(appleId))
        {
            var errorUrl = $"{GetFrontendUrl()}/auth/callback?error=insufficient_user_information";
            return Redirect(errorUrl);
        }

        var ipAddress = GetClientIpAddress();
        var userAgent = GetUserAgent();
        var deviceInfo = GetDeviceInfo();

        var authResult = await _authService.ExternalLoginAsync("Apple", appleId, email, firstName, lastName, ipAddress, userAgent, deviceInfo);

        if (authResult.Success)
        {
            // SECURITY FIX: Use httpOnly cookies instead of URL parameters for tokens
            // Store tokens in secure, httpOnly cookies to prevent XSS attacks
            // Use SameSite=None for cross-domain cookie support (geoleap.app -> api.geoleap.app)
            var cookieDomain = GetCookieDomain();
            Response.Cookies.Append("access_token", authResult.AccessToken ?? "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // Only send over HTTPS
                SameSite = SameSiteMode.None, // Required for cross-domain cookies
                Domain = cookieDomain, // Share cookie across subdomains
                MaxAge = TimeSpan.FromMinutes(15)
            });

            Response.Cookies.Append("refresh_token", authResult.RefreshToken ?? "", new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None, // Required for cross-domain cookies
                Domain = cookieDomain, // Share cookie across subdomains
                MaxAge = TimeSpan.FromDays(7)
            });

            var successUrl = $"{GetFrontendUrl()}/auth/callback?success=true";
            return Redirect(successUrl);
        }

        var failureUrl = $"{GetFrontendUrl()}/auth/callback?error=authentication_failed";
        return Redirect(failureUrl);
    }

    [HttpGet("me")]
    [Authorize]
    [ResponseCache(Duration = 30, Location = ResponseCacheLocation.Client, VaryByHeader = "Authorization")]
    public async Task<ActionResult<UserInfoDto>> GetCurrentUser()
    {
        var correlationId = HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }

        var userInfo = await _authService.GetUserInfoAsync(userGuid);
        if (userInfo == null)
        {
            return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "User", userId ?? "unknown", correlationId));
        }

        return Ok(userInfo);
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<UserInfoDto>> GetProfile()
    {
        var correlationId = HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }

        var userInfo = await _authService.GetUserInfoAsync(userGuid);
        if (userInfo == null)
        {
            return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "User", userId ?? "unknown", correlationId));
        }

        return Ok(userInfo);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult> UpdateProfile([FromBody] UpdateProfileDto updateProfileDto)
    {
        var correlationId = HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;

        if (!ModelState.IsValid)
        {
            var validationErrors = ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
            return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
        }

        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }

        var success = await _authService.UpdateUserProfileAsync(userGuid, updateProfileDto);
        if (success)
        {
            return Ok(new { message = "Profile updated successfully." });
        }

        return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Failed to update profile.", correlationId));
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return this.StandardBadRequest("Invalid request data.");
        }

        // Check rate limiting BEFORE processing request
        var canRequest = await _passwordResetService.CanRequestPasswordResetAsync(request.Email);
        if (!canRequest)
        {
            return StatusCode(429, new { message = "Too many password reset requests. Please try again later." });
        }

        var correlationId = HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString();
        var success = await _passwordResetService.InitiatePasswordResetAsync(request.Email, correlationId);

        // Always return success to prevent email enumeration
        return Ok(new { message = "If an account with that email exists, you will receive a password reset email shortly." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return this.StandardBadRequest("Invalid request data.");
        }

        var correlationId = HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString();

        // Validate token first
        var isValidToken = await _passwordResetService.ValidateResetTokenAsync(request.Token);
        if (!isValidToken)
        {
            return this.StandardBadRequest("Invalid or expired reset token.");
        }

        // Validate password strength
        var passwordValidation = _passwordValidationService.ValidatePassword(request.NewPassword);
        if (!passwordValidation.IsValid)
        {
            return this.StandardBadRequest("Password does not meet requirements.");
        }

        var success = await _passwordResetService.ResetPasswordAsync(request.Token, request.NewPassword, correlationId);
        if (success)
        {
            return Ok(new { message = "Password has been reset successfully. You can now sign in with your new password." });
        }

        return this.StandardBadRequest("Failed to reset password. The token may be invalid or expired.");
    }

    [HttpPost("validate-reset-token")]
    [AllowAnonymous]
    public async Task<ActionResult> ValidateResetToken([FromBody] ValidateResetTokenRequest request)
    {
        // ✅ SECURITY FIX (MEDIUM-002): Add timing resistance to prevent token enumeration
        var startTime = DateTime.UtcNow;

        if (string.IsNullOrEmpty(request.Token))
        {
            // Add consistent delay before returning error
            await Task.Delay(Random.Shared.Next(100, 300));
            return this.StandardBadRequest("Token is required.");
        }

        var isValid = await _passwordResetService.ValidateResetTokenAsync(request.Token);

        // Ensure consistent response time regardless of validity
        var elapsedMs = (DateTime.UtcNow - startTime).TotalMilliseconds;
        if (elapsedMs < 150)
        {
            await Task.Delay((int)(150 - elapsedMs)); // Minimum 150ms response time
        }

        return isValid
            ? Ok(new { message = "Token is valid.", valid = true })
            : BadRequest(new { message = "Token is invalid or expired.", valid = false });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return this.StandardBadRequest("Invalid request data.");
        }

        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
        {
            return Unauthorized(new { message = "User not authenticated." });
        }

        var correlationId = HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString();

        // Validate new password strength
        var passwordValidation = _passwordValidationService.ValidatePassword(request.NewPassword);
        if (!passwordValidation.IsValid)
        {
            return this.StandardBadRequest("New password does not meet requirements.");
        }

        var success = await _passwordResetService.ChangePasswordAsync(userGuid, request.CurrentPassword, request.NewPassword, correlationId);
        if (success)
        {
            return Ok(new { message = "Password has been changed successfully. You have been logged out of other sessions for security." });
        }

        return this.StandardBadRequest("Failed to change password. Please verify your current password is correct.");
    }

    [HttpPost("validate-password-strength")]
    [AllowAnonymous]
    public ActionResult<PasswordStrengthResult> ValidatePasswordStrength([FromBody] ValidatePasswordStrengthRequest request)
    {
        if (string.IsNullOrEmpty(request.Password))
        {
            return this.StandardBadRequest("Password is required.");
        }

        var result = _passwordValidationService.AnalyzePasswordStrength(request.Password);
        return Ok(result);
    }

    private string GetClientIpAddress()
    {
        // Handle null HttpContext in tests
        if (HttpContext?.Request?.Headers == null)
        {
            return "test-ip";
        }

        try
        {
            var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (string.IsNullOrEmpty(ipAddress))
            {
                ipAddress = HttpContext.Request.Headers["X-Real-IP"].FirstOrDefault();
            }
            if (string.IsNullOrEmpty(ipAddress))
            {
                ipAddress = HttpContext.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
            }
            return ipAddress;
        }
        catch (ArgumentException)
        {
            // Fallback for test environments where headers might cause issues
            return "test-ip";
        }
    }

    private string GetUserAgent()
    {
        // Handle null HttpContext in tests
        if (HttpContext?.Request?.Headers == null)
        {
            return "test-user-agent";
        }

        try
        {
            return HttpContext.Request.Headers["User-Agent"].FirstOrDefault() ?? "unknown";
        }
        catch (ArgumentException)
        {
            // Fallback for test environments where headers might cause issues
            return "test-user-agent";
        }
    }

    private string GetDeviceInfo()
    {
        var userAgent = GetUserAgent();
        // Simple device detection - in a real app you might use a more sophisticated library
        if (userAgent.Contains("Mobile", StringComparison.OrdinalIgnoreCase))
        {
            return "Mobile";
        }
        else if (userAgent.Contains("Tablet", StringComparison.OrdinalIgnoreCase))
        {
            return "Tablet";
        }
        else
        {
            return "Desktop";
        }
    }

    private string GetFrontendUrl()
    {
        // Always check for configured frontend URL first (works in all environments)
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            return frontendUrl;
        }

        // Handle null HttpContext in tests - use environment variable or sensible default
        if (HttpContext?.Request?.Host == null)
        {
            return Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3020";
        }

        // In development, use localhost with port from environment or default
        if (HttpContext.Request.Host.Host.Contains("localhost"))
        {
            var devPort = Environment.GetEnvironmentVariable("FRONTEND_DEV_PORT") ?? "3020";
            return $"http://localhost:{devPort}";
        }

        // Fallback to same host with https
        return $"https://{HttpContext.Request.Host}";
    }

    private string? GetCookieDomain()
    {
        // Handle null HttpContext in tests
        if (HttpContext?.Request?.Host == null)
        {
            return null; // Don't set domain in tests
        }

        // In test environment, don't set domain - prevents CookieException
        var aspNetEnv = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        if (aspNetEnv == "Testing" || aspNetEnv == "Test")
        {
            return null;
        }

        // CRITICAL: Check X-Forwarded-Host first for proxied requests
        // When Next.js proxies requests, the original host is in X-Forwarded-Host
        // Without this, cookies get set with internal container hostname (e.g., geoleap-api)
        var host = HttpContext.Request.Headers["X-Forwarded-Host"].FirstOrDefault()
                   ?? HttpContext.Request.Host.Host;

        // In development (localhost), don't set domain - cookies will be scoped to localhost
        if (host.Contains("localhost") || host == "127.0.0.1")
        {
            return null;
        }

        // In production, set domain to parent domain to share cookies across subdomains
        // e.g., api.geoleap.app -> .geoleap.app (allows geoleap.app and api.geoleap.app to share)
        var parts = host.Split('.');
        if (parts.Length >= 2)
        {
            // Get the last two parts (e.g., "geoleap.app") and prefix with dot
            var baseDomain = $".{parts[^2]}.{parts[^1]}";
            return baseDomain;
        }

        return null; // Don't set domain for single-part hosts
    }
}

public class ResendVerificationDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class ValidateResetTokenRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;
}

public class ValidatePasswordStrengthRequest
{
    [Required]
    public string Password { get; set; } = string.Empty;
}