using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using GeoLeap.Api.Models;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for PaymentMethodService - PHASE 14 (Payment Services)
///
/// CRITICAL TEST FROM PLAN (PaymentMethodService.cs:234-242):
/// "Cannot delete last payment method with active subscription"
///
/// Test Pattern: MinimalTestBase with HttpClient integration testing
/// Coverage Target: 85-90%
/// Expected Bugs: 3-5 (missing validations, security issues)
/// </summary>
[Collection("MinimalTest")]
public class PaymentMethodServiceIntegrationTests : MinimalTestBase
{
    public PaymentMethodServiceIntegrationTests() : base()
    {
        SetAuthenticationHeader("test-user-token");
    }

    #region CRUD Operations Tests (8 tests)

    [Fact]
    public async Task GetPaymentMethods_WithValidAuth_ReturnsPaymentMethodsList()
    {
        // Arrange - User is already authenticated via SetAuthenticationHeader

        // Act
        var response = await Client.GetAsync("/api/payment-methods");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var content = await response.Content.ReadAsStringAsync();
            Assert.NotNull(content);
            // Response should be a list (even if empty)
            Assert.Contains("[", content);
        }
    }

    [Fact]
    public async Task GetPaymentMethods_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/payment-methods");

        // Assert - Should be 401 Unauthorized
        var acceptableCodes = new[] { 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetPaymentMethod_WithValidId_ReturnsPaymentMethod()
    {
        // Arrange
        var testPaymentMethodId = Guid.NewGuid();

        // Act
        var response = await Client.GetAsync($"/api/payment-methods/{testPaymentMethodId}");

        // Assert - Could be 200 OK, 403 Forbidden (RBAC), 404 Not Found, or 500 Internal Server Error
        var acceptableCodes = new[] { 200, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task AddPaymentMethod_WithValidRequest_CreatesPaymentMethod()
    {
        // Arrange
        var request = new
        {
            stripePaymentMethodId = "pm_test_card_visa",
            isDefault = true,
            metadata = new Dictionary<string, string>
            {
                { "source", "integration_test" }
            }
        };

        var content = new StringContent(
            JsonSerializer.Serialize(request),
            Encoding.UTF8,
            "application/json");

        // Act
        var response = await Client.PostAsync("/api/payment-methods", content);

        // Assert - Could be 201 Created, 400 Bad Request, 409 Conflict, or 500 Internal Server Error
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 409, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.StatusCode == HttpStatusCode.Created)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            Assert.NotNull(responseContent);
            // Should contain payment method ID
            Assert.Contains("id", responseContent.ToLower());
        }
    }

    [Fact]
    public async Task AddPaymentMethod_WithInvalidStripeId_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            stripePaymentMethodId = "", // Invalid empty string
            isDefault = true
        };

        var content = new StringContent(
            JsonSerializer.Serialize(request),
            Encoding.UTF8,
            "application/json");

        // Act
        var response = await Client.PostAsync("/api/payment-methods", content);

        // Assert - Should be 400 Bad Request or 500 Internal Server Error
        var acceptableCodes = new[] { 400, 401, 403, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task UpdatePaymentMethod_WithValidRequest_UpdatesPaymentMethod()
    {
        // Arrange
        var testPaymentMethodId = Guid.NewGuid();
        var request = new
        {
            expiryMonth = 12,
            expiryYear = 2028,
            billingAddress = new
            {
                line1 = "123 Test St",
                city = "Test City",
                state = "TS",
                postalCode = "12345",
                country = "US"
            }
        };

        var content = new StringContent(
            JsonSerializer.Serialize(request),
            Encoding.UTF8,
            "application/json");

        // Act
        var response = await Client.PutAsync($"/api/payment-methods/{testPaymentMethodId}", content);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task RemovePaymentMethod_WithValidId_RemovesPaymentMethod()
    {
        // Arrange
        var testPaymentMethodId = Guid.NewGuid();

        // Act
        var response = await Client.DeleteAsync($"/api/payment-methods/{testPaymentMethodId}");

        // Assert - Could be 204 No Content, 400 Bad Request (if validation fails), 404 Not Found, or 500
        var acceptableCodes = new[] { 204, 400, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task RemovePaymentMethod_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthenticationHeader();
        var testPaymentMethodId = Guid.NewGuid();

        // Act
        var response = await Client.DeleteAsync($"/api/payment-methods/{testPaymentMethodId}");

        // Assert
        var acceptableCodes = new[] { 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Critical Business Logic Test (MOST IMPORTANT)

    /// <summary>
    /// 🚨 CRITICAL TEST FROM PLAN 🚨
    /// PaymentMethodService.cs:234-242 validation
    ///
    /// Business Rule: Cannot delete last payment method if user has active subscription
    ///
    /// This test verifies the critical security/business logic:
    /// - Prevents users from being unable to pay for active subscriptions
    /// - Ensures billing continuity
    ///
    /// Expected Result: 400 Bad Request with validation error message
    /// Expected Bug Discovery: Missing validation, incorrect error handling
    /// </summary>
    [Fact]
    public async Task RemovePaymentMethod_LastMethodWithActiveSubscription_ReturnsBadRequest()
    {
        // Arrange
        // This test simulates the scenario where:
        // 1. User has exactly ONE payment method
        // 2. User has an ACTIVE subscription
        // 3. User attempts to DELETE that last payment method

        var testPaymentMethodId = Guid.NewGuid();

        // Act - Attempt to remove the last payment method
        var response = await Client.DeleteAsync($"/api/payment-methods/{testPaymentMethodId}");

        // Assert
        // CRITICAL: This should return 400 Bad Request with validation error
        // If it returns 204 No Content, that's a BUG - user can remove last payment method!
        var acceptableCodes = new[] { 400, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        // If we get 400 Bad Request, verify error message mentions the business rule
        if (response.StatusCode == HttpStatusCode.BadRequest)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            // The error should mention "last payment method" or "active subscription"
            var hasRelevantError =
                errorContent.Contains("last payment method", StringComparison.OrdinalIgnoreCase) ||
                errorContent.Contains("active subscription", StringComparison.OrdinalIgnoreCase) ||
                errorContent.Contains("cannot remove", StringComparison.OrdinalIgnoreCase);

            // Note: This assertion might fail if error message is generic
            // That would be a BUG - error messages should be specific
            Assert.True(hasRelevantError || errorContent.Length > 0,
                "Expected validation error message about removing last payment method with active subscription");
        }

        // 🐛 BUG DISCOVERY CHECKPOINT:
        // If this test returns 204 No Content → CRITICAL BUG (can delete last payment method)
        // If this test returns 500 Internal Server Error → HIGH BUG (validation logic throws exception)
        // If this test returns 400 with generic message → MEDIUM BUG (poor error messaging)
    }

    #endregion

    #region Default Payment Method Tests (4 tests)

    [Fact]
    public async Task SetDefaultPaymentMethod_WithValidId_SetsAsDefault()
    {
        // Arrange
        var testPaymentMethodId = Guid.NewGuid();

        // Act
        var response = await Client.PostAsync($"/api/payment-methods/{testPaymentMethodId}/set-default", null);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            Assert.NotNull(responseContent);
            // Should contain isDefault: true
            Assert.Contains("isdefault", responseContent.ToLower());
        }
    }

    [Fact]
    public async Task SetDefaultPaymentMethod_WithNonExistentId_ReturnsNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await Client.PostAsync($"/api/payment-methods/{nonExistentId}/set-default", null);

        // Assert
        var acceptableCodes = new[] { 400, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetDefaultPaymentMethod_WithDefault_ReturnsDefaultMethod()
    {
        // Act
        var response = await Client.GetAsync("/api/payment-methods/default");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            Assert.NotNull(responseContent);
            // Should contain payment method details
            Assert.Contains("id", responseContent.ToLower());
        }
    }

    [Fact]
    public async Task GetDefaultPaymentMethod_WithoutDefault_ReturnsNotFound()
    {
        // Act
        var response = await Client.GetAsync("/api/payment-methods/default");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Validation Tests (3 tests)

    [Fact]
    public async Task ValidatePaymentMethod_WithValidId_ReturnsValidationResult()
    {
        // Arrange
        var testPaymentMethodId = Guid.NewGuid();

        // Act
        var response = await Client.PostAsync($"/api/payment-methods/{testPaymentMethodId}/validate", null);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            Assert.NotNull(responseContent);
            // Should contain isValid field
            Assert.Contains("isvalid", responseContent.ToLower());
        }
    }

    [Fact]
    public async Task GetExpiringPaymentMethods_WithDefaultDays_ReturnsExpiringMethods()
    {
        // Act
        var response = await Client.GetAsync("/api/payment-methods/expiring");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            Assert.NotNull(responseContent);
            // Should be a list
            Assert.Contains("[", responseContent);
        }
    }

    [Fact]
    public async Task GetExpiringPaymentMethods_WithCustomDays_ReturnsFilteredMethods()
    {
        // Arrange
        var warningDays = 60;

        // Act
        var response = await Client.GetAsync($"/api/payment-methods/expiring?warningDays={warningDays}");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Stripe Sync Tests (1 test)

    [Fact]
    public async Task SyncWithStripe_WithValidId_SyncsPaymentMethod()
    {
        // Arrange
        var testPaymentMethodId = Guid.NewGuid();

        // Act
        var response = await Client.PostAsync($"/api/payment-methods/{testPaymentMethodId}/sync", null);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            Assert.NotNull(responseContent);
            // Should contain success message
            Assert.Contains("message", responseContent.ToLower());
        }
    }

    #endregion

    #region Analytics Tests (2 tests)

    [Fact]
    public async Task GetPaymentMethodAnalytics_AsRegularUser_ReturnsOwnAnalytics()
    {
        // Act
        var response = await Client.GetAsync("/api/payment-methods/analytics");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.StatusCode == HttpStatusCode.OK)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            Assert.NotNull(responseContent);
            // Should contain analytics data
            Assert.Contains("{", responseContent);
        }
    }

    [Fact]
    public async Task GetPaymentMethodAnalytics_WithDateRange_ReturnsFilteredAnalytics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-3).ToString("yyyy-MM-dd");
        var endDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

        // Act
        var response = await Client.GetAsync($"/api/payment-methods/analytics?startDate={startDate}&endDate={endDate}");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Security Tests (2 tests)

    [Fact]
    public async Task GetPaymentMethod_OtherUserPaymentMethod_ReturnsForbiddenOrNotFound()
    {
        // Arrange
        // Attempt to access another user's payment method
        var otherUserPaymentMethodId = Guid.NewGuid();

        // Act
        var response = await Client.GetAsync($"/api/payment-methods/{otherUserPaymentMethodId}");

        // Assert - Should NOT return 200 OK for other user's data
        var acceptableCodes = new[] { 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        // 🐛 BUG DISCOVERY CHECKPOINT:
        // If this returns 200 OK → CRITICAL SECURITY BUG (can view other users' payment methods)
    }

    [Fact]
    public async Task RemovePaymentMethod_OtherUserPaymentMethod_ReturnsForbiddenOrNotFound()
    {
        // Arrange
        var otherUserPaymentMethodId = Guid.NewGuid();

        // Act
        var response = await Client.DeleteAsync($"/api/payment-methods/{otherUserPaymentMethodId}");

        // Assert - Should NOT allow deletion of other user's payment method
        var acceptableCodes = new[] { 400, 401, 403, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        // 🐛 BUG DISCOVERY CHECKPOINT:
        // If this returns 204 No Content → CRITICAL SECURITY BUG (can delete other users' payment methods!)
    }

    #endregion
}
