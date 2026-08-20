using Microsoft.Extensions.DependencyInjection;
using System.Net.Http.Headers;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Xunit;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// UNIFIED Test Base - Single, consolidated base class for ALL integration tests
/// 
/// Replaces all previous test base classes:
/// - StableTestBase (UltraStableTestFactory)
/// - SimpleTestBase (SimpleWebApplicationFactory)  
/// - Net9TestBase (Net9WebApplicationFactory)
/// - TestOnlyTestBase (TestOnlyWebApplicationFactory)
/// - OptimizedTestBase (OptimizedWebApplicationFactory)
/// 
/// ELIMINATES: Multiple competing test base patterns causing confusion
/// PROVIDES: Single, proven, stable test base for ALL tests
/// </summary>
public abstract class UnifiedTestBase : IAsyncDisposable
{
    protected readonly UnifiedWebApplicationFactory Factory;
    protected readonly HttpClient Client;
    private bool _disposed = false;
    private readonly object _disposeLock = new object();

    protected UnifiedTestBase()
    {
        try
        {
            Console.WriteLine($"🏗️ UNIFIED BASE: Initializing UnifiedTestBase...");
            
            // Use the consolidated UnifiedWebApplicationFactory
            Factory = new UnifiedWebApplicationFactory();
            Client = Factory.CreateClient();
            
            // CRITICAL: Set universal authentication bypass
            SetAuthorizationHeader("test-user-token");
            
            Console.WriteLine($"✅ UNIFIED BASE: Factory and Client created with universal auth bypass");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ UNIFIED BASE: Initialization failed: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Creates a JWT token for testing authenticated endpoints
    /// Consolidates JWT creation patterns from multiple previous implementations
    /// </summary>
    protected string CreateTestJwtToken(Guid? userId = null, string email = "test@example.com", IEnumerable<string>? roles = null)
    {
        var testUserId = userId ?? Guid.NewGuid();
        var jwtKey = "unified-test-key-that-is-long-enough-for-hmacsha256-security-algorithm";
        var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, testUserId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(JwtRegisteredClaimNames.Sub, testUserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        
        if (roles != null)
        {
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        }
        
        var token = new JwtSecurityToken(
            issuer: "unified-test-issuer",
            audience: "unified-test-audience",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );
        
        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        Console.WriteLine($"🔐 UNIFIED BASE: Created test JWT for user {testUserId}");
        return tokenString;
    }

    /// <summary>
    /// UNIVERSAL AUTHENTICATION BYPASS - Sets authorization header with simple token
    /// Proven pattern from MinimalTestBase for 100% auth success
    /// </summary>
    protected void SetAuthorizationHeader(string token = "test-user-token")
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        Console.WriteLine($"🔐 UNIFIED BASE: Universal auth bypass set with token: {token}");
    }

    /// <summary>
    /// Sets admin authorization header for admin tests
    /// </summary>
    protected void SetAdminAuthorizationHeader()
    {
        SetAuthorizationHeader("test-admin-token");
        Console.WriteLine($"👑 UNIFIED BASE: Admin auth header set");
    }

    /// <summary>
    /// Clears authorization header for unauthenticated requests  
    /// </summary>
    protected void ClearAuthorizationHeader()
    {
        Client.DefaultRequestHeaders.Authorization = null;
        Console.WriteLine($"🔓 UNIFIED BASE: Authorization header cleared");
    }

    /// <summary>
    /// Gets a service from the test container
    /// Consolidates service resolution patterns
    /// </summary>
    protected T GetService<T>() where T : notnull
    {
        return Factory.Services.GetRequiredService<T>();
    }

    /// <summary>
    /// Creates a service scope for database operations
    /// Consolidates scoping patterns
    /// </summary>
    protected IServiceScope CreateScope()
    {
        return Factory.Services.CreateScope();
    }

    /// <summary>
    /// Performs common test setup operations
    /// Override in derived classes for specific setup needs
    /// </summary>
    protected virtual async Task SetupAsync()
    {
        // Default implementation - can be overridden
        await Task.CompletedTask;
    }

    /// <summary>
    /// Performs common test cleanup operations  
    /// Override in derived classes for specific cleanup needs
    /// </summary>
    protected virtual async Task CleanupAsync()
    {
        // Default implementation - can be overridden
        await Task.CompletedTask;
    }

    public async ValueTask DisposeAsync()
    {
        if (!_disposed)
        {
            lock (_disposeLock)
            {
                if (!_disposed)
                {
                    _disposed = true;
                }
                else
                {
                    return;
                }
            }
            
            try
            {
                Console.WriteLine($"🧹 UNIFIED BASE: Starting disposal...");
                
                // Perform test cleanup
                await CleanupAsync();
                
                // Clear authorization header
                if (Client?.DefaultRequestHeaders != null)
                {
                    Client.DefaultRequestHeaders.Authorization = null;
                }
                
                // Dispose client
                Client?.Dispose();
                
                // Wait briefly to ensure operations complete
                await Task.Delay(10);
                
                // Dispose factory
                Factory?.Dispose();
                
                Console.WriteLine($"✅ UNIFIED BASE: Disposal completed successfully");
            }
            catch (ObjectDisposedException)
            {
                Console.WriteLine($"✅ UNIFIED BASE: Already disposed");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ UNIFIED BASE: Disposal warning: {ex.Message}");
            }
        }
    }
}