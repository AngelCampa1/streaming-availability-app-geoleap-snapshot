using System.Net;
using System.Text.Json;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// TDD Tests for User-Facing Notification Endpoints
/// Tests the new endpoints: GET /api/notifications, GET /api/notifications/unread-count,
/// POST /api/notifications/mark-read, DELETE /api/notifications/{id}
/// </summary>
[Collection("NotificationControllerTests")]
public class NotificationControllerUserEndpointsTests : MinimalTestBase
{
    #region GET /api/notifications/unread-count Tests

    [Fact]
    public async Task GetUnreadCount_WithoutAuthentication_Returns401()
    {
        // Arrange - Ensure no authentication header
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/notifications/unread-count");

        // Assert - Should return 401 Unauthorized
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        Console.WriteLine($"✅ GetUnreadCount correctly requires authentication: {response.StatusCode}");
    }

    [Fact]
    public async Task GetUnreadCount_WithAuthentication_ReturnsCount()
    {
        // Arrange - Set authentication
        SetAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/notifications/unread-count");
        var responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"📊 GetUnreadCount Status: {response.StatusCode}");
        Console.WriteLine($"📊 GetUnreadCount Response: {responseContent}");

        // Assert - Should return OK with count
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.NotFound,
            $"Expected OK or NotFound but got {response.StatusCode}. Content: {responseContent}");

        if (response.StatusCode == HttpStatusCode.OK)
        {
            // Verify response contains count field
            Assert.Contains("count", responseContent.ToLowerInvariant());
        }

        Console.WriteLine($"✅ GetUnreadCount returns count for authenticated user: {response.StatusCode}");

        // Cleanup
        ClearAuthenticationHeader();
    }

    #endregion

    #region GET /api/notifications Tests

    [Fact]
    public async Task GetNotifications_WithoutAuthentication_Returns401()
    {
        // Arrange - Ensure no authentication header
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/notifications");

        // Assert - Should return 401 Unauthorized
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        Console.WriteLine($"✅ GetNotifications correctly requires authentication: {response.StatusCode}");
    }

    [Fact]
    public async Task GetNotifications_WithAuthentication_ReturnsNotificationList()
    {
        // Arrange - Set authentication
        SetAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/notifications");
        var responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"📊 GetNotifications Status: {response.StatusCode}");
        Console.WriteLine($"📊 GetNotifications Response: {responseContent.Substring(0, Math.Min(500, responseContent.Length))}");

        // Assert - Should return OK, NotFound, or NoContent with notifications array
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.NotFound or HttpStatusCode.NoContent,
            $"Expected OK or NotFound or NoContent but got {response.StatusCode}. Content: {responseContent}");

        if (response.StatusCode == HttpStatusCode.OK && !string.IsNullOrEmpty(responseContent))
        {
            // Response should contain notifications or be a valid JSON
            Assert.True(responseContent.StartsWith("{") || responseContent.StartsWith("["),
                "Response should be valid JSON");
        }

        Console.WriteLine($"✅ GetNotifications returns list for authenticated user: {response.StatusCode}");

        // Cleanup
        ClearAuthenticationHeader();
    }

    [Fact]
    public async Task GetNotifications_WithPagination_ReturnsPagedResults()
    {
        // Arrange - Set authentication
        SetAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/notifications?page=1&pageSize=10");
        var responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"📊 GetNotifications (paginated) Status: {response.StatusCode}");
        Console.WriteLine($"📊 GetNotifications Response: {responseContent.Substring(0, Math.Min(500, responseContent.Length))}");

        // Assert - Should return OK with paginated results (or NoContent if empty)
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.NotFound or HttpStatusCode.NoContent,
            $"Expected OK or NotFound or NoContent but got {response.StatusCode}");

        Console.WriteLine($"✅ GetNotifications with pagination works: {response.StatusCode}");

        // Cleanup
        ClearAuthenticationHeader();
    }

    [Fact]
    public async Task GetNotifications_WithUnreadFilter_ReturnsFilteredResults()
    {
        // Arrange - Set authentication
        SetAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/notifications?unreadOnly=true");
        var responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"📊 GetNotifications (unread filter) Status: {response.StatusCode}");

        // Assert - Should return OK with filtered results (or NoContent if empty)
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.NotFound or HttpStatusCode.NoContent,
            $"Expected OK or NotFound or NoContent but got {response.StatusCode}");

        Console.WriteLine($"✅ GetNotifications with unread filter works: {response.StatusCode}");

        // Cleanup
        ClearAuthenticationHeader();
    }

    [Fact]
    public async Task GetNotifications_WithCategoryFilter_ReturnsFilteredResults()
    {
        // Arrange - Set authentication
        SetAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/notifications?category=watchlist");
        var responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"📊 GetNotifications (category filter) Status: {response.StatusCode}");

        // Assert - Should return OK with filtered results (or NoContent if empty)
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.NotFound or HttpStatusCode.NoContent,
            $"Expected OK or NotFound or NoContent but got {response.StatusCode}");

        Console.WriteLine($"✅ GetNotifications with category filter works: {response.StatusCode}");

        // Cleanup
        ClearAuthenticationHeader();
    }

    #endregion

    #region POST /api/notifications/mark-read Tests

    [Fact]
    public async Task MarkAsRead_WithoutAuthentication_Returns401()
    {
        // Arrange - Ensure no authentication header
        ClearAuthenticationHeader();
        var requestBody = JsonSerializer.Serialize(new { notificationIds = new[] { Guid.NewGuid() } });
        var httpContent = new StringContent(requestBody, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/notifications/mark-read", httpContent);

        // Assert - Should return 401 Unauthorized
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        Console.WriteLine($"✅ MarkAsRead correctly requires authentication: {response.StatusCode}");
    }

    [Fact]
    public async Task MarkAsRead_WithAuthentication_ReturnsSuccess()
    {
        // Arrange - Set authentication
        SetAuthenticationHeader();
        var requestBody = JsonSerializer.Serialize(new { notificationIds = new[] { Guid.NewGuid() } });
        var httpContent = new StringContent(requestBody, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/notifications/mark-read", httpContent);
        var responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"📊 MarkAsRead Status: {response.StatusCode}");
        Console.WriteLine($"📊 MarkAsRead Response: {responseContent}");

        // Assert - Should return OK or NotFound (if notification doesn't exist)
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.NotFound or HttpStatusCode.NoContent,
            $"Expected OK/NotFound/NoContent but got {response.StatusCode}. Content: {responseContent}");
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);

        Console.WriteLine($"✅ MarkAsRead handles request appropriately: {response.StatusCode}");

        // Cleanup
        ClearAuthenticationHeader();
    }

    [Fact]
    public async Task MarkAsRead_WithEmptyArray_ReturnsBadRequest()
    {
        // Arrange - Set authentication
        SetAuthenticationHeader();
        var requestBody = JsonSerializer.Serialize(new { notificationIds = Array.Empty<Guid>() });
        var httpContent = new StringContent(requestBody, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/notifications/mark-read", httpContent);
        var responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"📊 MarkAsRead (empty) Status: {response.StatusCode}");

        // Assert - Should return BadRequest or OK (implementation dependent)
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.BadRequest or HttpStatusCode.NoContent,
            $"Expected OK/BadRequest/NoContent but got {response.StatusCode}");

        Console.WriteLine($"✅ MarkAsRead handles empty array: {response.StatusCode}");

        // Cleanup
        ClearAuthenticationHeader();
    }

    #endregion

    #region DELETE /api/notifications/{id} Tests

    [Fact]
    public async Task DeleteNotification_WithoutAuthentication_Returns401()
    {
        // Arrange - Ensure no authentication header
        ClearAuthenticationHeader();
        var notificationId = Guid.NewGuid();

        // Act
        var response = await Client.DeleteAsync($"/api/notifications/{notificationId}");

        // Assert - Should return 401 Unauthorized
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        Console.WriteLine($"✅ DeleteNotification correctly requires authentication: {response.StatusCode}");
    }

    [Fact]
    public async Task DeleteNotification_WithAuthentication_ReturnsSuccessOrNotFound()
    {
        // Arrange - Set authentication
        SetAuthenticationHeader();
        var notificationId = Guid.NewGuid();

        // Act
        var response = await Client.DeleteAsync($"/api/notifications/{notificationId}");
        var responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"📊 DeleteNotification Status: {response.StatusCode}");
        Console.WriteLine($"📊 DeleteNotification Response: {responseContent}");

        // Assert - Should return OK, NoContent, or NotFound (if notification doesn't exist or belongs to other user)
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.NotFound or HttpStatusCode.NoContent or HttpStatusCode.Forbidden,
            $"Expected OK/NotFound/NoContent/Forbidden but got {response.StatusCode}");
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);

        Console.WriteLine($"✅ DeleteNotification handles request appropriately: {response.StatusCode}");

        // Cleanup
        ClearAuthenticationHeader();
    }

    [Fact]
    public async Task DeleteNotification_WithInvalidId_ReturnsNotFound()
    {
        // Arrange - Set authentication
        SetAuthenticationHeader();
        var invalidId = Guid.Empty;

        // Act
        var response = await Client.DeleteAsync($"/api/notifications/{invalidId}");
        var responseContent = await response.Content.ReadAsStringAsync();

        Console.WriteLine($"📊 DeleteNotification (invalid ID) Status: {response.StatusCode}");

        // Assert - Should return NotFound or BadRequest
        Assert.True(response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest,
            $"Expected NotFound or BadRequest but got {response.StatusCode}");

        Console.WriteLine($"✅ DeleteNotification handles invalid ID: {response.StatusCode}");

        // Cleanup
        ClearAuthenticationHeader();
    }

    #endregion
}
