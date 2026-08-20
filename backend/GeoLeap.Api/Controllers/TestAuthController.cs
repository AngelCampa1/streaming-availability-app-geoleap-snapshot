using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.ValidationServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Minimal authentication controller for testing with no external dependencies
/// </summary>
[ApiController]
[Route("api/simpleauth")]
public class TestAuthController : ControllerBase
{
    private readonly ILogger<TestAuthController> _logger;
    private readonly IBusinessRuleValidationService _validationService;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _env;

    // FIXED: Round 16 - Read JWT settings from configuration instead of hardcoding
    private readonly string _jwtSecret;
    private readonly string _jwtIssuer;
    private readonly string _jwtAudience;
    
    // In-memory user storage for testing (thread-safe for concurrent requests)
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (string Password, UserInfoDto User)> _testUsers = new();

    public TestAuthController(
        ILogger<TestAuthController> logger,
        IBusinessRuleValidationService validationService,
        IConfiguration configuration,
        IWebHostEnvironment env)
    {
        _logger = logger;
        _validationService = validationService;
        _configuration = configuration;
        _env = env;

        // FIXED: Round 16 - Initialize JWT settings from configuration with secure fallback
        // SECURITY FIX: Fail fast if JWT secret not configured in non-test environments
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        _jwtSecret = _configuration["Jwt:Secret"] ?? string.Empty;

        if (string.IsNullOrEmpty(_jwtSecret))
        {
            if (environment == "Test" || environment == "Development")
            {
                _jwtSecret = "test-secret-key-that-is-long-enough-for-jwt-validation-12345678901234567890";
                _logger.LogWarning("TestAuthController is using default JWT secret. This should only happen in test environments.");
            }
            else
            {
                throw new InvalidOperationException("JWT:Secret must be configured in appsettings.json or User Secrets for non-test environments. This is a security requirement.");
            }
        }

        _jwtIssuer = _configuration["Jwt:Issuer"] ?? "GeoLeap.Test";
        _jwtAudience = _configuration["Jwt:Audience"] ?? "GeoLeap.Test.Client";
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
    {
        if (!_env.IsDevelopment())
            return Task.FromResult<ActionResult<AuthResponseDto>>(NotFound());

        try
        {
            _logger.LogInformation("Test Registration attempt for email: {Email}", registerDto.Email);

            // Validate using business rules
            var validation = _validationService.ValidateRegistration(registerDto);
            _logger.LogInformation("Validation result: IsValid={IsValid}, ErrorCount={ErrorCount}, Errors={Errors}", 
                validation.IsValid, validation.Errors.Count, string.Join(", ", validation.Errors));
            
            if (!validation.IsValid)
            {
                _logger.LogInformation("Returning BadRequest due to validation errors");
                return Task.FromResult<ActionResult<AuthResponseDto>>(BadRequest(new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid registration data.",
                    Errors = validation.Errors
                }));
            }

            // Also check model state for additional validations
            if (!ModelState.IsValid)
            {
                return Task.FromResult<ActionResult<AuthResponseDto>>(BadRequest(new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid registration data.",
                    Errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList()
                }));
            }

            // Check if user already exists
            if (_testUsers.ContainsKey(registerDto.Email))
            {
                return Task.FromResult<ActionResult<AuthResponseDto>>(BadRequest(new AuthResponseDto
                {
                    Success = false,
                    Message = "An account with this email already exists.",
                    Errors = new List<string> { "Email already in use" }
                }));
            }

            // Create new test user
            var userId = Guid.NewGuid();
            var user = new UserInfoDto
            {
                Id = userId,
                Email = registerDto.Email,
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow,
                Roles = new List<string> { "User" }
            };

            // Store user in memory
            _testUsers[registerDto.Email] = (registerDto.Password, user);

            // Generate JWT token
            var token = GenerateJwtToken(user);

            _logger.LogInformation("Test Registration successful for user: {UserId}", userId);

            return Task.FromResult<ActionResult<AuthResponseDto>>(Ok(new AuthResponseDto
            {
                Success = true,
                Message = "Registration successful.",
                AccessToken = token,
                Token = token, // For backward compatibility
                User = user
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during test registration for {Email}", registerDto.Email);
            return Task.FromResult<ActionResult<AuthResponseDto>>(StatusCode(500, new AuthResponseDto
            {
                Success = false,
                Message = "An error occurred during registration.",
                Errors = new List<string> { "Internal server error" }
            }));
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        if (!_env.IsDevelopment())
            return Task.FromResult<ActionResult<AuthResponseDto>>(NotFound());

        try
        {
            _logger.LogInformation("Test Login attempt for email: {Email}", loginDto.Email);

            // Validate using business rules
            var validation = _validationService.ValidateLogin(loginDto);
            if (!validation.IsValid)
            {
                return Task.FromResult<ActionResult<AuthResponseDto>>(BadRequest(new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid login data.",
                    Errors = validation.Errors
                }));
            }

            // Also check model state for additional validations
            if (!ModelState.IsValid)
            {
                return Task.FromResult<ActionResult<AuthResponseDto>>(BadRequest(new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid login data.",
                    Errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList()
                }));
            }

            // Check if user exists
            if (!_testUsers.TryGetValue(loginDto.Email, out var userData))
            {
                _logger.LogWarning("Test Login failed for {Email}: User not found", loginDto.Email);
                return Task.FromResult<ActionResult<AuthResponseDto>>(Unauthorized(new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid email or password.",
                    Errors = new List<string> { "Authentication failed" }
                }));
            }

            // Check password
            if (userData.Password != loginDto.Password)
            {
                _logger.LogWarning("Test Login failed for {Email}: Invalid password", loginDto.Email);
                return Task.FromResult<ActionResult<AuthResponseDto>>(Unauthorized(new AuthResponseDto
                {
                    Success = false,
                    Message = "Invalid email or password.",
                    Errors = new List<string> { "Authentication failed" }
                }));
            }

            // Generate JWT token
            var token = GenerateJwtToken(userData.User);

            _logger.LogInformation("Test Login successful for user: {UserId}", userData.User.Id);

            return Task.FromResult<ActionResult<AuthResponseDto>>(Ok(new AuthResponseDto
            {
                Success = true,
                Message = "Login successful.",
                AccessToken = token,
                Token = token, // For backward compatibility
                User = userData.User
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during test login for {Email}", loginDto.Email);
            return Task.FromResult<ActionResult<AuthResponseDto>>(StatusCode(500, new AuthResponseDto
            {
                Success = false,
                Message = "An error occurred during login.",
                Errors = new List<string> { "Internal server error" }
            }));
        }
    }

    [HttpGet("protected")]
    [Authorize]
    public IActionResult ProtectedEndpoint()
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Ok(new { message = "Access granted", userId });
    }

    private string GenerateJwtToken(UserInfoDto user)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSecret);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Email, user.Email),
                new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
                new("sub", user.Id.ToString()),
                new("email", user.Email),
                new("given_name", user.FirstName),
                new("family_name", user.LastName),
                new("jti", Guid.NewGuid().ToString()),
                new("iat", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
            };

            // Add role claims
            foreach (var role in user.Roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(15),
                Issuer = _jwtIssuer,
                Audience = _jwtAudience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);
            
            _logger.LogDebug("Generated test JWT token for user {UserId}", user.Id);
            return tokenString;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating test JWT token for user {UserId}", user.Id);
            throw;
        }
    }
}