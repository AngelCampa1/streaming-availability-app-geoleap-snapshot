using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using Xunit;

namespace GeoLeap.Api.Tests.Templates;

/// <summary>
/// Simple controller test template - copy-paste ready
/// Standard HTTP patterns for controller testing
/// </summary>
public class SimpleControllerTest : SimpleTestBase
{
    [Fact]
    public async Task Get_ReturnsSuccess()
    {
        // Arrange
        using var client = CreateClient();

        // Act
        var response = await client.GetAsync("/api/controller-endpoint");

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Post_WithValidData_ReturnsCreated()
    {
        // Arrange
        using var client = CreateClient();
        var requestData = new 
        { 
            Name = "Test Item",
            Description = "Test Description" 
        };

        // Act
        var response = await client.PostAsync("/api/controller-endpoint", JsonContent(requestData));

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        
        var responseData = await DeserializeResponse<dynamic>(response);
        Assert.NotNull(responseData);
    }

    [Fact]
    public async Task Post_WithInvalidData_ReturnsBadRequest()
    {
        // Arrange
        using var client = CreateClient();
        var invalidData = new { }; // Empty object

        // Act
        var response = await client.PostAsync("/api/controller-endpoint", JsonContent(invalidData));

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Put_WithValidId_ReturnsNoContent()
    {
        // Arrange
        using var client = CreateClient();
        var updateData = new 
        { 
            Id = 1,
            Name = "Updated Item" 
        };

        // Act
        var response = await client.PutAsync("/api/controller-endpoint/1", JsonContent(updateData));

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_WithValidId_ReturnsNoContent()
    {
        // Arrange
        using var client = CreateClient();

        // Act
        var response = await client.DeleteAsync("/api/controller-endpoint/1");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Get_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        using var client = CreateClient();

        // Act
        var response = await client.GetAsync("/api/controller-endpoint/999999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}

/*
HOW TO USE THIS TEMPLATE:

1. Copy this file to your test project
2. Rename the class to match your controller (e.g., UsersControllerTest)
3. Update the API endpoints (/api/controller-endpoint to /api/users)
4. Modify the request/response objects to match your DTOs
5. Add your specific test scenarios

COMMON PATTERNS:
- GET /api/{controller} - List items
- GET /api/{controller}/{id} - Get single item
- POST /api/{controller} - Create new item
- PUT /api/{controller}/{id} - Update existing item
- DELETE /api/{controller}/{id} - Delete item
*/