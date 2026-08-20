using System.Text.Json;

namespace GeoLeap.Api.Tests.Templates;

/// <summary>
/// Enhanced Test Data Factory for generating realistic, optimized test data
/// Provides methods for creating test data that properly exercises API endpoints
/// while ensuring JSON serialization compatibility and model binding success
/// </summary>
public static class TestDataFactory
{
    private static readonly Random _random = new();
    
    #region Authentication Test Data
    
    /// <summary>
    /// Creates optimized registration data with realistic validation-friendly values
    /// </summary>
    public static object CreateOptimizedRegistrationData(string? emailSuffix = null)
    {
        var uniqueId = Guid.NewGuid().ToString("N")[..8];
        return new
        {
            email = $"test{uniqueId}@{emailSuffix ?? "example.com"}",
            password = "SecureTestPassword123!@#",
            firstName = "Test",
            lastName = "User",
            confirmPassword = "SecureTestPassword123!@#",
            acceptTerms = true,
            metadata = new
            {
                testId = uniqueId,
                source = "TestDataFactory",
                timestamp = DateTime.UtcNow.ToString("O")
            }
        };
    }
    
    /// <summary>
    /// Creates optimized login data for authentication tests
    /// </summary>
    public static object CreateOptimizedLoginData(string? email = null, string? password = null)
    {
        return new
        {
            email = email ?? "test@example.com",
            password = password ?? "SecureTestPassword123!",
            rememberMe = false,
            deviceInfo = new
            {
                platform = "test",
                version = "1.0.0",
                deviceId = Guid.NewGuid().ToString("N")[..16]
            }
        };
    }
    
    /// <summary>
    /// Creates invalid registration data for validation testing
    /// </summary>
    public static object CreateInvalidRegistrationData()
    {
        return new
        {
            email = "not-an-email",
            password = "weak",
            firstName = "", // Empty required field
            lastName = "", // Empty required field
            acceptTerms = false // Required to be true
        };
    }
    
    #endregion
    
    #region Content Test Data
    
    /// <summary>
    /// Creates optimized content search query data
    /// </summary>
    public static object CreateOptimizedSearchQuery(string? query = null)
    {
        return new
        {
            query = query ?? "action movies",
            type = "all",
            country = "US",
            language = "en",
            page = 1,
            pageSize = 20,
            filters = new
            {
                genre = new[] { "action", "adventure" },
                releaseYear = new { min = 2020, max = 2024 },
                rating = new { min = 7.0 }
            },
            sortBy = "popularity",
            sortOrder = "desc"
        };
    }
    
    /// <summary>
    /// Creates content request data for content endpoints
    /// </summary>
    public static object CreateOptimizedContentRequest(string contentType = "movies")
    {
        return new
        {
            type = contentType,
            ids = new[] { "tt0111161", "tt0068646", "tt0071562" }, // Popular IMDb IDs
            includeDetails = true,
            includeRecommendations = false,
            country = "US",
            language = "en"
        };
    }
    
    #endregion
    
    #region Payment Test Data
    
    /// <summary>
    /// Creates optimized payment intent data for payment tests
    /// </summary>
    public static object CreateOptimizedPaymentData(decimal? amount = null)
    {
        return new
        {
            amount = (amount ?? 999) * 100, // Convert to cents
            currency = "usd",
            paymentMethodTypes = new[] { "card" },
            metadata = new
            {
                testPayment = "true",
                orderId = Guid.NewGuid().ToString("N")[..12],
                customerEmail = "test@example.com"
            },
            automaticPaymentMethods = new
            {
                enabled = true
            }
        };
    }
    
    /// <summary>
    /// Creates subscription plan change data
    /// </summary>
    public static object CreateOptimizedSubscriptionData(string? priceId = null)
    {
        return new
        {
            priceId = priceId ?? "price_test_premium_monthly",
            prorationBehavior = "create_prorations",
            metadata = new
            {
                source = "test",
                planChange = "upgrade",
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            }
        };
    }
    
    #endregion
    
    #region User Profile Test Data
    
    /// <summary>
    /// Creates optimized user profile update data
    /// </summary>
    public static object CreateOptimizedProfileData()
    {
        var uniqueId = Guid.NewGuid().ToString("N")[..6];
        return new
        {
            firstName = $"Updated{uniqueId}",
            lastName = $"User{uniqueId}",
            dateOfBirth = "1990-01-15",
            country = "US",
            language = "en",
            timezone = "America/New_York",
            preferences = new
            {
                notifications = new
                {
                    email = true,
                    push = false,
                    sms = false
                },
                privacy = new
                {
                    profileVisible = true,
                    activityVisible = false
                }
            }
        };
    }
    
    /// <summary>
    /// Creates password change data with proper validation
    /// </summary>
    public static object CreateOptimizedPasswordChangeData(string? currentPassword = null)
    {
        return new
        {
            currentPassword = currentPassword ?? "CurrentPassword123!",
            newPassword = "NewSecurePassword456!@#",
            confirmNewPassword = "NewSecurePassword456!@#"
        };
    }
    
    #endregion
    
    #region Admin Test Data
    
    /// <summary>
    /// Creates admin role assignment data
    /// </summary>
    public static object CreateOptimizedRoleAssignmentData(string? userId = null, string? role = null)
    {
        return new
        {
            userId = userId ?? Guid.NewGuid().ToString(),
            role = role ?? "moderator",
            permissions = new[] { "read", "write" },
            expiresAt = DateTime.UtcNow.AddDays(30).ToString("O"),
            reason = "Test role assignment"
        };
    }
    
    #endregion
    
    #region JSON Utilities
    
    /// <summary>
    /// Converts test data object to optimized JSON string
    /// </summary>
    public static string ToOptimizedJson(object data)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
            PropertyNameCaseInsensitive = true
        };
        
        return JsonSerializer.Serialize(data, options);
    }
    
    /// <summary>
    /// Creates optimized StringContent for HTTP requests
    /// </summary>
    public static StringContent CreateOptimizedJsonContent(object data)
    {
        var json = ToOptimizedJson(data);
        return new StringContent(json, System.Text.Encoding.UTF8, "application/json");
    }
    
    /// <summary>
    /// Creates test data with specified validation issues for negative testing
    /// </summary>
    public static object CreateInvalidData(string invalidationType)
    {
        return invalidationType.ToLower() switch
        {
            "email" => new { email = "invalid-email", password = "ValidPassword123!" },
            "password" => new { email = "valid@example.com", password = "weak" },
            "missing" => new { }, // Missing required fields
            "null" => new { email = (string?)null, password = (string?)null },
            "empty" => new { email = "", password = "" },
            "long" => new { 
                email = $"{"very".PadRight(250, 'x')}@example.com", 
                password = "Valid123!".PadRight(300, 'x') 
            },
            _ => new { error = "unknown_validation_type" }
        };
    }
    
    #endregion
    
    #region Response Validation Helpers
    
    /// <summary>
    /// Creates expected response patterns for different scenarios
    /// </summary>
    public static class ExpectedResponses
    {
        public static bool IsValidAuthResponse(string content, bool expectSuccess)
        {
            if (string.IsNullOrEmpty(content)) return false;
            
            try
            {
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;
                
                if (root.TryGetProperty("success", out var successProp))
                {
                    return successProp.GetBoolean() == expectSuccess;
                }
                
                // If no success field, check for tokens (success) or errors (failure)
                if (expectSuccess)
                {
                    return root.TryGetProperty("token", out _) || root.TryGetProperty("accessToken", out _);
                }
                else
                {
                    return root.TryGetProperty("error", out _) || root.TryGetProperty("message", out _);
                }
            }
            catch
            {
                return false;
            }
        }
        
        public static bool IsValidSearchResponse(string content)
        {
            if (string.IsNullOrEmpty(content)) return false;
            
            try
            {
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;
                
                // Check for common search response patterns
                return root.TryGetProperty("results", out _) || 
                       root.TryGetProperty("data", out _) ||
                       root.TryGetProperty("items", out _) ||
                       root.ValueKind == JsonValueKind.Array;
            }
            catch
            {
                return false;
            }
        }
    }
    
    #endregion
}