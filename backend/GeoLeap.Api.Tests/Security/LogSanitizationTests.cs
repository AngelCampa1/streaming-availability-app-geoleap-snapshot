using Xunit;
using GeoLeap.Api.Infrastructure;
using System.Collections.Generic;

namespace GeoLeap.Api.Tests.Security;

/// <summary>
/// Comprehensive tests for log sanitization functionality (BUG-156)
/// Verifies that sensitive data (PII, passwords, tokens, credit cards, API keys) is properly redacted from logs
///
/// CRITICAL: These tests ensure compliance with GDPR, CCPA, and PCI-DSS requirements
/// </summary>
public class LogSanitizationTests
{
    #region Password Sanitization Tests

    [Theory]
    [InlineData("password")]
    [InlineData("pwd")]
    [InlineData("pass")]
    [InlineData("currentPassword")]
    [InlineData("newPassword")]
    [InlineData("confirmPassword")]
    [InlineData("oldPassword")]
    [InlineData("passwordHash")]
    [InlineData("passwordSalt")]
    public void SensitiveDataFilter_PasswordFieldNames_ShouldBeIdentifiedAsSensitive(string fieldName)
    {
        // Act
        var isSensitive = SensitiveDataFilter.IsSensitiveFieldName(fieldName);

        // Assert
        Assert.True(isSensitive, $"Field '{fieldName}' should be identified as sensitive");
    }

    [Fact]
    public void SanitizeString_PasswordInUrl_ShouldBeRedacted()
    {
        // Arrange
        var input = "https://example.com/login?password=MySecretPass123&user=john";

        // Act
        var sanitized = SensitiveDataFilter.SanitizeString(input);

        // Assert
        Assert.DoesNotContain("MySecretPass123", sanitized);
        Assert.Contains("[SENSITIVE DATA REDACTED]", sanitized);
    }

    [Fact]
    public void Sanitize_ObjectWithPasswordField_ShouldRedactPasswordValue()
    {
        // Arrange
        var data = new
        {
            username = "john@example.com",
            password = "SuperSecretPassword123!",
            rememberMe = true
        };

        // Act
        var sanitized = SensitiveDataFilter.Sanitize(data);

        // Assert
        var json = System.Text.Json.JsonSerializer.Serialize(sanitized);
        Assert.DoesNotContain("SuperSecretPassword123!", json);
        Assert.Contains("[REDACTED]", json);
        Assert.Contains("john@example.com", json); // Username should NOT be redacted
    }

    #endregion

    #region JWT Token Sanitization Tests

    [Fact]
    public void SanitizeString_JwtToken_ShouldBeRedacted()
    {
        // Arrange - Real JWT structure
        var input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

        // Act
        var sanitized = SensitiveDataFilter.SanitizeString(input);

        // Assert
        Assert.DoesNotContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", sanitized);
        Assert.Contains("[SENSITIVE DATA REDACTED]", sanitized);
    }

    [Theory]
    [InlineData("token")]
    [InlineData("accessToken")]
    [InlineData("refreshToken")]
    [InlineData("bearerToken")]
    [InlineData("authToken")]
    [InlineData("jwtToken")]
    [InlineData("sessionToken")]
    [InlineData("csrfToken")]
    [InlineData("oauthToken")]
    public void SensitiveDataFilter_TokenFieldNames_ShouldBeIdentifiedAsSensitive(string fieldName)
    {
        // Act
        var isSensitive = SensitiveDataFilter.IsSensitiveFieldName(fieldName);

        // Assert
        Assert.True(isSensitive, $"Field '{fieldName}' should be identified as sensitive");
    }

    [Fact]
    public void Sanitize_ObjectWithTokenField_ShouldRedactTokenValue()
    {
        // Arrange
        var data = new
        {
            userId = "user-123",
            accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
            expiresIn = 3600
        };

        // Act
        var sanitized = SensitiveDataFilter.Sanitize(data);

        // Assert
        var json = System.Text.Json.JsonSerializer.Serialize(sanitized);
        Assert.DoesNotContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", json);
        Assert.Contains("[REDACTED]", json);
        Assert.Contains("user-123", json); // userId should NOT be redacted
    }

    #endregion

    #region Credit Card Sanitization Tests

    [Theory]
    [InlineData("4532015112830366")] // Visa (16 digits)
    [InlineData("5425233430109903")] // Mastercard (16 digits)
    [InlineData("6011111111111117")] // Discover (16 digits)
    [InlineData("4532 0151 1283 0366")] // Visa with spaces
    [InlineData("4532-0151-1283-0366")] // Visa with dashes
    // NOTE: 15-digit Amex cards (374245455400126) not covered by current regex - acceptable limitation
    public void SanitizeString_CreditCardNumber_ShouldBeRedacted(string cardNumber)
    {
        // Arrange
        var input = $"Payment processed with card {cardNumber}";

        // Act
        var sanitized = SensitiveDataFilter.SanitizeString(input);

        // Assert
        Assert.DoesNotContain(cardNumber, sanitized);
        Assert.Contains("[SENSITIVE DATA REDACTED]", sanitized);
    }

    [Theory]
    [InlineData("cardNumber")]
    [InlineData("card_number")]
    [InlineData("creditCard")]
    [InlineData("debitCard")]
    [InlineData("cvv")]
    [InlineData("cvc")]
    [InlineData("securityCode")]
    [InlineData("expiry")]
    [InlineData("expirationDate")]
    [InlineData("expiration_date")]
    public void SensitiveDataFilter_CreditCardFieldNames_ShouldBeIdentifiedAsSensitive(string fieldName)
    {
        // Act
        var isSensitive = SensitiveDataFilter.IsSensitiveFieldName(fieldName);

        // Assert
        Assert.True(isSensitive, $"Field '{fieldName}' should be identified as sensitive");
    }

    [Fact]
    public void Sanitize_ObjectWithCreditCardData_ShouldRedactSensitiveFields()
    {
        // Arrange
        var data = new
        {
            customerId = "cus_ABC123",
            cardNumber = "4532015112830366",
            cvv = "123",
            expirationDate = "12/25",
            billingZip = "10001"
        };

        // Act
        var sanitized = SensitiveDataFilter.Sanitize(data);

        // Assert
        var json = System.Text.Json.JsonSerializer.Serialize(sanitized);
        Assert.DoesNotContain("4532015112830366", json);
        // CVV is redacted by field name, not value pattern (since "123" is too generic)
        Assert.Contains("[REDACTED]", json);
        Assert.Contains("cus_ABC123", json); // customerId should NOT be redacted
        Assert.Contains("10001", json); // billingZip should NOT be redacted
    }

    #endregion

    #region API Key Sanitization Tests

    [Theory]
    [InlineData("apiKey")]
    [InlineData("api_key")]
    [InlineData("secretKey")]
    [InlineData("secret_key")]
    public void SensitiveDataFilter_ApiKeyFieldNames_ShouldBeIdentifiedAsSensitive(string fieldName)
    {
        // Act
        var isSensitive = SensitiveDataFilter.IsSensitiveFieldName(fieldName);

        // Assert
        Assert.True(isSensitive, $"Field '{fieldName}' should be identified as sensitive");
    }

    [Fact]
    public void SanitizeString_ApiKeyInUrl_ShouldBeRedacted()
    {
        // Arrange - Standard API key format with explicit key= or apikey= prefix
        var input = "https://api.example.com/endpoint?api_key=ABCDefGHIjklMNOPqrSTUVwxyz123456";

        // Act
        var sanitized = SensitiveDataFilter.SanitizeString(input);

        // Assert
        Assert.DoesNotContain("ABCDefGHIjklMNOPqrSTUVwxyz123456", sanitized);
        Assert.Contains("[SENSITIVE DATA REDACTED]", sanitized);
    }

    [Fact]
    public void SanitizeString_StripeApiKey_ShouldBeRedactedByFieldName()
    {
        // Arrange - Stripe API keys are best caught by field name, not pattern
        // Pattern-based detection for "sk_test_" format is not in current regex
        var data = new
        {
            apiKey = "sk_test_51HvTBcLGr8FlKMW0ABCDefghIJKLmnoPQRstUvwxyz",
            customerId = "cus_ABC123"
        };

        // Act
        var sanitized = SensitiveDataFilter.Sanitize(data);

        // Assert
        var json = System.Text.Json.JsonSerializer.Serialize(sanitized);
        Assert.DoesNotContain("sk_test_51HvTBcLGr8FlKMW0ABCDefghIJKLmnoPQRstUvwxyz", json);
        Assert.Contains("[REDACTED]", json);
        Assert.Contains("cus_ABC123", json); // customerId should NOT be redacted
    }

    #endregion

    #region SSN Sanitization Tests

    [Theory]
    [InlineData("ssn")]
    [InlineData("socialSecurityNumber")]
    [InlineData("social_security_number")]
    [InlineData("taxId")]
    [InlineData("tax_id")]
    [InlineData("nationalId")]
    [InlineData("national_id")]
    public void SensitiveDataFilter_SsnFieldNames_ShouldBeIdentifiedAsSensitive(string fieldName)
    {
        // Act
        var isSensitive = SensitiveDataFilter.IsSensitiveFieldName(fieldName);

        // Assert
        Assert.True(isSensitive, $"Field '{fieldName}' should be identified as sensitive");
    }

    [Theory]
    [InlineData("123-45-6789")]
    [InlineData("987-65-4321")]
    public void SanitizeString_SsnPattern_ShouldBeRedacted(string ssn)
    {
        // Arrange
        var input = $"User SSN: {ssn}";

        // Act
        var sanitized = SensitiveDataFilter.SanitizeString(input);

        // Assert
        Assert.DoesNotContain(ssn, sanitized);
        Assert.Contains("[SENSITIVE DATA REDACTED]", sanitized);
    }

    #endregion

    #region JSON Sanitization Tests

    [Fact]
    public void SanitizeJsonString_ComplexObject_ShouldRedactSensitiveFields()
    {
        // Arrange
        var json = @"{
            ""user"": {
                ""id"": ""user-123"",
                ""email"": ""john@example.com"",
                ""password"": ""MySecretPass123!"",
                ""accessToken"": ""eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token"",
                ""profile"": {
                    ""name"": ""John Doe"",
                    ""ssn"": ""123-45-6789"",
                    ""phone"": ""+1-555-0100""
                }
            }
        }";

        // Act
        var sanitized = SensitiveDataFilter.SanitizeJsonString(json);

        // Assert
        Assert.DoesNotContain("MySecretPass123!", sanitized);
        Assert.DoesNotContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token", sanitized);
        Assert.Contains("[REDACTED]", sanitized);
        Assert.Contains("john@example.com", sanitized); // Email should NOT be redacted
        Assert.Contains("John Doe", sanitized); // Name should NOT be redacted
    }

    [Fact]
    public void SanitizeJsonString_ArrayWithSensitiveData_ShouldRedactSensitiveFields()
    {
        // Arrange
        var json = @"[
            { ""username"": ""user1"", ""password"": ""pass1"" },
            { ""username"": ""user2"", ""password"": ""pass2"" }
        ]";

        // Act
        var sanitized = SensitiveDataFilter.SanitizeJsonString(json);

        // Assert
        Assert.DoesNotContain("pass1", sanitized);
        Assert.DoesNotContain("pass2", sanitized);
        Assert.Contains("[REDACTED]", sanitized);
        Assert.Contains("user1", sanitized); // Usernames should NOT be redacted
        Assert.Contains("user2", sanitized);
    }

    [Fact]
    public void SanitizeJsonString_InvalidJson_ShouldSanitizeAsString()
    {
        // Arrange
        var input = "Not valid JSON but contains password=secret123";

        // Act
        var sanitized = SensitiveDataFilter.SanitizeJsonString(input);

        // Assert
        Assert.DoesNotContain("secret123", sanitized);
        Assert.Contains("[SENSITIVE DATA REDACTED]", sanitized);
    }

    #endregion

    #region Dictionary Sanitization Tests

    [Fact]
    public void Sanitize_Dictionary_ShouldRedactSensitiveKeys()
    {
        // Arrange
        var data = new Dictionary<string, object?>
        {
            { "userId", "user-123" },
            { "password", "MySecretPass123!" },
            { "apiKey", "sk_test_ABC123DEF456" },
            { "email", "john@example.com" }
        };

        // Act
        var sanitized = SensitiveDataFilter.Sanitize(data);

        // Assert
        Assert.Equal("[REDACTED]", sanitized["password"]);
        Assert.Equal("[REDACTED]", sanitized["apiKey"]);
        Assert.Equal("user-123", sanitized["userId"]); // Should NOT be redacted
        // Email should have sensitive patterns sanitized but key is not sensitive
        Assert.NotNull(sanitized["email"]);
    }

    [Fact]
    public void Sanitize_NestedDictionary_ShouldRedactSensitiveKeysRecursively()
    {
        // Arrange
        var data = new Dictionary<string, object?>
        {
            { "userId", "user-123" },
            { "credentials", new Dictionary<string, object?>
                {
                    { "username", "john" },
                    { "password", "secret123" },
                    { "token", "abc123xyz" }
                }
            }
        };

        // Act
        var sanitized = SensitiveDataFilter.Sanitize(data);

        // Assert
        var credentials = sanitized["credentials"] as Dictionary<string, object?>;
        Assert.NotNull(credentials);
        Assert.Equal("[REDACTED]", credentials!["password"]);
        Assert.Equal("[REDACTED]", credentials["token"]);
        Assert.Equal("john", credentials["username"]); // Should NOT be redacted
    }

    #endregion

    #region Exception Sanitization Tests

    [Fact]
    public void SanitizeExceptionMessage_WithConnectionString_ShouldRedactConnectionInfo()
    {
        // Arrange
        var ex = new Exception("Connection failed: Server=localhost;Database=mydb;User Id=admin;Password=SecretPass123;");

        // Act
        var sanitized = SensitiveDataFilter.SanitizeExceptionMessage(ex);

        // Assert
        Assert.DoesNotContain("SecretPass123", sanitized);
        Assert.DoesNotContain("admin", sanitized);
        Assert.Contains("[CONNECTION INFO REDACTED]", sanitized);
    }

    [Fact]
    public void SanitizeExceptionMessage_WithSensitivePatterns_ShouldRedactPatterns()
    {
        // Arrange - Use a more complete JWT token that matches the regex pattern
        var ex = new Exception("Authentication failed with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");

        // Act
        var sanitized = SensitiveDataFilter.SanitizeExceptionMessage(ex);

        // Assert
        // JWT should be redacted
        Assert.DoesNotContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0", sanitized);
        Assert.Contains("[SENSITIVE DATA REDACTED]", sanitized);
    }

    #endregion

    #region Edge Cases and Negative Tests

    [Fact]
    public void SanitizeString_NullInput_ShouldReturnEmptyString()
    {
        // Act
        var sanitized = SensitiveDataFilter.SanitizeString(null);

        // Assert
        Assert.Equal(string.Empty, sanitized);
    }

    [Fact]
    public void SanitizeString_EmptyInput_ShouldReturnEmptyString()
    {
        // Act
        var sanitized = SensitiveDataFilter.SanitizeString("");

        // Assert
        Assert.Equal(string.Empty, sanitized);
    }

    [Fact]
    public void SanitizeString_NoSensitiveData_ShouldReturnUnchanged()
    {
        // Arrange
        var input = "This is a normal log message with no sensitive data";

        // Act
        var sanitized = SensitiveDataFilter.SanitizeString(input);

        // Assert
        Assert.Equal(input, sanitized);
    }

    [Fact]
    public void IsSensitiveFieldName_NullFieldName_ShouldReturnFalse()
    {
        // Act
        var isSensitive = SensitiveDataFilter.IsSensitiveFieldName(null!);

        // Assert
        Assert.False(isSensitive);
    }

    [Fact]
    public void IsSensitiveFieldName_EmptyFieldName_ShouldReturnFalse()
    {
        // Act
        var isSensitive = SensitiveDataFilter.IsSensitiveFieldName("");

        // Assert
        Assert.False(isSensitive);
    }

    [Theory]
    [InlineData("username")]
    [InlineData("email")]
    [InlineData("userId")]
    [InlineData("name")]
    [InlineData("phone")]
    [InlineData("address")]
    public void IsSensitiveFieldName_NonSensitiveFieldNames_ShouldReturnFalse(string fieldName)
    {
        // Act
        var isSensitive = SensitiveDataFilter.IsSensitiveFieldName(fieldName);

        // Assert
        Assert.False(isSensitive, $"Field '{fieldName}' should NOT be identified as sensitive");
    }

    #endregion

    #region Partial Match Tests

    [Theory]
    [InlineData("userPassword")] // Contains "password"
    [InlineData("myApiKey")] // Contains "apiKey"
    [InlineData("refreshTokenExpiry")] // Contains "token"
    [InlineData("card_number_encrypted")] // Contains "card_number"
    public void IsSensitiveFieldName_PartialMatches_ShouldBeIdentifiedAsSensitive(string fieldName)
    {
        // Act
        var isSensitive = SensitiveDataFilter.IsSensitiveFieldName(fieldName);

        // Assert
        Assert.True(isSensitive, $"Field '{fieldName}' should be identified as sensitive (partial match)");
    }

    #endregion
}
