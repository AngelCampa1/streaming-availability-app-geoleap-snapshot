using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using System.Text;
using Newtonsoft.Json;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Simple test base template - copy-paste ready
/// Basic HTTP client setup with proper disposal patterns
/// </summary>
public abstract class SimpleTestBase : IDisposable
{
    private readonly SimpleWebApplicationFactory _factory;
    private readonly List<HttpClient> _clients = new();
    private bool _disposed = false;

    protected SimpleTestBase()
    {
        _factory = new SimpleWebApplicationFactory();
    }

    /// <summary>
    /// Creates a simple HTTP client
    /// </summary>
    protected HttpClient CreateClient()
    {
        var client = _factory.CreateClient();
        _clients.Add(client);
        return client;
    }

    /// <summary>
    /// Get database context for data setup
    /// </summary>
    protected ApplicationDbContext GetDbContext()
    {
        var scope = _factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    }

    /// <summary>
    /// Helper to serialize JSON for POST requests
    /// </summary>
    protected StringContent JsonContent(object obj)
    {
        var json = JsonConvert.SerializeObject(obj);
        return new StringContent(json, Encoding.UTF8, "application/json");
    }

    /// <summary>
    /// Helper to deserialize JSON responses
    /// </summary>
    protected async Task<T> DeserializeResponse<T>(HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<T>(content);
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            foreach (var client in _clients)
            {
                client?.Dispose();
            }
            _factory?.Dispose();
            _disposed = true;
        }
    }
}

/*
USAGE EXAMPLE:

public class YourTest : SimpleTestBase
{
    [Fact]
    public async Task Test_Example()
    {
        // Arrange
        using var client = CreateClient();
        var testData = new { Name = "Test" };

        // Act
        var response = await client.PostAsync("/api/test", JsonContent(testData));

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await DeserializeResponse<TestResponse>(response);
        Assert.Equal("Test", result.Name);
    }
}
*/